import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security extension popup UI', () => {
  test('renders the popup UI', async ({
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
    });
  });
});
