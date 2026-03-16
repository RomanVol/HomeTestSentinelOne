import fs from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import type { RuntimeConfig } from '../../src/models/access-policy';
import { StepLogger } from '../../src/core/logger';

/**
 * Handles downloaded extension-log files so UI tests can assert real exported log contents.
 */
export class ExtensionLogFileService {
  /**
   * Creates a log-file service bound to the current runtime configuration.
   */
  constructor(private readonly runtimeConfig: RuntimeConfig, private readonly logger: StepLogger) {}

  /**
   * Ensures that the configured log-download directory exists before tests use it.
   */
  async ensureDownloadDirectory(): Promise<void> {
    this.logger.info('Ensuring the configured log-download directory exists', {
      logDownloadDirectory: this.runtimeConfig.logDownloadDirectory
    });

    await fs.mkdir(this.runtimeConfig.logDownloadDirectory, { recursive: true });
  }

  /**
   * Removes any stale downloaded log file so a new export can be detected deterministically.
   */
  async deleteExistingLogFile(): Promise<void> {
    const logFilePath = this.resolveLogFilePath();
    this.logger.info('Removing stale downloaded log file if it already exists', { logFilePath });
    await fs.rm(logFilePath, { force: true });
  }

  /**
   * Waits until the downloaded log file appears on disk and then returns its contents.
   */
  async waitForDownloadedLogContents(): Promise<string> {
    const logFilePath = this.resolveLogFilePath();
    this.logger.info('Waiting for the extension log file to appear', { logFilePath });

    await expect
      .poll(async () => {
        try {
          const fileContents = await fs.readFile(logFilePath, 'utf8');
          return fileContents.trim();
        } catch {
          return '';
        }
      }, {
        timeout: this.runtimeConfig.assertionTimeoutMs
      })
      .not.toBe('');

    return this.readCurrentLogContents();
  }

  /**
   * Reads the current downloaded log file without polling.
   */
  async readCurrentLogContents(): Promise<string> {
    const logFilePath = this.resolveLogFilePath();
    this.logger.info('Reading the current downloaded log file', { logFilePath });
    return fs.readFile(logFilePath, 'utf8');
  }

  /**
   * Asserts that all configured required log snippets are present in the exported file.
   */
  assertContainsConfiguredEntries(logContents: string): void {
    this.logger.info('Asserting that the downloaded log file contains the configured snippets', {
      assertions: this.runtimeConfig.logAssertions
    });

    for (const expectedEntry of this.runtimeConfig.logAssertions) {
      expect(logContents).toContain(expectedEntry);
    }
  }

  /**
   * Asserts that all configured cleared-log snippets are absent from the exported file.
   */
  assertClearedEntriesAreAbsent(logContents: string): void {
    this.logger.info('Asserting that the cleared log export no longer contains the configured snippets', {
      clearedAssertions: this.runtimeConfig.clearedLogAssertions
    });

    for (const absentEntry of this.runtimeConfig.clearedLogAssertions) {
      expect(logContents).not.toContain(absentEntry);
    }
  }

  /**
   * Resolves the absolute downloaded log-file path from the configured directory and filename.
   */
  resolveLogFilePath(): string {
    return path.join(this.runtimeConfig.logDownloadDirectory, this.runtimeConfig.logFileName);
  }
}
