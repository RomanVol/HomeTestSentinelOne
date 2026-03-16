# HomeTestSentinelOne

Playwright-based QA automation framework for validating Prompt Security browser-extension policy behavior against web-based GenAI applications.

## Scope

The framework validates the requested policy:

- `chatgpt.com` must be allowed
- `gemini.google.com` must be blocked
- the extension popup UI must remain functional
- the exported extension log file must contain configurable evidence that the policy behavior occurred
- the network/navigation layer must show that blocked applications do not progress into active application traffic

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

## Test Levels

The suite is intentionally split into different validation levels:

- `access-policy.spec.ts`
  Browser UI level. Verifies that allowed applications stay accessible and blocked applications are replaced by the extension block experience in the browser.
- `extension-ui.spec.ts`
  Extension popup UI level. Verifies the popup fields, buttons, and user identity rendering.
- `extension-log-export.spec.ts`
  Exported-log level. Verifies that the popup can trigger log export, that `chrome.storage.local.debugLogs` contains configurable evidence of the policy decision, and that clearing logs removes that evidence from the next export.
- `network-policy.spec.ts`
  Network/navigation level. Verifies that allowed applications complete successful top-level navigation while blocked applications are intercepted before they progress into active application traffic.

## Browser Support

The framework is parameterized for:

- Chrome
- Microsoft Edge
- Firefox
- Safari/WebKit

Important limitation:

- Unpacked Chrome extensions can be automated only in Chromium-based browsers.
- For unpacked extension automation, the recommended Playwright channel is `chromium`, not branded `chrome`.
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

Run against the Chrome-installed extension:

```bash
HOME_TEST_EXTENSION_SOURCE=chrome-installed npm test
```

Run against a custom unpacked folder:

```bash
HOME_TEST_EXTENSION_SOURCE=custom HOME_TEST_EXTENSION_PATH="/absolute/path/to/unpacked-extension" npm test
```

4. Run all configured browser projects:

```bash
npm run test:all-browsers
```

## Default Local Extension Sources

The framework supports three unpacked extension sources:

- `project-local`
  [Prompt-Security-Browser-Extension](/Users/roma/PlaywrightExtention/Prompt-Security-Browser-Extension)
- `chrome-installed`
  `/Users/roma/Library/Application Support/Google/Chrome/Default/Extensions/iidnankcocecmgpcafggbgbmkbcldmno/7.0.40_0`
- `custom`
  any unpacked folder you pass through `HOME_TEST_EXTENSION_PATH`

The default source is `project-local`.

## Environment Variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `HOME_TEST_EXTENSION_MODE` | `unpacked`, `profile`, or `disabled` | `unpacked` |
| `HOME_TEST_EXTENSION_SOURCE` | Unpacked extension source preset: `project-local`, `chrome-installed`, or `custom` | `project-local` |
| `HOME_TEST_PROJECT_LOCAL_EXTENSION_PATH` | Project-root unpacked extension folder | `Prompt-Security-Browser-Extension` |
| `HOME_TEST_CHROME_INSTALLED_EXTENSION_PATH` | Chrome-profile extension folder | local Chrome extension path |
| `HOME_TEST_EXTENSION_PATH` | Custom unpacked extension folder used when `HOME_TEST_EXTENSION_SOURCE=custom` | project-local extension path |
| `HOME_TEST_EXTENSION_PROFILE_PATH` | Browser profile path for profile-based execution | empty |
| `HOME_TEST_EXTENSION_ID` | Extension id | `iidnankcocecmgpcafggbgbmkbcldmno` |
| `HOME_TEST_EXTENSION_POPUP_PATH` | Popup route inside the extension | `html/popup.html` |
| `HOME_TEST_CHROME_CHANNEL` | Browser channel for the Chrome project | `chromium` |
| `HOME_TEST_EDGE_CHANNEL` | Browser channel for the Edge project | `msedge` |
| `HOME_TEST_API_DOMAIN` | Prompt Security API domain | `eu.prompt.security` |
| `HOME_TEST_API_KEY` | Prompt Security API key | provided home-test key |
| `HOME_TEST_TARGET_BROWSERS` | Comma-separated Playwright projects | `chrome-extension` |
| `HOME_TEST_BLOCK_TEXTS` | Comma-separated blocked-page text hints | `Access Denied,blocked by your administrator` |
| `HOME_TEST_LOG_DOWNLOAD_DIR` | Browser download directory used for exported logs | `~/Downloads` |
| `HOME_TEST_LOG_FILE_NAME` | Exported log filename | `prompt_security_extension_debug_logs.txt` |
| `HOME_TEST_PERSISTED_LOG_DIR` | Project-local directory where storage logs are persisted after tests | `test-results/extension-logs` |
| `HOME_TEST_LOG_ASSERTIONS` | Comma-separated snippets that must exist in the extension logs | `gemini.google.com,Blocking access to domain gemini.google.com` |
| `HOME_TEST_CLEARED_LOG_ASSERTIONS` | Comma-separated snippets that must disappear after clearing logs | same as `HOME_TEST_LOG_ASSERTIONS` |
| `HOME_TEST_FAILURE_LOG_PATTERNS` | Comma-separated patterns used to extract relevant error lines from extension logs after a failure | ` 500,[ERROR],failed,Explore api failed` |
| `HOME_TEST_LOG_TEST_APPLICATION_KEY` | GenAI application key used to generate the log evidence | `gemini` |
| `HOME_TEST_LOG_TEST_PROMPT` | Prompt text the log-export test attempts to submit before collecting logs | a default security-focused prompt |
| `HOME_TEST_DEBUG_PROMPT_VISIBILITY` | When `true`, pauses before prompt submission and captures before/after screenshots | `false` |
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

The log-export suite in [extension-log-export.spec.ts](/Users/roma/PlaywrightExtention/tests/specs/extension-log-export.spec.ts):

- triggers a policy event on a configurable application
- attempts to type and submit a configurable prompt before collecting logs
- can pause before prompt submission and capture before/after screenshots when debug prompt visibility is enabled
- triggers the popup `Download Logs` UI action
- reads `chrome.storage.local.debugLogs` as the reliable source of truth
- persists those logs under `test-results/extension-logs`
- validates the log contents using configurable expected snippets
- clears the logs through the popup UI and verifies the same snippets are no longer present afterward

The network suite in [network-policy.spec.ts](/Users/roma/PlaywrightExtention/tests/specs/network-policy.spec.ts):

- records top-level requests and responses
- verifies successful document navigation for allowed applications
- verifies that blocked applications are redirected to the extension overlay before active application traffic continues

## CI

GitHub Actions is configured in `.github/workflows/ci.yml`.

The workflow:

- installs Node dependencies
- installs Playwright browsers
- runs the test suite with the line reporter
- prints the test output directly in the workflow logs

By default, the workflow uses the project-local static extension folder:

- [Prompt-Security-Browser-Extension](/Users/roma/PlaywrightExtention/Prompt-Security-Browser-Extension)

So to make CI work, you should:

1. Commit the unpacked extension folder into the repository.
2. Commit `.github/workflows/ci.yml`.
3. Push to `main`.
4. Open the `Actions` tab in GitHub.
5. Open the latest workflow run and read the printed Playwright output in the `Run policy suite` step.

To make the CI run the real extension tests, provide a valid extension artifact path on the runner and set:

- `HOME_TEST_EXTENSION_MODE`
- `HOME_TEST_EXTENSION_SOURCE`
- `HOME_TEST_PROJECT_LOCAL_EXTENSION_PATH`
- or `HOME_TEST_EXTENSION_PATH` when using `custom`
- `HOME_TEST_EXTENSION_PATH`
- optionally `HOME_TEST_TARGET_BROWSERS`

## Notes

- The framework automates the extension popup and fills the API domain and key.
- For this extension, the actual file download behind `Download Logs` depends on the active website tab. The framework therefore uses `chrome.storage.local.debugLogs` as the primary assertion source and persists those logs to project files for later inspection.
- If the extension artifact is missing or the selected browser cannot load the configured artifact, the tests skip with a clear reason instead of failing with an obscure infrastructure error.
- Screenshots, traces, and videos are retained on failure to help debug policy mismatches.
