import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security extension popup UI', () => {
  test('renders the popup UI', async ({
    browserSession,
    extensionManagementPage,
    extensionPopupPage,
    logger
  }) => {
    test.skip(
      !browserSession.extensionLoaded || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );
    const popupPage = extensionPopupPage!;

    if (extensionManagementPage) {
      await test.step('Ensure extension-management preconditions', async () => {
        logger.info('Ensuring Chrome extension-management settings before popup UI assertions');
        await extensionManagementPage.ensureQaPreconditions();
      });
    }

    await test.step('Open the popup and assert core UI controls', async () => {
      logger.info('Opening the popup to assert the visible UI controls');
      await popupPage.open();
      await popupPage.assertUiElements();
    });
  });
});
