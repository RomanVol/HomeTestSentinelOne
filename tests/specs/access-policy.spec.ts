import { genAiApplications } from '../data/genai-applications';
import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security browser UI access policy enforcement', () => {
  for (const application of genAiApplications) {
    test(`${application.expectedPolicy.toUpperCase()} ${application.name}`, async ({
      logger,
      browserSession,
      extensionManagementPage,
      extensionPopupPage,
      applicationPage,
      policyEvaluator,
      runtimeConfig,
      extensionLogFileService
    }, testInfo) => {
      test.skip(
        !browserSession.extensionLoaded || !browserSession.extensionId,
        browserSession.extensionSkipReason ?? 'The extension could not be loaded for this project.'
      );

      if (extensionManagementPage) {
        await test.step('Ensure extension-management preconditions', async () => {
          logger.info('Ensuring Chrome extension-management settings before policy assertions', {
            application: application.name
          });
          await extensionManagementPage.ensureQaPreconditions();
        });
      }

      if (extensionPopupPage) {
        await test.step('Configure the extension popup', async () => {
          logger.info('Starting popup configuration step', { application: application.name });
          await extensionPopupPage.open();
          await extensionPopupPage.configureConnection();
        });
      }

      if (extensionPopupPage && application.key === runtimeConfig.logTestApplicationKey) {
        await test.step('Clear extension logs before collecting policy evidence', async () => {
          logger.info('Clearing extension logs before the policy assertion that will validate log evidence', {
            application: application.name
          });
          await extensionPopupPage.clearLogs();
        });
      }

      await test.step(`Navigate to ${application.name}`, async () => {
        logger.info('Starting application navigation step', {
          application: application.name,
          expectedPolicy: application.expectedPolicy
        });
        await applicationPage.goto(application);
      });

      await test.step(`Assert ${application.expectedPolicy} policy`, async () => {
        logger.info('Starting policy assertion step', {
          application: application.name,
          expectedPolicy: application.expectedPolicy
        });

        if (application.expectedPolicy === 'allow') {
          await policyEvaluator.assertAllowed(
            applicationPage.getPage(),
            application,
            browserSession.extensionId!
          );
          return;
        }

        await policyEvaluator.assertBlocked(
          applicationPage.getPage(),
          application,
          browserSession.extensionId!
        );
      });

      if (extensionPopupPage && application.key === runtimeConfig.logTestApplicationKey) {
        await test.step('Read storage logs as supporting policy evidence', async () => {
          const logContents = await extensionPopupPage.readDebugLogsFromStorage();
          const persistedLogPath = await extensionLogFileService.persistLogContents(
            logContents,
            `${testInfo.project.name}-${application.key}-policy-evidence`
          );

          logger.info('Persisted extension storage logs after policy validation', {
            application: application.name,
            persistedLogPath
          });

          extensionLogFileService.assertContainsConfiguredEntries(logContents);
        });
      }

      await test.step('Log completed application policy check', async () => {
        logger.info('Completed application policy check', {
          application: application.name,
          browserFlavor: browserSession.browserFlavor,
          apiDomain: runtimeConfig.apiDomain
        });
      });
    });
  }
});
