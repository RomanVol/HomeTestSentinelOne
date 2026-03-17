import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { StepLogger } from '../../src/core/logger';

export type HostAccessOption = 'ON_CLICK' | 'ON_SPECIFIC_SITES' | 'ON_ALL_SITES';
export type ExtensionDetailsToggleId =
  | 'allow-on-file-urls-warning'
  | 'pin-to-toolbar'
  | 'allow-incognito'
  | 'collect-errors';

/**
 * Models the Chrome extension-details page used to manage host access and browser-level extension toggles.
 */
export class ExtensionManagementPage {
  private managementPage: Page | null = null;

  constructor(
    private readonly context: BrowserContext,
    private readonly extensionId: string,
    private readonly logger: StepLogger
  ) {}

  /**
   * Opens the Chrome extension-details page for the current extension.
   */
  async open(): Promise<Page> {
    this.logger.info('Opening Chrome extension management page', {
      extensionId: this.extensionId
    });

    const page = this.managementPage && !this.managementPage.isClosed()
      ? this.managementPage
      : await this.context.newPage();

    await page.goto(`chrome://extensions/?id=${this.extensionId}`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(this.hostAccessSelect(page)).toBeVisible();
    await expect(this.siteSettingsButton(page)).toBeVisible();
    this.managementPage = page;
    return page;
  }

  /**
   * Applies the browser-level preconditions required for policy enforcement.
   */
  async ensureQaPreconditions(): Promise<void> {
    this.logger.info('Ensuring extension-management preconditions required for policy automation');
    await this.setHostAccess('ON_ALL_SITES');
  }

  /**
   * Verifies that the key extension-details controls are visible.
   */
  async assertControlsVisible(): Promise<void> {
    const page = await this.ensurePage();

    await expect(this.hostAccessSelect(page)).toBeVisible();
    await expect(this.siteSettingsButton(page)).toBeVisible();
    await expect(this.toggleLocator('allow-on-file-urls-warning', page)).toBeVisible();
    await expect(this.toggleLocator('pin-to-toolbar', page)).toBeVisible();
    await expect(this.toggleLocator('allow-incognito', page)).toBeVisible();
    await expect(this.toggleLocator('collect-errors', page)).toBeVisible();
  }

  /**
   * Selects the requested host-access option from the extension-details page.
   */
  async setHostAccess(value: HostAccessOption): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Setting extension host access', { value });

    await this.hostAccessSelect(page).selectOption(value);
    await expect(this.hostAccessSelect(page)).toHaveValue(value);
  }

  /**
   * Adds a site pattern from the "On specific sites" popup and waits for the popup to close.
   */
  async addSpecificSite(sitePattern: string): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Adding a specific site pattern from the extension-details page', {
      sitePattern
    });

    await this.specificSiteInput(page).fill(sitePattern);
    await expect(this.addSpecificSiteButton(page)).toBeEnabled();
    await this.addSpecificSiteButton(page).click();
    await expect(this.specificSiteInput(page)).toBeHidden();
  }

  /**
   * Cancels the "On specific sites" popup after optionally filling a value.
   */
  async cancelSpecificSite(sitePattern?: string): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Cancelling the specific-site popup on the extension-details page', {
      sitePattern
    });

    if (typeof sitePattern === 'string') {
      await this.specificSiteInput(page).fill(sitePattern);
    }

    await this.cancelSpecificSiteButton(page).click();
    await expect(this.specificSiteInput(page)).toBeHidden();
  }

  /**
   * Returns whether the Add button inside the specific-site popup is currently enabled.
   */
  async isSpecificSiteAddEnabled(): Promise<boolean> {
    const page = await this.ensurePage();
    return this.addSpecificSiteButton(page).isEnabled();
  }

  /**
   * Returns whether the specific-site popup is currently visible.
   */
  async isSpecificSitePopupVisible(): Promise<boolean> {
    const page = await this.ensurePage();
    return this.specificSiteInput(page).isVisible().catch(() => false);
  }

  /**
   * Opens the specific-site popup by switching host access to "On specific sites".
   */
  async openSpecificSitePopup(): Promise<void> {
    const page = await this.ensurePage();
    this.logger.info('Opening the specific-site popup from the host-access selector');

    await this.setHostAccess('ON_SPECIFIC_SITES');
    await expect(this.specificSiteInput(page)).toBeVisible();
    await expect(this.cancelSpecificSiteButton(page)).toBeVisible();
  }

  /**
   * Reads the currently selected host-access value.
   */
  async readHostAccess(): Promise<HostAccessOption> {
    const page = await this.ensurePage();
    const hostAccessValue = await this.hostAccessSelect(page).inputValue();
    return hostAccessValue as HostAccessOption;
  }

  /**
   * Ensures a toggle is set to the requested boolean state.
   */
  async setToggle(toggleId: ExtensionDetailsToggleId, enabled: boolean): Promise<void> {
    const page = await this.ensurePage();
    const toggle = this.toggleLocator(toggleId, page);
    const currentValue = await this.isToggleEnabled(toggleId);

    this.logger.info('Setting extension-details toggle', {
      toggleId,
      enabled
    });

    if (currentValue !== enabled) {
      await toggle.click();
    }

    await expect.poll(() => this.isToggleEnabled(toggleId)).toBe(enabled);
  }

  /**
   * Reads whether a toggle is currently enabled.
   */
  async isToggleEnabled(toggleId: ExtensionDetailsToggleId): Promise<boolean> {
    const page = await this.ensurePage();
    const toggle = this.toggleLocator(toggleId, page);

    return toggle.evaluate((element: Element) => {
      const host = element as HTMLElement & { checked?: boolean };

      if (typeof host.checked === 'boolean') {
        return host.checked;
      }

      if (host.hasAttribute('checked')) {
        return true;
      }

      const ariaPressed = host.getAttribute('aria-pressed');
      if (ariaPressed !== null) {
        return ariaPressed === 'true';
      }

      const ariaChecked = host.getAttribute('aria-checked');
      if (ariaChecked !== null) {
        return ariaChecked === 'true';
      }

      return false;
    });
  }

  /**
   * Opens the site-settings entry and returns the resulting URL.
   */
  async openSiteSettings(): Promise<string> {
    const page = await this.ensurePage();
    const previousUrl = page.url();
    this.logger.info('Opening the extension site-settings entry');

    await this.siteSettingsButton(page).click();

    await expect.poll(() => page.url()).not.toBe(previousUrl);
    return page.url();
  }

  /**
   * Closes the management page when the caller is done using it.
   */
  async close(): Promise<void> {
    if (!this.managementPage || this.managementPage.isClosed()) {
      return;
    }

    this.logger.info('Closing Chrome extension management page');
    await this.managementPage.close();
    this.managementPage = null;
  }

  private async ensurePage(): Promise<Page> {
    if (!this.managementPage || this.managementPage.isClosed()) {
      return this.open();
    }

    return this.managementPage;
  }

  private hostAccessSelect(page: Page): Locator {
    return page.locator('#hostAccess').first();
  }

  private siteSettingsButton(page: Page): Locator {
    return page.locator('#siteSettings').first();
  }

  private specificSiteInput(page: Page): Locator {
    return page.locator('#inner-input-content').first();
  }

  private addSpecificSiteButton(page: Page): Locator {
    return page.locator('#submit').first();
  }

  private cancelSpecificSiteButton(page: Page): Locator {
    return page.locator('.cancel-button').first();
  }

  private toggleLocator(toggleId: ExtensionDetailsToggleId, page: Page): Locator {
    return page.locator(`#${toggleId}`).first();
  }
}
