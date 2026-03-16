import { genAiApplications } from '../data/genai-applications';
import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security network-level policy enforcement', () => {
  for (const application of genAiApplications) {
    test(`enforces ${application.expectedPolicy.toUpperCase()} ${application.name} at the navigation/request level`, async ({
      logger,
      browserSession,
      extensionPopupPage,
      applicationPage,
      networkPolicyObserver
    }) => {
      test.skip(
        !browserSession.extensionLoaded || !browserSession.extensionId,
        browserSession.extensionSkipReason ?? 'The extension could not be loaded for this project.'
      );

      const popupPage = extensionPopupPage!;

      await test.step('Configure the extension popup', async () => {
        logger.info('Configuring the popup before network-level assertions', {
          application: application.name
        });
        await popupPage.open();
        await popupPage.configureConnection();
      });

      await test.step('Reset observed network traffic', async () => {
        networkPolicyObserver.reset();
      });

      await test.step(`Navigate to ${application.name} and capture the network behavior`, async () => {
        await applicationPage.goto(application);
      });

      await test.step('Assert the expected network outcome', async () => {
        if (application.expectedPolicy === 'allow') {
          await networkPolicyObserver.assertAllowedNavigation(application);
          return;
        }

        await networkPolicyObserver.assertBlockedNavigation(
          application,
          browserSession.extensionId!
        );
      });
    });
  }
});

