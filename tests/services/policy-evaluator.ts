import { expect, type Page } from '@playwright/test';
import type {
  AccessObservation,
  GenAiApplicationDefinition,
  RuntimeConfig
} from '../../src/models/access-policy';
import { StepLogger } from '../../src/core/logger';

/**
 * Centralizes policy-specific assertions so the spec remains small and readable.
 */
export class PolicyEvaluator {
  /**
   * Creates an evaluator instance for a specific runtime configuration.
   */
  constructor(private readonly runtimeConfig: RuntimeConfig, private readonly logger: StepLogger) {}

  /**
   * Polls the page until it clearly looks allowed for the target application.
   */
  async assertAllowed(page: Page, application: GenAiApplicationDefinition, extensionId: string): Promise<void> {
    this.logger.info('Asserting allowed policy', {
      application: application.name,
      expectedHost: application.expectedHost
    });

    await expect
      .poll(async () => this.collectObservation(page, extensionId), {
        timeout: this.runtimeConfig.assertionTimeoutMs
      })
      .toMatchObject({
        currentHost: application.expectedHost,
        isExtensionOverlayUrl: false,
        accessDeniedVisible: false,
        blockedByAdministratorVisible: false
      });
  }

  /**
   * Polls the page until it clearly looks blocked for the target application.
   */
  async assertBlocked(page: Page, application: GenAiApplicationDefinition, extensionId: string): Promise<void> {
    this.logger.info('Asserting blocked policy', {
      application: application.name,
      expectedHost: application.expectedHost
    });

    await expect
      .poll(async () => {
        const observation = await this.collectObservation(page, extensionId);
        const matchedBlockText = this.runtimeConfig.blockTexts.some((text) =>
          observation.bodyText.toLowerCase().includes(text.toLowerCase())
        );

        return (
          observation.isExtensionOverlayUrl ||
          observation.accessDeniedVisible ||
          observation.blockedByAdministratorVisible ||
          observation.blockIndicatorVisible ||
          matchedBlockText
        );
      }, {
        timeout: this.runtimeConfig.assertionTimeoutMs
      })
      .toBe(true);
  }

  /**
   * Collects the current page state that policy assertions rely on.
   */
  private async collectObservation(page: Page, extensionId: string): Promise<AccessObservation> {
    const currentUrl = page.url();
    const currentHost = this.getHostSafely(currentUrl);
    const pageTitle = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const accessDeniedVisible = await page.getByText(/Access Denied/i).first().isVisible().catch(() => false);
    const blockedByAdministratorVisible = await page
      .getByText(/blocked by your administrator/i)
      .first()
      .isVisible()
      .catch(() => false);
    const blockIndicatorVisible = await page.locator('#title-text').isVisible().catch(() => false);
    const isExtensionOverlayUrl = currentUrl.startsWith(
      `chrome-extension://${extensionId}/html/pageOverlay.html`
    );

    return {
      currentUrl,
      currentHost,
      pageTitle,
      bodyText,
      blockIndicatorVisible,
      accessDeniedVisible,
      blockedByAdministratorVisible,
      isExtensionOverlayUrl
    };
  }

  /**
   * Parses a hostname from a URL string without throwing into the caller.
   */
  private getHostSafely(url: string): string | null {
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  }
}
