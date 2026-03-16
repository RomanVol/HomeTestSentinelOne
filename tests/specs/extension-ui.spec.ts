import { getGenAiApplicationByKey } from '../data/genai-applications';
import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security extension popup UI', () => {
  test('renders the popup UI and user information', async ({
    browserSession,
    extensionPopupPage,
    logger
  }) => {
    test.skip(
      !browserSession.extensionLoaded || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );
    const popupPage = extensionPopupPage!;

    await test.step('Open the popup and assert core UI controls', async () => {
      logger.info('Opening the popup to assert the visible UI controls');
      await popupPage.open();
      await popupPage.assertUiElements();
      await popupPage.assertUserEmail();
    });
  });

  test('downloads logs that prove the expected block behavior and clears them through the popup UI', async ({
    logger,
    browserSession,
    extensionPopupPage,
    extensionLogFileService,
    applicationPage,
    policyEvaluator,
    runtimeConfig
  }) => {
    test.skip(
      !browserSession.extensionLoaded || !browserSession.extensionId || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );
    const popupPage = extensionPopupPage!;
    const logApplication = getGenAiApplicationByKey(runtimeConfig.logTestApplicationKey);

    await test.step('Configure the popup connection and assert the UI controls', async () => {
      logger.info('Preparing the popup before exercising log export behavior', {
        application: logApplication.name
      });
      await popupPage.open();
      await popupPage.assertUiElements();
      await popupPage.configureConnection();
    });

    await test.step('Trigger policy behavior that should be captured in the exported logs', async () => {
      logger.info('Navigating to the configured log-test application', {
        application: logApplication.name,
        expectedPolicy: logApplication.expectedPolicy
      });
      await applicationPage.goto(logApplication);

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

    await test.step('Download the log file and assert the configured snippets are present', async () => {
      await extensionLogFileService.deleteExistingLogFile();
      await popupPage.downloadLogs();
      const logContents = await extensionLogFileService.waitForDownloadedLogContents();
      extensionLogFileService.assertContainsConfiguredEntries(logContents);
    });

    await test.step('Clear the logs, export them again, and assert the configured snippets are absent', async () => {
      await popupPage.clearLogs();
      await extensionLogFileService.deleteExistingLogFile();
      await popupPage.downloadLogs();
      const clearedLogContents = await extensionLogFileService.waitForDownloadedLogContents();
      extensionLogFileService.assertClearedEntriesAreAbsent(clearedLogContents);
    });
  });
});
