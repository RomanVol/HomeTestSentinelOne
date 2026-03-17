import { expect } from '@playwright/test';
import { test } from '../fixtures/extension-fixture';

test.describe('Prompt Security popup negative configuration handling', () => {
  test('reports a failure and preserves the attempted values when the API domain is invalid', async ({
    browserSession,
    extensionManagementPage,
    extensionPopupPage,
    runtimeConfig,
    logger
  }) => {
    test.skip(
      !browserSession.extensionLoaded || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );

    const popupPage = extensionPopupPage!;
    const invalidApiDomain = 'invalid.prompt.security.invalid';

    if (extensionManagementPage) {
      await test.step('Ensure extension-management preconditions', async () => {
        logger.info('Ensuring Chrome extension-management settings before invalid API-domain coverage');
        await extensionManagementPage.ensureQaPreconditions();
      });
    }

    await test.step('Open the popup before testing invalid API-domain handling', async () => {
      logger.info('Opening the popup for invalid API-domain coverage');
      await popupPage.open();
    });

    await test.step('Save an invalid API domain and assert the popup reports the failure cleanly', async () => {
      const dialogMessage = await popupPage.configureConnectionExpectingFailure(
        invalidApiDomain,
        runtimeConfig.apiKey
      );

      expect(dialogMessage).toBe('Failed to connect to server');

      const storedValues = await popupPage.readStoredConnectionValues();
      expect(storedValues).toMatchObject({
        apiDomain: invalidApiDomain,
        apiKey: runtimeConfig.apiKey
      });
    });
  });

  test('reports a failure and preserves the attempted values when the API key is invalid', async ({
    browserSession,
    extensionManagementPage,
    extensionPopupPage,
    runtimeConfig,
    logger
  }) => {
    test.skip(
      !browserSession.extensionLoaded || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );

    const popupPage = extensionPopupPage!;
    const invalidApiKey = 'invalid-api-key';

    if (extensionManagementPage) {
      await test.step('Ensure extension-management preconditions', async () => {
        logger.info('Ensuring Chrome extension-management settings before invalid API-key coverage');
        await extensionManagementPage.ensureQaPreconditions();
      });
    }

    await test.step('Open the popup before testing invalid API-key handling', async () => {
      logger.info('Opening the popup for invalid API-key coverage');
      await popupPage.open();
    });

    await test.step('Save an invalid API key and assert the popup reports the failure cleanly', async () => {
      const dialogMessage = await popupPage.configureConnectionExpectingFailure(
        runtimeConfig.apiDomain,
        invalidApiKey
      );

      expect(dialogMessage).toBe('Failed to connect to server');

      const storedValues = await popupPage.readStoredConnectionValues();
      expect(storedValues).toMatchObject({
        apiDomain: runtimeConfig.apiDomain,
        apiKey: invalidApiKey
      });
    });
  });

  test('reports a failure for blank configuration values and keeps log actions stable while storage is empty', async ({
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
        logger.info('Ensuring Chrome extension-management settings before blank-configuration coverage');
        await extensionManagementPage.ensureQaPreconditions();
      });
    }

    await test.step('Open the popup before testing blank configuration handling', async () => {
      logger.info('Opening the popup for blank-configuration coverage');
      await popupPage.open();
    });

    await test.step('Save blank configuration values and assert the popup reports the failure cleanly', async () => {
      const dialogMessage = await popupPage.configureConnectionExpectingFailure('', '');
      expect(dialogMessage).toBe('Failed to connect to server');

      const storedValues = await popupPage.readStoredConnectionValues();
      expect(storedValues).toMatchObject({
        apiDomain: '',
        apiKey: ''
      });
    });

    await test.step('Clear logs repeatedly and assert reading empty storage remains stable', async () => {
      await popupPage.clearLogs();
      await popupPage.clearLogs();

      const logContents = await popupPage.readDebugLogsFromStorage();
      expect(logContents).toBe('');
    });
  });

  test('stays usable across repeated invalid configuration attempts', async ({
    browserSession,
    extensionManagementPage,
    extensionPopupPage,
    runtimeConfig,
    logger
  }) => {
    test.skip(
      !browserSession.extensionLoaded || !extensionPopupPage,
      browserSession.extensionSkipReason ?? 'The extension popup is unavailable for this project.'
    );

    const popupPage = extensionPopupPage!;

    if (extensionManagementPage) {
      await test.step('Ensure extension-management preconditions', async () => {
        logger.info('Ensuring Chrome extension-management settings before repeated invalid-config coverage');
        await extensionManagementPage.ensureQaPreconditions();
      });
    }

    await test.step('Open the popup before repeated invalid saves', async () => {
      logger.info('Opening the popup for repeated invalid-configuration coverage');
      await popupPage.open();
    });

    await test.step('Fail with an invalid API domain first', async () => {
      const dialogMessage = await popupPage.configureConnectionExpectingFailure(
        'invalid.prompt.security.invalid',
        runtimeConfig.apiKey
      );
      expect(dialogMessage).toBe('Failed to connect to server');
    });

    await test.step('Fail again with an invalid API key and confirm the popup still accepts input', async () => {
      const dialogMessage = await popupPage.configureConnectionExpectingFailure(
        runtimeConfig.apiDomain,
        'invalid-api-key'
      );
      expect(dialogMessage).toBe('Failed to connect to server');

      const storedValues = await popupPage.readStoredConnectionValues();
      expect(storedValues).toMatchObject({
        apiDomain: runtimeConfig.apiDomain,
        apiKey: 'invalid-api-key'
      });
    });
  });
});
