import fs from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import type { RuntimeConfig } from '../../src/models/access-policy';
import { StepLogger } from '../../src/core/logger';

/**
 * Persists extension debug logs so tests can assert storage-backed log contents.
 */
export class ExtensionLogFileService {
  /**
   * Creates a log-file service bound to the current runtime configuration.
   */
  constructor(private readonly runtimeConfig: RuntimeConfig, private readonly logger: StepLogger) {}

  /**
   * Ensures that the configured persisted-log directory exists before tests write storage logs to disk.
   */
  async ensurePersistedLogDirectory(): Promise<void> {
    this.logger.info('Ensuring the persisted extension-log directory exists', {
      persistedLogDirectory: this.runtimeConfig.persistedLogDirectory
    });

    await fs.mkdir(this.runtimeConfig.persistedLogDirectory, { recursive: true });
  }

  /**
   * Writes the provided log contents to a deterministic file under the configured persisted-log directory.
   */
  async persistLogContents(logContents: string, fileLabel: string): Promise<string> {
    const persistedLogPath = this.resolvePersistedLogPath(fileLabel);
    this.logger.info('Persisting extension log contents to a project file', { persistedLogPath });
    await fs.writeFile(persistedLogPath, logContents, 'utf8');
    return persistedLogPath;
  }

  /**
   * Asserts that all configured required log snippets are present in the persisted log contents.
   */
  assertContainsConfiguredEntries(logContents: string): void {
    this.logger.info('Asserting that the persisted extension logs contain the configured snippets', {
      assertions: this.runtimeConfig.logAssertions
    });

    for (const expectedEntry of this.runtimeConfig.logAssertions) {
      expect(logContents).toContain(expectedEntry);
    }
  }

  /**
   * Extracts relevant error lines from the persisted log contents using the configured failure patterns.
   */
  extractRelevantErrorLines(logContents: string): string[] {
    const normalizedLines = logContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const matchedLines = normalizedLines.filter((line) =>
      this.runtimeConfig.failureLogPatterns.some((pattern) =>
        line.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    if (matchedLines.length > 0) {
      return matchedLines;
    }

    return normalizedLines.filter((line) => /\berror\b/i.test(line));
  }

  /**
   * Returns the last N non-empty log lines to aid debugging when no explicit error-pattern match is found.
   */
  extractTailLines(logContents: string, lineCount = 20): string[] {
    return logContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-lineCount);
  }

  /**
   * Resolves a persisted project-local log path for the provided label.
   */
  resolvePersistedLogPath(fileLabel: string): string {
    const safeLabel = fileLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'extension-debug-log';

    return path.join(this.runtimeConfig.persistedLogDirectory, `${safeLabel}.txt`);
  }
}
