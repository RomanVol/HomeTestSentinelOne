# HomeTestSentinelOne

Playwright-based QA automation framework for validating Prompt Security browser-extension policy behavior against web-based GenAI applications.

## Scope

The framework validates the requested policy:

- `chatgpt.com` must be allowed
- `gemini.google.com` must be blocked
- the extension popup UI must remain functional
- the exported extension log file must contain configurable evidence that the policy behavior occurred

The project is built to be:

- configurable through environment variables
- CI-friendly
- cleanly separated between configuration, fixtures, page objects, services, and tests
- heavily logged and commented for readability

## Architecture

- `src/config` contains runtime configuration and Playwright project generation.
- `src/core` contains shared infrastructure such as logging.
- `src/models` contains shared data contracts.
- `tests/data` contains application policy definitions.
- `tests/fixtures` contains browser and extension lifecycle management.
- `tests/page-objects` contains browser-extension and website abstractions.
- `tests/services` contains policy assertion logic.
- `tests/specs` contains the actual test scenarios.

## Browser Support

The framework is parameterized for:

- Chrome
- Microsoft Edge
- Firefox
- Safari/WebKit

Important limitation:

- Unpacked Chrome extensions can be automated only in Chromium-based browsers.
- Firefox and Safari projects are included so the pipeline and local runs can execute a full browser matrix, but the actual extension validation tests will skip unless a compatible browser-specific extension artifact is supplied.

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Copy `.env.example` to `.env` if you want local overrides.

3. Run the default Chrome policy suite:

```bash
npm test
```

4. Run all configured browser projects:

```bash
npm run test:all-browsers
```

## Default Local Extension Path

The default local unpacked extension path is:

`/Users/roma/Library/Application Support/Google/Chrome/Default/Extensions/iidnankcocecmgpcafggbgbmkbcldmno/7.0.40_0`

Override it with environment variables when needed.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `HOME_TEST_EXTENSION_MODE` | `unpacked`, `profile`, or `disabled` | `unpacked` |
| `HOME_TEST_EXTENSION_PATH` | Unpacked extension folder path | local Prompt Security path |
| `HOME_TEST_EXTENSION_PROFILE_PATH` | Browser profile path for profile-based execution | empty |
| `HOME_TEST_EXTENSION_ID` | Extension id | `iidnankcocecmgpcafggbgbmkbcldmno` |
| `HOME_TEST_EXTENSION_POPUP_PATH` | Popup route inside the extension | `html/popup.html` |
| `HOME_TEST_CHROME_CHANNEL` | Browser channel for the Chrome project | `chrome` |
| `HOME_TEST_EDGE_CHANNEL` | Browser channel for the Edge project | `msedge` |
| `HOME_TEST_API_DOMAIN` | Prompt Security API domain | `eu.prompt.security` |
| `HOME_TEST_API_KEY` | Prompt Security API key | provided home-test key |
| `HOME_TEST_EXPECTED_USER_EMAIL` | Expected user email shown in the popup | `romavolman@gmail.com` |
| `HOME_TEST_TARGET_BROWSERS` | Comma-separated Playwright projects | `chrome-extension` |
| `HOME_TEST_BLOCK_TEXTS` | Comma-separated blocked-page text hints | `Access Denied,blocked by your administrator` |
| `HOME_TEST_LOG_DOWNLOAD_DIR` | Browser download directory used for exported logs | `~/Downloads` |
| `HOME_TEST_LOG_FILE_NAME` | Exported log filename | `prompt_security_extension_debug_logs.txt` |
| `HOME_TEST_LOG_ASSERTIONS` | Comma-separated snippets that must exist in the downloaded log file | `gemini.google.com,Blocking access to domain gemini.google.com` |
| `HOME_TEST_CLEARED_LOG_ASSERTIONS` | Comma-separated snippets that must disappear after clearing logs | same as `HOME_TEST_LOG_ASSERTIONS` |
| `HOME_TEST_LOG_TEST_APPLICATION_KEY` | GenAI application key used to generate the log evidence | `gemini` |
| `HOME_TEST_NAVIGATION_TIMEOUT_MS` | Navigation timeout | `30000` |
| `HOME_TEST_ASSERTION_TIMEOUT_MS` | Poll/assertion timeout | `20000` |

## Scripts

- `npm test` runs the default Chrome-extension project.
- `npm run test:headed` runs the default project in headed mode.
- `npm run test:all-browsers` runs the configured browser matrix.
- `npm run test:chrome` runs only the Chrome-extension project.
- `npm run test:edge` runs only the Edge-extension project.
- `npm run typecheck` runs TypeScript checks.

## UI And Log Coverage

The popup UI suite in [extension-ui.spec.ts](/Users/roma/PlaywrightExtention/tests/specs/extension-ui.spec.ts):

- validates the popup fields and buttons by their real DOM ids
- validates the displayed user email
- triggers a policy event on a configurable application
- exports the extension logs through the popup UI
- validates the downloaded file contents using configurable expected snippets
- clears the logs through the popup UI and verifies the same snippets are no longer present in the next export

## CI

GitHub Actions is configured in `.github/workflows/ci.yml`.

The workflow:

- installs Node dependencies
- installs Playwright browsers
- runs the test suite with the line reporter
- prints the test output directly in the workflow logs

To make the CI run the real extension tests, provide a valid extension artifact path on the runner and set:

- `HOME_TEST_EXTENSION_MODE`
- `HOME_TEST_EXTENSION_PATH`
- optionally `HOME_TEST_TARGET_BROWSERS`

## Notes

- The framework automates the extension popup and fills the API domain and key.
- If the extension artifact is missing or the selected browser cannot load the configured artifact, the tests skip with a clear reason instead of failing with an obscure infrastructure error.
- Screenshots, traces, and videos are retained on failure to help debug policy mismatches.
