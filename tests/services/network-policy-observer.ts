import { expect, type Page, type Request, type Response } from '@playwright/test';
import type { GenAiApplicationDefinition, RuntimeConfig } from '../../src/models/access-policy';
import { StepLogger } from '../../src/core/logger';

type ObservedRequest = {
  url: string;
  host: string | null;
  resourceType: string;
  method: string;
  isNavigationRequest: boolean;
};

type ObservedResponse = {
  url: string;
  host: string | null;
  resourceType: string;
  status: number;
  ok: boolean;
};

/**
 * Captures page-level request and response traffic so tests can assert network behavior explicitly.
 */
export class NetworkPolicyObserver {
  private readonly requests: ObservedRequest[] = [];
  private readonly responses: ObservedResponse[] = [];

  /**
   * Starts listening to page network events as soon as the observer is created.
   */
  constructor(private readonly page: Page, private readonly runtimeConfig: RuntimeConfig, private readonly logger: StepLogger) {
    this.page.on('request', (request) => {
      this.requests.push(this.serializeRequest(request));
    });

    this.page.on('response', (response) => {
      this.responses.push(this.serializeResponse(response));
    });
  }

  /**
   * Clears the captured traffic so each test phase can start from a known empty state.
   */
  reset(): void {
    this.logger.info('Resetting captured network events');
    this.requests.length = 0;
    this.responses.length = 0;
  }

  /**
   * Asserts that the allowed application completed a successful top-level document response.
   */
  async assertAllowedNavigation(application: GenAiApplicationDefinition): Promise<void> {
    this.logger.info('Asserting allowed network behavior', {
      application: application.name,
      expectedHost: application.expectedHost
    });

    await expect
      .poll(() => this.hasSuccessfulDocumentResponse(application.expectedHost), {
        timeout: this.runtimeConfig.assertionTimeoutMs
      })
      .toBe(true);
  }

  /**
   * Asserts that navigation to the blocked application was attempted but did not progress into active app traffic.
   */
  async assertBlockedNavigation(application: GenAiApplicationDefinition, extensionId: string): Promise<void> {
    this.logger.info('Asserting blocked network behavior', {
      application: application.name,
      expectedHost: application.expectedHost
    });

    await expect
      .poll(() => this.hasNavigationRequest(application.expectedHost), {
        timeout: this.runtimeConfig.assertionTimeoutMs
      })
      .toBe(true);

    await expect
      .poll(() => this.page.url().startsWith(`chrome-extension://${extensionId}/html/pageOverlay.html`), {
        timeout: this.runtimeConfig.assertionTimeoutMs
      })
      .toBe(true);

    // Give the page a short quiet window so late XHR or websocket traffic would be observed before asserting.
    await this.page.waitForTimeout(1_500);

    expect(this.getSuccessfulNonDocumentResponses(application.expectedHost)).toHaveLength(0);
  }

  /**
   * Returns a copy of the captured requests for debugging or future assertions.
   */
  getRequests(): readonly ObservedRequest[] {
    return [...this.requests];
  }

  /**
   * Returns a copy of the captured responses for debugging or future assertions.
   */
  getResponses(): readonly ObservedResponse[] {
    return [...this.responses];
  }

  /**
   * Converts a Playwright request object into a serializable test-friendly structure.
   */
  private serializeRequest(request: Request): ObservedRequest {
    return {
      url: request.url(),
      host: this.getHostSafely(request.url()),
      resourceType: request.resourceType(),
      method: request.method(),
      isNavigationRequest: request.isNavigationRequest()
    };
  }

  /**
   * Converts a Playwright response object into a serializable test-friendly structure.
   */
  private serializeResponse(response: Response): ObservedResponse {
    return {
      url: response.url(),
      host: this.getHostSafely(response.url()),
      resourceType: response.request().resourceType(),
      status: response.status(),
      ok: response.ok()
    };
  }

  /**
   * Checks whether a navigation request to the expected host has been observed.
   */
  private hasNavigationRequest(expectedHost: string): boolean {
    return this.requests.some(
      (request) => request.host === expectedHost && request.isNavigationRequest && request.resourceType === 'document'
    );
  }

  /**
   * Checks whether the expected host returned a successful top-level document response.
   */
  private hasSuccessfulDocumentResponse(expectedHost: string): boolean {
    return this.responses.some(
      (response) => response.host === expectedHost && response.resourceType === 'document' && response.ok
    );
  }

  /**
   * Finds successful non-document responses for the blocked host, which should remain absent after blocking.
   */
  private getSuccessfulNonDocumentResponses(expectedHost: string): ObservedResponse[] {
    return this.responses.filter(
      (response) => response.host === expectedHost && response.resourceType !== 'document' && response.ok
    );
  }

  /**
   * Parses the hostname from a URL string without throwing into the caller.
   */
  private getHostSafely(url: string): string | null {
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  }
}
