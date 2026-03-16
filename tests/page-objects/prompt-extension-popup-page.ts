import type { BrowserContext, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { RuntimeConfig } from '../../src/models/access-policy';
import { StepLogger } from '../../src/core/logger';

/**
 * Models the Prompt Security extension popup and its configuration controls.
 */
export class PromptExtensionPopupPage {
  private popupPage: Page | null = null;

  /**
   * Creates a popup page object bound to a browser context and extension metadata.
   */
  constructor(
    private readonly context: BrowserContext,
    private readonly extensionId: string,
    private readonly runtimeConfig: RuntimeConfig,
    private readonly logger: StepLogger
  ) {}

  /**
   * Opens the extension popup and waits for the key configuration controls.
   */
  async open(): Promise<Page> {
    this.logger.info('Opening extension popup', {
      popupPath: this.runtimeConfig.extensionPopupPath,
      extensionId: this.extensionId
    });

    const page = await this.context.newPage();
    await page.goto(`chrome-extension://${this.extensionId}/${this.runtimeConfig.extensionPopupPath}`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(page.locator('#apiDomain')).toBeVisible();
    await expect(page.locator('#apiKey')).toBeVisible();
    this.popupPage = page;
    return page;
  }

  /**
   * Fills the API domain and API key fields and saves the popup configuration.
   */
  async configureConnection(): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Configuring Prompt Security connection in popup', {
      apiDomain: this.runtimeConfig.apiDomain
    });

    await this.apiDomainInput(page).fill(this.runtimeConfig.apiDomain);
    await this.apiKeyInput(page).fill(this.runtimeConfig.apiKey);
    await this.saveButton(page).click();

    await expect(this.apiDomainInput(page)).toHaveValue(this.runtimeConfig.apiDomain);
    await expect(this.apiKeyInput(page)).toHaveValue(this.runtimeConfig.apiKey);
  }

  /**
   * Verifies that the popup exposes the key user-facing controls required by the assignment.
   */
  async assertUiElements(): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Asserting extension popup UI controls');

    await expect(this.apiDomainInput(page)).toBeVisible();
    await expect(this.apiKeyInput(page)).toBeVisible();
    await expect(this.downloadLogsButton(page)).toBeVisible();
    await expect(this.clearLogsButton(page)).toBeVisible();
  }

  /**
   * Verifies that the popup displays the expected signed-in user email when configured.
   */
  async assertUserEmail(): Promise<void> {
    const page = await this.ensurePage();

    if (!this.runtimeConfig.expectedUserEmail) {
      this.logger.warn('Skipping popup user-email assertion because no expected email is configured');
      return;
    }

    this.logger.info('Asserting extension popup user email', {
      expectedUserEmail: this.runtimeConfig.expectedUserEmail
    });

    await expect(page.locator('#user')).toBeVisible();
    await expect(page.locator('#email')).toHaveText(this.runtimeConfig.expectedUserEmail);
  }

  /**
   * Clicks the popup button that asks the extension to export its debug logs.
   */
  async downloadLogs(): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Triggering extension log download from the popup UI');
    await this.downloadLogsButton(page).click();
  }

  /**
   * Clicks the popup button that clears the extension logs and waits for its feedback message.
   */
  async clearLogs(): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Clearing extension logs from the popup UI');
    await this.clearLogsButton(page).click();
    await expect(page.locator('#clearLogsMessage')).toBeVisible();
  }

  /**
   * Closes the popup page when the caller is done using it.
   */
  async close(): Promise<void> {
    if (!this.popupPage) {
      return;
    }

    this.logger.info('Closing extension popup');
    await this.popupPage.close();
    this.popupPage = null;
  }

  /**
   * Returns the popup page if it is already open and otherwise opens it lazily.
   */
  private async ensurePage(): Promise<Page> {
    if (!this.popupPage) {
      return this.open();
    }

    return this.popupPage;
  }

  /**
   * Locates the API-domain input field inside the popup.
   */
  private apiDomainInput(page: Page): Locator {
    return page.locator('#apiDomain');
  }

  /**
   * Locates the API-key input field inside the popup.
   */
  private apiKeyInput(page: Page): Locator {
    return page.locator('#apiKey');
  }

  /**
   * Locates the save button inside the popup.
   */
  private saveButton(page: Page): Locator {
    return page.locator('#saveButton');
  }

  /**
   * Locates the popup button that downloads the extension logs.
   */
  private downloadLogsButton(page: Page): Locator {
    return page.locator('#downloadLogsButton');
  }

  /**
   * Locates the popup button that clears the extension logs.
   */
  private clearLogsButton(page: Page): Locator {
    return page.locator('#clearLogsButton');
  }
}
