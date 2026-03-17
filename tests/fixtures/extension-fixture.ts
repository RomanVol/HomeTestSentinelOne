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
import { ExtensionManagementPage } from '../page-objects/extension-management-page';
import { PromptExtensionPopupPage } from '../page-objects/prompt-extension-popup-page';
import { GenAiApplicationPage } from '../page-objects/genai-application-page';
import { PolicyEvaluator } from '../services/policy-evaluator';
import { ExtensionLogFileService } from '../services/extension-log-file-service';
import { NetworkPolicyObserver } from '../services/network-policy-observer';

type HomeTestFixtures = {
  logger: StepLogger;
  runtimeConfig: RuntimeConfig;
  browserSession: BrowserSession;
  context: BrowserContext;
  page: Page;
  extensionManagementPage: ExtensionManagementPage | null;
  extensionPopupPage: PromptExtensionPopupPage | null;
  applicationPage: GenAiApplicationPage;
  policyEvaluator: PolicyEvaluator;
  extensionLogFileService: ExtensionLogFileService;
  networkPolicyObserver: NetworkPolicyObserver;
  failureLogDiagnostics: void;
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
    extensionSource: runtimeConfig.extensionSource,
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
async function resolveExtensionId(
  context: BrowserContext,
  runtimeConfig: RuntimeConfig,
  logger: StepLogger
): Promise<string | null> {
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
    const extensionId = extensionSupported ? await resolveExtensionId(context, runtimeConfig, logger) : null;
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
   * Creates the Chrome extension-details page object when the extension is actually loaded.
   */
  extensionManagementPage: async ({ context, browserSession, logger }, use) => {
    if (!browserSession.extensionLoaded || !browserSession.extensionId) {
      await use(null);
      return;
    }

    const managementPage = new ExtensionManagementPage(
      context,
      browserSession.extensionId,
      logger
    );

    await use(managementPage);
    await managementPage.close();
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
    await use(new GenAiApplicationPage(page, runtimeConfig, logger));
  },

  /**
   * Creates the policy evaluator service used by the specs.
   */
  policyEvaluator: async ({ runtimeConfig, logger }, use) => {
    await use(new PolicyEvaluator(runtimeConfig, logger));
  },

  /**
   * Creates the service that manages the downloaded extension log file on disk.
   */
  extensionLogFileService: async ({ runtimeConfig, logger }, use) => {
    const service = new ExtensionLogFileService(runtimeConfig, logger);
    await service.ensurePersistedLogDirectory();
    await use(service);
  },

  /**
   * Creates the network observer used by tests that validate request-level behavior.
   */
  networkPolicyObserver: async ({ page, runtimeConfig, logger }, use) => {
    await use(new NetworkPolicyObserver(page, runtimeConfig, logger));
  },

  /**
   * Automatically exports extension logs for failed tests and prints the matching error lines.
   */
  failureLogDiagnostics: [async ({
    runtimeConfig,
    browserSession,
    extensionPopupPage,
    extensionLogFileService,
    logger
  }, use, testInfo) => {
    await use();

    const testFailed = testInfo.status !== testInfo.expectedStatus;

    if (!testFailed) {
      return;
    }

    if (!browserSession.extensionLoaded || !extensionPopupPage) {
      logger.warn('Skipping failure log diagnostics because the extension popup is unavailable');
      return;
    }

    try {
      logger.info('Collecting extension logs because the test failed', {
        testTitle: testInfo.title
      });

      await extensionPopupPage.open();
      const logContents = await extensionPopupPage.readDebugLogsFromStorage();

      const persistedLogPath = await extensionLogFileService.persistLogContents(
        logContents,
        `${testInfo.project.name}-${testInfo.title}-extension-debug-log`
      );

      const relevantErrorLines = extensionLogFileService.extractRelevantErrorLines(logContents);
      const diagnosticLines = relevantErrorLines.length > 0
        ? relevantErrorLines
        : extensionLogFileService.extractTailLines(logContents);

      await testInfo.attach('extension-debug-log', {
        body: logContents,
        contentType: 'text/plain'
      });

      await testInfo.attach('persisted-extension-debug-log', {
        path: persistedLogPath,
        contentType: 'text/plain'
      });

      if (diagnosticLines.length > 0) {
        const renderedErrorLines = diagnosticLines.join('\n');

        await testInfo.attach('extension-debug-log-errors', {
          body: renderedErrorLines,
          contentType: 'text/plain'
        });

        logger.error('Relevant extension diagnostic lines extracted for the failed test', {
          matchingLines: diagnosticLines
        });

        console.log('\n[Extension Failure Logs]');
        console.log(`[Persisted File: ${persistedLogPath}]`);
        console.log(renderedErrorLines);
      } else {
        logger.warn('The persisted extension logs did not contain any diagnostic lines', {
          patterns: runtimeConfig.failureLogPatterns
        });
      }
    } catch (error) {
      logger.error('Automatic failure log diagnostics failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, { auto: true }]
});

export const expect = test.expect;
