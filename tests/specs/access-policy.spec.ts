import { genAiApplications } from '../data/genai-applications';
import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security browser UI access policy enforcement', () => {
  for (const application of genAiApplications) {
    test(`${application.expectedPolicy.toUpperCase()} ${application.name}`, async ({
      logger,
      browserSession,
      extensionPopupPage,
      applicationPage,
      policyEvaluator,
      runtimeConfig
    }) => {
      test.skip(
        !browserSession.extensionLoaded || !browserSession.extensionId,
        browserSession.extensionSkipReason ?? 'The extension could not be loaded for this project.'
      );

      if (extensionPopupPage) {
        await test.step('Configure the extension popup', async () => {
          logger.info('Starting popup configuration step', { application: application.name });
          await extensionPopupPage.open();
          await extensionPopupPage.configureConnection();
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
