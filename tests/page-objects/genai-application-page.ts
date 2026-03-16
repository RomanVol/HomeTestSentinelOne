import { type Locator, type Page } from '@playwright/test';
import type { GenAiApplicationDefinition, RuntimeConfig } from '../../src/models/access-policy';
import { StepLogger } from '../../src/core/logger';

/**
 * Encapsulates navigation and low-level state collection for GenAI applications.
 */
export class GenAiApplicationPage {
  /**
   * Creates a page object for GenAI application interactions.
   */
  constructor(
    private readonly page: Page,
    private readonly runtimeConfig: RuntimeConfig,
    private readonly logger: StepLogger
  ) {}

  /**
   * Navigates the active browser page to the target application URL.
   */
  async goto(application: GenAiApplicationDefinition): Promise<void> {
    this.logger.info('Navigating to GenAI application', {
      application: application.name,
      url: application.url
    });

    await this.page.goto(application.url, {
      waitUntil: 'domcontentloaded',
      timeout: this.runtimeConfig.navigationTimeoutMs
    });

    await this.page.waitForTimeout(1_000);
  }

  /**
   * Attempts to type and submit a prompt on a supported GenAI application page.
   * Returns false when the application UI is not reachable, which is expected if the extension blocks access first.
   */
  async trySendPrompt(application: GenAiApplicationDefinition, prompt: string): Promise<boolean> {
    if (application.key !== 'gemini') {
      this.logger.warn('Prompt submission is not implemented for this application key', {
        application: application.name
      });
      return false;
    }

    this.logger.info('Attempting to write and send a prompt on the GenAI application', {
      application: application.name
    });

    const composer = await this.findFirstVisibleLocator([
      'rich-textarea .ql-editor',
      'textarea[aria-label*="prompt" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="prompt" i]'
    ]);

    if (!composer) {
      this.logger.warn('No visible prompt composer was found on the application page', {
        application: application.name,
        currentUrl: this.page.url()
      });
      return false;
    }

    this.logger.info('Matched Gemini composer selector for prompt submission', {
      application: application.name,
      selector: composer.selector
    });

    await composer.locator.click();

    const tagName = await composer.locator
      .evaluate((element: Element) => element.tagName.toLowerCase())
      .catch(() => '');

    if (tagName === 'textarea') {
      await composer.locator.fill(prompt);
    } else {
      await composer.locator.fill('').catch(() => {});
      await composer.locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
      await composer.locator.press('Backspace').catch(() => {});
      await composer.locator.type(prompt, { delay: 20 });
    }

    const sendButton = await this.findFirstVisibleLocator([
      'button[aria-label*="Send message" i]',
      'button[aria-label*="Send" i]',
      'button[mattooltip*="Send" i]',
      'button[data-test-id*="send" i]'
    ]);

    if (sendButton) {
      this.logger.info('Matched Gemini send-button selector for prompt submission', {
        application: application.name,
        selector: sendButton.selector
      });
      await sendButton.locator.click();
      await this.page.waitForTimeout(1_000);
      return true;
    }

    await composer.locator.press('Enter').catch(() => {});
    await this.page.waitForTimeout(1_000);
    return true;
  }

  /**
   * Returns the underlying Playwright page for consumers that need direct assertions.
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Returns the first visible locator from a selector list, or null when none are visible.
   */
  private async findFirstVisibleLocator(selectors: string[]): Promise<{ locator: Locator; selector: string } | null> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      const isVisible = await locator.isVisible().catch(() => false);

      if (isVisible) {
        return { locator, selector };
      }
    }

    return null;
  }
}
