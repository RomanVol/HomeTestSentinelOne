/**
 * Describes the supported extension-source modes for the test harness.
 */
export type ExtensionMode = 'unpacked' | 'profile' | 'disabled';

/**
 * Describes the supported Playwright project names in this repository.
 */
export type HomeTestProjectName =
  | 'chrome-extension'
  | 'edge-extension'
  | 'firefox-extension'
  | 'safari-extension';

/**
 * Describes the expected policy result for an application.
 */
export type AccessExpectation = 'allow' | 'block';

/**
 * Defines a single GenAI application policy test case.
 */
export interface GenAiApplicationDefinition {
  key: string;
  name: string;
  url: string;
  expectedPolicy: AccessExpectation;
  expectedHost: string;
  readySelector?: string;
}

/**
 * Defines the runtime configuration consumed by the framework.
 */
export interface RuntimeConfig {
  extensionMode: ExtensionMode;
  extensionPath: string;
  extensionProfilePath: string;
  extensionId: string;
  extensionPopupPath: string;
  chromeChannel: string;
  edgeChannel: string;
  apiDomain: string;
  apiKey: string;
  expectedUserEmail: string;
  blockTexts: string[];
  logDownloadDirectory: string;
  logFileName: string;
  logAssertions: string[];
  clearedLogAssertions: string[];
  logTestApplicationKey: string;
  navigationTimeoutMs: number;
  assertionTimeoutMs: number;
  targetBrowsers: HomeTestProjectName[];
}

/**
 * Describes the browser flavor that a test project represents.
 */
export type BrowserFlavor = 'chrome' | 'edge' | 'firefox' | 'safari';

/**
 * Captures the browser-session state that fixtures expose to tests.
 */
export interface BrowserSession {
  browserFlavor: BrowserFlavor;
  extensionLoaded: boolean;
  extensionSupported: boolean;
  extensionSkipReason: string | null;
  extensionId: string | null;
}

/**
 * Captures the observable state of an application page after navigation.
 */
export interface AccessObservation {
  currentUrl: string;
  currentHost: string | null;
  pageTitle: string;
  bodyText: string;
  blockIndicatorVisible: boolean;
  accessDeniedVisible: boolean;
  blockedByAdministratorVisible: boolean;
  isExtensionOverlayUrl: boolean;
}
