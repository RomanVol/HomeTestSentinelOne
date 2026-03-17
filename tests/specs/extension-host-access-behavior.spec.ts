import { genAiApplications } from '../data/genai-applications';
import { test } from '../fixtures/extension-fixture';

const blockedApplications = genAiApplications.filter((application) => application.expectedPolicy === 'block');

function toSpecificSitePattern(applicationUrl: string): string {
  return `${new URL(applicationUrl).origin}/*`;
}

test.describe('Prompt Security host-access behavior', () => {
  for (const application of blockedApplications) {
    test(`blocks ${application.name} when host access is set to On all sites`, async ({
      browserSession,
      extensionManagementPage,
      extensionPopupPage,
      applicationPage,
      policyEvaluator,
      logger
    }) => {
      test.skip(
        !browserSession.extensionLoaded || !browserSession.extensionId || !extensionManagementPage || !extensionPopupPage,
        browserSession.extensionSkipReason ?? 'The extension management or popup page is unavailable for this project.'
      );

      const managementPage = extensionManagementPage!;
      const popupPage = extensionPopupPage!;

      await test.step('Restore host access to On all sites', async () => {
        logger.info('Setting host access to On all sites before navigating to the blocked application', {
          application: application.name
        });
        await managementPage.open();
        await managementPage.setHostAccess('ON_ALL_SITES');
      });

      await test.step('Configure the extension popup', async () => {
        logger.info('Configuring the popup after restoring host access to On all sites', {
          application: application.name
        });
        await popupPage.open();
        await popupPage.configureConnection();
      });

      await test.step(`Navigate to ${application.name} and assert the extension blocks it`, async () => {
        await applicationPage.goto(application);
        await policyEvaluator.assertBlocked(
          applicationPage.getPage(),
          application,
          browserSession.extensionId!
        );
      });
    });

    test(`blocks ${application.name} when host access is set to On specific sites and the site is listed`, async ({
      browserSession,
      extensionManagementPage,
      extensionPopupPage,
      applicationPage,
      policyEvaluator,
      logger
    }) => {
      test.skip(
        !browserSession.extensionLoaded || !browserSession.extensionId || !extensionManagementPage || !extensionPopupPage,
        browserSession.extensionSkipReason ?? 'The extension management or popup page is unavailable for this project.'
      );

      const managementPage = extensionManagementPage!;
      const popupPage = extensionPopupPage!;
      const specificSitePattern = toSpecificSitePattern(application.url);

      await test.step('Limit host access to the blocked application specifically', async () => {
        logger.info('Adding the blocked application to the specific-site host-access list', {
          application: application.name,
          specificSitePattern
        });
        await managementPage.open();
        await managementPage.openSpecificSitePopup();
        await managementPage.addSpecificSite(specificSitePattern);
      });

      await test.step('Configure the extension popup', async () => {
        logger.info('Configuring the popup after limiting host access to the blocked application', {
          application: application.name
        });
        await popupPage.open();
        await popupPage.configureConnection();
      });

      await test.step(`Navigate to ${application.name} and assert the extension blocks it`, async () => {
        await applicationPage.goto(application);
        await policyEvaluator.assertBlocked(
          applicationPage.getPage(),
          application,
          browserSession.extensionId!
        );
      });
    });
  }
});
