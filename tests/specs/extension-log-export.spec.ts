import { getGenAiApplicationByKey } from '../data/genai-applications';
import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security exported log validation', () => {
  test('exports logs that prove the expected policy decision and clears them through the popup UI', async ({
    logger,
    browserSession,
    extensionPopupPage,
    extensionLogFileService,
    applicationPage,
    policyEvaluator,
    runtimeConfig
  }, testInfo) => {
    test.skip(
      !browserSession.extensionLoaded || !browserSession.extensionId || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );

    const popupPage = extensionPopupPage!;
    const logApplication = getGenAiApplicationByKey(runtimeConfig.logTestApplicationKey);

    await test.step('Configure the popup before exporting logs', async () => {
      logger.info('Preparing the popup before exercising log export behavior', {
        application: logApplication.name
      });
      await popupPage.open();
      await popupPage.configureConnection();
    });

    await test.step('Trigger the policy behavior that should appear in the exported logs', async () => {
      logger.info('Navigating to the configured log-test application', {
        application: logApplication.name,
        expectedPolicy: logApplication.expectedPolicy
      });
      await applicationPage.goto(logApplication);

      if (runtimeConfig.debugPromptVisibility) {
        const beforePromptScreenshotPath = testInfo.outputPath('before-prompt-attempt.png');
        logger.info('Capturing a screenshot before the prompt-submission attempt', {
          beforePromptScreenshotPath
        });
        await applicationPage.getPage().screenshot({ path: beforePromptScreenshotPath, fullPage: true });
        logger.info('Pausing before the prompt-submission attempt because debug prompt visibility is enabled');
        await applicationPage.getPage().pause();
      }

      const promptWasSubmitted = await applicationPage.trySendPrompt(
        logApplication,
        runtimeConfig.logTestPrompt
      );

      logger.info('Completed the configurable prompt-submission attempt before reading logs', {
        application: logApplication.name,
        promptWasSubmitted
      });

      if (runtimeConfig.debugPromptVisibility) {
        const afterPromptScreenshotPath = testInfo.outputPath('after-prompt-attempt.png');
        logger.info('Capturing a screenshot after the prompt-submission attempt', {
          afterPromptScreenshotPath
        });
        await applicationPage.getPage().screenshot({ path: afterPromptScreenshotPath, fullPage: true });
      }

      if (logApplication.expectedPolicy === 'allow') {
        await policyEvaluator.assertAllowed(
          applicationPage.getPage(),
          logApplication,
          browserSession.extensionId!
        );
        return;
      }

      await policyEvaluator.assertBlocked(
        applicationPage.getPage(),
        logApplication,
        browserSession.extensionId!
      );
    });

    await test.step('Trigger popup log export, read storage logs, and assert the configured snippets are present', async () => {
      await extensionLogFileService.deleteExistingLogFile();
      await popupPage.downloadLogs();
      const logContents = await popupPage.readDebugLogsFromStorage();
      const persistedLogPath = await extensionLogFileService.persistLogContents(
        logContents,
        `${testInfo.project.name}-${testInfo.title}-before-clear`
      );
      logger.info('Persisted extension storage logs after popup export', { persistedLogPath });
      extensionLogFileService.assertContainsConfiguredEntries(logContents);
    });

    await test.step('Clear the logs, read storage again, and assert the configured snippets are absent', async () => {
      await popupPage.clearLogs();
      await extensionLogFileService.deleteExistingLogFile();
      await popupPage.downloadLogs();
      const clearedLogContents = await popupPage.readDebugLogsFromStorage();
      const persistedClearedLogPath = await extensionLogFileService.persistLogContents(
        clearedLogContents,
        `${testInfo.project.name}-${testInfo.title}-after-clear`
      );
      logger.info('Persisted extension storage logs after clearing logs', {
        persistedClearedLogPath
      });
      extensionLogFileService.assertClearedEntriesAreAbsent(clearedLogContents);
    });
  });
});
