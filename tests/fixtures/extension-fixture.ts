import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  test as base,
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type BrowserType,
  type Page
} from '@playwright/test';
import { loadRuntimeConfig, supportsExtensionAutomation, getBrowserFlavor } from '../../src/config/runtime-config';
import { StepLogger } from '../../src/core/logger';
import type {
  BrowserSession,
  HomeTestProjectName,
  RuntimeConfig
} from '../../src/models/access-policy';
import { PromptExtensionPopupPage } from '../page-objects/prompt-extension-popup-page';
import { GenAiApplicationPage } from '../page-objects/genai-application-page';
import { PolicyEvaluator } from '../services/policy-evaluator';

type HomeTestFixtures = {
  logger: StepLogger;
  runtimeConfig: RuntimeConfig;
  browserSession: BrowserSession;
  context: BrowserContext;
  page: Page;
  extensionPopupPage: PromptExtensionPopupPage | null;
  applicationPage: GenAiApplicationPage;
  policyEvaluator: PolicyEvaluator;
};

/**
 * Resolves the relevant Playwright browser type for a given project.
 */
function resolveBrowserType(projectName: HomeTestProjectName): BrowserType {
  if (projectName === 'firefox-extension') {
    return firefox;
  }

  if (projectName === 'safari-extension') {
    return webkit;
  }

  return chromium;
}

/**
 * Resolves the channel that should be used for a given project when applicable.
 */
function resolveBrowserChannel(projectName: HomeTestProjectName, runtimeConfig: RuntimeConfig): string | undefined {
  if (projectName === 'edge-extension') {
    return runtimeConfig.edgeChannel;
  }

  if (projectName === 'chrome-extension') {
    return runtimeConfig.chromeChannel;
  }

  return undefined;
}

/**
 * Creates a temporary user-data directory for persistent Chromium extension sessions.
 */
async function createTemporaryUserDataDir(projectName: HomeTestProjectName): Promise<string> {
  const safeProjectName = projectName.replace(/[^a-z0-9-]/gi, '-');
  return fs.mkdtemp(path.join(os.tmpdir(), `pw-${safeProjectName}-`));
}

/**
 * Launches a context with the configured unpacked extension when the project supports it.
 */
async function launchExtensionContext(
  projectName: HomeTestProjectName,
  runtimeConfig: RuntimeConfig,
  logger: StepLogger
): Promise<{ context: BrowserContext; cleanupUserDataDir: string | null; extensionLoaded: boolean }> {
  const userDataDir = await createTemporaryUserDataDir(projectName);
  const channel = resolveBrowserChannel(projectName, runtimeConfig);

  logger.info('Launching persistent context with extension', {
    projectName,
    channel,
    extensionPath: runtimeConfig.extensionPath
  });

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel,
    headless: Boolean(process.env.CI),
    args: [
      `--disable-extensions-except=${runtimeConfig.extensionPath}`,
      `--load-extension=${runtimeConfig.extensionPath}`
    ]
  });

  return {
    context,
    cleanupUserDataDir: userDataDir,
    extensionLoaded: true
  };
}

/**
 * Launches a standard browser context without extension automation support.
 */
async function launchStandardContext(projectName: HomeTestProjectName, logger: StepLogger): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const browserType = resolveBrowserType(projectName);
  logger.warn('Launching standard browser context without extension support', { projectName });
  const browser = await browserType.launch({ headless: Boolean(process.env.CI) });
  const context = await browser.newContext();
  return { browser, context };
}

/**
 * Resolves the extension id from the extension service worker if one is loaded.
 */
async function resolveExtensionId(context: BrowserContext, logger: StepLogger): Promise<string | null> {
  const serviceWorker =
    context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker', { timeout: 10_000 }).catch(() => null));

  if (!serviceWorker) {
    logger.warn('No extension service worker was observed while resolving the extension id');
    return null;
  }

  const workerUrl = serviceWorker.url();
  const extensionId = workerUrl.split('/')[2] || null;
  logger.info('Resolved extension id from service worker', { workerUrl, extensionId });
  return extensionId;
}

export const test = base.extend<HomeTestFixtures>({
  /**
   * Exposes a test-scoped logger instance.
   */
  logger: async ({}, use, testInfo) => {
    await use(new StepLogger(testInfo.project.name));
  },

  /**
   * Exposes the runtime configuration to all fixtures and specs.
   */
  runtimeConfig: async ({}, use) => {
    await use(loadRuntimeConfig());
  },

  /**
   * Creates the browser context that the test will use and tracks extension capability state.
   */
  context: async ({ runtimeConfig, logger }, use, testInfo) => {
    const projectName = testInfo.project.name as HomeTestProjectName;
    const canAutomateExtension = supportsExtensionAutomation(projectName, runtimeConfig);

    let context: BrowserContext;
    let browser: Browser | null = null;
    let cleanupUserDataDir: string | null = null;

    if (canAutomateExtension && runtimeConfig.extensionMode === 'unpacked') {
      const launchResult = await launchExtensionContext(projectName, runtimeConfig, logger);
      context = launchResult.context;
      cleanupUserDataDir = launchResult.cleanupUserDataDir;
    } else {
      const launchResult = await launchStandardContext(projectName, logger);
      browser = launchResult.browser;
      context = launchResult.context;
    }

    await use(context);

    await context.close();

    if (browser) {
      await browser.close();
    }

    if (cleanupUserDataDir) {
      await fs.rm(cleanupUserDataDir, { recursive: true, force: true });
    }
  },

  /**
   * Exposes the browser-session metadata that the tests use for skip logic and assertions.
   */
  browserSession: async ({ context, runtimeConfig, logger }, use, testInfo) => {
    const projectName = testInfo.project.name as HomeTestProjectName;
    const extensionSupported = supportsExtensionAutomation(projectName, runtimeConfig);
    const extensionId = extensionSupported ? await resolveExtensionId(context, logger) : null;
    const extensionLoaded = Boolean(extensionSupported && extensionId);
    const browserFlavor = getBrowserFlavor(projectName);

    await use({
      browserFlavor,
      extensionSupported,
      extensionLoaded,
      extensionId,
      extensionSkipReason: extensionSupported
        ? extensionLoaded
          ? null
          : 'The extension artifact was configured, but the extension service worker was not detected.'
        : 'The selected browser cannot automate the configured extension artifact.'
    });
  },

  /**
   * Creates the main application page used by the tests.
   */
  page: async ({ context, logger }, use) => {
    logger.info('Creating a fresh browser page for the test');
    const page = await context.newPage();
    await use(page);
    await page.close();
  },

  /**
   * Creates the extension popup page object when the extension is actually loaded.
   */
  extensionPopupPage: async ({ context, browserSession, runtimeConfig, logger }, use) => {
    if (!browserSession.extensionLoaded || !browserSession.extensionId) {
      await use(null);
      return;
    }

    const popupPage = new PromptExtensionPopupPage(
      context,
      browserSession.extensionId,
      runtimeConfig,
      logger
    );

    await use(popupPage);
    await popupPage.close();
  },

  /**
   * Creates the application page object wrapper used by the specs.
   */
  applicationPage: async ({ page, runtimeConfig, logger }, use) => {
    await use(new GenAiApplicationPage(page, runtimeConfig.navigationTimeoutMs, logger));
  },

  /**
   * Creates the policy evaluator service used by the specs.
   */
  policyEvaluator: async ({ runtimeConfig, logger }, use) => {
    await use(new PolicyEvaluator(runtimeConfig, logger));
  }
});

export const expect = test.expect;
