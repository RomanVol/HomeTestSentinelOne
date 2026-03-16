import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { PlaywrightTestConfig, Project } from '@playwright/test';
import type { BrowserFlavor, HomeTestProjectName, RuntimeConfig } from '../models/access-policy';

const defaultExtensionPath =
  '/Users/roma/Library/Application Support/Google/Chrome/Default/Extensions/iidnankcocecmgpcafggbgbmkbcldmno/7.0.40_0';

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

  return {
    extensionMode: readString('HOME_TEST_EXTENSION_MODE', 'unpacked') as RuntimeConfig['extensionMode'],
    extensionPath: path.resolve(readString('HOME_TEST_EXTENSION_PATH', defaultExtensionPath)),
    extensionProfilePath: readString('HOME_TEST_EXTENSION_PROFILE_PATH', ''),
    extensionId: readString('HOME_TEST_EXTENSION_ID', 'iidnankcocecmgpcafggbgbmkbcldmno'),
    extensionPopupPath: readString('HOME_TEST_EXTENSION_POPUP_PATH', 'html/popup.html'),
    chromeChannel: readString('HOME_TEST_CHROME_CHANNEL', 'chrome'),
    edgeChannel: readString('HOME_TEST_EDGE_CHANNEL', 'msedge'),
    apiDomain: readString('HOME_TEST_API_DOMAIN', 'eu.prompt.security'),
    apiKey: readString('HOME_TEST_API_KEY', 'cc6a6cfc-9570-4e5a-b6ea-92d2adac90e4'),
    expectedUserEmail: readString('HOME_TEST_EXPECTED_USER_EMAIL', 'romavolman@gmail.com'),
    blockTexts: readList('HOME_TEST_BLOCK_TEXTS', ['Access Denied', 'blocked by your administrator']),
    logDownloadDirectory: path.resolve(
      readString('HOME_TEST_LOG_DOWNLOAD_DIR', path.join(process.env.HOME || os.homedir(), 'Downloads'))
    ),
    logFileName: readString('HOME_TEST_LOG_FILE_NAME', 'prompt_security_extension_debug_logs.txt'),
    logAssertions: readList('HOME_TEST_LOG_ASSERTIONS', [
      'gemini.google.com',
      'Blocking access to domain gemini.google.com'
    ]),
    clearedLogAssertions: readList('HOME_TEST_CLEARED_LOG_ASSERTIONS', [
      'gemini.google.com',
      'Blocking access to domain gemini.google.com'
    ]),
    logTestApplicationKey: readString('HOME_TEST_LOG_TEST_APPLICATION_KEY', 'gemini'),
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
