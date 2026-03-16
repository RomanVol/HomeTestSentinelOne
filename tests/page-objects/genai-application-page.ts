import type { Page } from '@playwright/test';
import type { GenAiApplicationDefinition } from '../../src/models/access-policy';
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
    private readonly navigationTimeoutMs: number,
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
      timeout: this.navigationTimeoutMs
    });

    await this.page.waitForTimeout(1_000);
  }

  /**
   * Returns the underlying Playwright page for consumers that need direct assertions.
   */
  getPage(): Page {
    return this.page;
  }
}

