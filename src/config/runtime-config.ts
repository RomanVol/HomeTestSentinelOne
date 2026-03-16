import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { PlaywrightTestConfig, Project } from '@playwright/test';
import type { BrowserFlavor, ExtensionSource, HomeTestProjectName, RuntimeConfig } from '../models/access-policy';

const defaultChromeInstalledExtensionPath =
  '/Users/roma/Library/Application Support/Google/Chrome/Default/Extensions/iidnankcocecmgpcafggbgbmkbcldmno/7.0.40_0';
const defaultProjectLocalExtensionPath = path.join(process.cwd(), 'Prompt-Security-Browser-Extension');

/**
 * Reads a string environment variable and falls back to a default value when missing.
 */
function readString(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

/**
 * Reads a numeric environment variable and falls back to a default value when invalid.
 */
function readNumber(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  const numericValue = rawValue ? Number(rawValue) : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

/**
 * Reads a boolean environment variable and falls back to a default value when missing.
 */
function readBoolean(name: string, fallback: boolean): boolean {
  const rawValue = process.env[name]?.trim().toLowerCase();

  if (!rawValue) {
    return fallback;
  }

  return rawValue === '1' || rawValue === 'true' || rawValue === 'yes' || rawValue === 'on';
}

/**
 * Parses a comma-separated list environment variable into trimmed non-empty values.
 */
function readList(name: string, fallback: string[]): string[] {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Normalizes the configured unpacked-extension source preset.
 */
function normalizeExtensionSource(rawValue: string): ExtensionSource {
  const normalized = rawValue.trim().toLowerCase();

  if (normalized === 'chrome-installed' || normalized === 'chrome' || normalized === 'installed') {
    return 'chrome-installed';
  }

  if (normalized === 'custom') {
    return 'custom';
  }

  return 'project-local';
}

/**
 * Resolves the effective unpacked extension path from the chosen source preset.
 */
function resolveExtensionPath(
  extensionSource: ExtensionSource,
  projectLocalExtensionPath: string,
  chromeInstalledExtensionPath: string,
  customExtensionPath: string
): string {
  if (extensionSource === 'chrome-installed') {
    return chromeInstalledExtensionPath;
  }

  if (extensionSource === 'custom') {
    return customExtensionPath;
  }

  return projectLocalExtensionPath;
}

/**
 * Converts arbitrary browser names into the supported project-name set.
 */
function normalizeProjectName(name: string): HomeTestProjectName | null {
  const normalized = name.trim().toLowerCase();

  if (normalized === 'chrome-extension' || normalized === 'chrome') {
    return 'chrome-extension';
  }

  if (normalized === 'edge-extension' || normalized === 'edge') {
    return 'edge-extension';
  }

  if (normalized === 'firefox-extension' || normalized === 'firefox') {
    return 'firefox-extension';
  }

  if (normalized === 'safari-extension' || normalized === 'safari' || normalized === 'webkit') {
    return 'safari-extension';
  }

  return null;
}

/**
 * Loads the full runtime configuration from the environment for tests and fixtures.
 */
export function loadRuntimeConfig(): RuntimeConfig {
  const configuredProjects = readList('HOME_TEST_TARGET_BROWSERS', ['chrome-extension'])
    .map(normalizeProjectName)
    .filter((value): value is HomeTestProjectName => value !== null);
  const extensionSource = normalizeExtensionSource(readString('HOME_TEST_EXTENSION_SOURCE', 'project-local'));
  const projectLocalExtensionPath = path.resolve(
    readString('HOME_TEST_PROJECT_LOCAL_EXTENSION_PATH', defaultProjectLocalExtensionPath)
  );
  const chromeInstalledExtensionPath = path.resolve(
    readString('HOME_TEST_CHROME_INSTALLED_EXTENSION_PATH', defaultChromeInstalledExtensionPath)
  );
  const customExtensionPath = path.resolve(
    readString('HOME_TEST_EXTENSION_PATH', projectLocalExtensionPath)
  );

  return {
    extensionMode: readString('HOME_TEST_EXTENSION_MODE', 'unpacked') as RuntimeConfig['extensionMode'],
    extensionSource,
    extensionPath: resolveExtensionPath(
      extensionSource,
      projectLocalExtensionPath,
      chromeInstalledExtensionPath,
      customExtensionPath
    ),
    projectLocalExtensionPath,
    chromeInstalledExtensionPath,
    extensionProfilePath: readString('HOME_TEST_EXTENSION_PROFILE_PATH', ''),
    extensionId: readString('HOME_TEST_EXTENSION_ID', 'iidnankcocecmgpcafggbgbmkbcldmno'),
    extensionPopupPath: readString('HOME_TEST_EXTENSION_POPUP_PATH', 'html/popup.html'),
    chromeChannel: readString('HOME_TEST_CHROME_CHANNEL', 'chromium'),
    edgeChannel: readString('HOME_TEST_EDGE_CHANNEL', 'msedge'),
    apiDomain: readString('HOME_TEST_API_DOMAIN', 'eu.prompt.security'),
    apiKey: readString('HOME_TEST_API_KEY', 'cc6a6cfc-9570-4e5a-b6ea-92d2adac90e4'),
    blockTexts: readList('HOME_TEST_BLOCK_TEXTS', ['Access Denied', 'blocked by your administrator']),
    logDownloadDirectory: path.resolve(
      readString('HOME_TEST_LOG_DOWNLOAD_DIR', path.join(process.env.HOME || os.homedir(), 'Downloads'))
    ),
    logFileName: readString('HOME_TEST_LOG_FILE_NAME', 'prompt_security_extension_debug_logs.txt'),
    persistedLogDirectory: path.resolve(
      readString('HOME_TEST_PERSISTED_LOG_DIR', path.join(process.cwd(), 'test-results', 'extension-logs'))
    ),
    logAssertions: readList('HOME_TEST_LOG_ASSERTIONS', [
      'gemini.google.com',
      'Blocking access to domain gemini.google.com'
    ]),
    clearedLogAssertions: readList('HOME_TEST_CLEARED_LOG_ASSERTIONS', [
      'gemini.google.com',
      'Blocking access to domain gemini.google.com'
    ]),
    failureLogPatterns: readList('HOME_TEST_FAILURE_LOG_PATTERNS', [
      ' 500',
      '[ERROR]',
      'failed',
      'Explore api failed'
    ]),
    logTestApplicationKey: readString('HOME_TEST_LOG_TEST_APPLICATION_KEY', 'gemini'),
    logTestPrompt: readString(
      'HOME_TEST_LOG_TEST_PROMPT',
      'Please summarize the security risks of sending customer data to a public GenAI tool.'
    ),
    debugPromptVisibility: readBoolean('HOME_TEST_DEBUG_PROMPT_VISIBILITY', false),
    navigationTimeoutMs: readNumber('HOME_TEST_NAVIGATION_TIMEOUT_MS', 30_000),
    assertionTimeoutMs: readNumber('HOME_TEST_ASSERTION_TIMEOUT_MS', 20_000),
    targetBrowsers: configuredProjects.length > 0 ? configuredProjects : ['chrome-extension']
  };
}

/**
 * Returns whether the current configuration points to a usable extension artifact on disk.
 */
export function hasConfiguredExtensionArtifact(config: RuntimeConfig): boolean {
  if (config.extensionMode === 'disabled') {
    return false;
  }

  if (config.extensionMode === 'profile') {
    return Boolean(config.extensionProfilePath) && existsSync(config.extensionProfilePath);
  }

  return existsSync(config.extensionPath);
}

/**
 * Resolves the human-readable browser flavor from a Playwright project name.
 */
export function getBrowserFlavor(projectName: HomeTestProjectName): BrowserFlavor {
  if (projectName === 'chrome-extension') {
    return 'chrome';
  }

  if (projectName === 'edge-extension') {
    return 'edge';
  }

  if (projectName === 'firefox-extension') {
    return 'firefox';
  }

  return 'safari';
}

/**
 * Determines whether the selected browser can automate the configured extension artifact.
 */
export function supportsExtensionAutomation(projectName: HomeTestProjectName, config: RuntimeConfig): boolean {
  if (!hasConfiguredExtensionArtifact(config)) {
    return false;
  }

  return projectName === 'chrome-extension' || projectName === 'edge-extension';
}

/**
 * Builds the Playwright project list from the configured browser targets.
 */
export function createProjects(config: RuntimeConfig): Project<PlaywrightTestConfig['use']>[] {
  const projectMap: Record<HomeTestProjectName, Project<PlaywrightTestConfig['use']>> = {
    'chrome-extension': {
      name: 'chrome-extension',
      use: {
        browserName: 'chromium'
      }
    },
    'edge-extension': {
      name: 'edge-extension',
      use: {
        browserName: 'chromium'
      }
    },
    'firefox-extension': {
      name: 'firefox-extension',
      use: {
        browserName: 'firefox'
      }
    },
    'safari-extension': {
      name: 'safari-extension',
      use: {
        browserName: 'webkit'
      }
    }
  };

  return config.targetBrowsers.map((projectName) => projectMap[projectName]);
}
