# HomeTestSentinelOne

Playwright-based QA automation framework for validating Prompt Security browser-extension policy behavior against web-based GenAI applications.

## Scope

The framework validates the requested policy:

- `chatgpt.com` must be allowed
- `gemini.google.com` must be blocked
- additional representative web GenAI applications such as `claude.ai`, `www.perplexity.ai`, and `copilot.microsoft.com` are also treated as blocked coverage to satisfy the requirement wording "others like gemini.google.com"
- the extension popup UI must remain functional
- the persisted extension storage logs must contain configurable evidence that the policy behavior occurred
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
  Browser UI level. Verifies that allowed applications stay accessible and blocked applications are replaced by the extension block experience in the browser across the configured policy matrix.
- `extension-ui.spec.ts`
  Extension popup UI level. Verifies the popup fields, buttons, and user identity rendering.
- `extension-config-negative.spec.ts`
  Negative popup-config level. Verifies that invalid or blank popup configuration values fail cleanly without crashing the extension UI.
- `extension-host-access-behavior.spec.ts`
  Chrome host-access behavior level. Verifies that blocked applications remain blocked under `ON_ALL_SITES` and under `ON_SPECIFIC_SITES` when the blocked site is explicitly listed.
- `network-policy.spec.ts`
  Network/navigation level. Verifies that allowed applications complete successful top-level navigation while blocked applications are intercepted before they progress into active application traffic.

The default policy matrix in [genai-applications.ts](/Users/roma/PlaywrightExtention/tests/data/genai-applications.ts) includes one explicit allow case and several representative blocked web GenAI applications so the framework covers the assignment's "others like" wording instead of validating Gemini alone.

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
| `HOME_TEST_PERSISTED_LOG_DIR` | Project-local directory where storage logs are persisted after tests | `test-results/extension-logs` |
| `HOME_TEST_LOG_ASSERTIONS` | Comma-separated snippets that must exist in the extension logs | `gemini.google.com,Blocking access to domain gemini.google.com` |
| `HOME_TEST_FAILURE_LOG_PATTERNS` | Comma-separated patterns used to extract relevant error lines from extension logs after a failure | ` 500,[ERROR],failed,Explore api failed` |
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

The negative popup-config suite in [extension-config-negative.spec.ts](/Users/roma/PlaywrightExtention/tests/specs/extension-config-negative.spec.ts):

- saves an invalid API domain and expects the popup to report a connection failure
- saves an invalid API key and expects the popup to report a connection failure
- saves blank configuration values and expects the popup to report a connection failure
- verifies repeated log-clearing remains stable when storage is empty
- verifies the popup remains usable across repeated invalid configuration attempts

The host-access behavior suite in [extension-host-access-behavior.spec.ts](/Users/roma/PlaywrightExtention/tests/specs/extension-host-access-behavior.spec.ts):

- verifies each blocked application is blocked when host access is set to `ON_ALL_SITES`
- verifies each blocked application is blocked when host access is `ON_SPECIFIC_SITES` and that application is explicitly added

The browser UI suite in [access-policy.spec.ts](/Users/roma/PlaywrightExtention/tests/specs/access-policy.spec.ts):

- validates the allow/block outcome in the page itself
- clears storage logs before the configured log-validation application runs
- reads `chrome.storage.local.debugLogs` as the reliable source of truth
- persists those logs under `test-results/extension-logs`
- validates the configured expected snippets inside the same policy test

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
- The framework also opens the Chrome extension-details page only to enforce required preconditions such as `hostAccess = ON_ALL_SITES` before policy-oriented tests run.
- For this extension, the actual file download behind `Download Logs` depends on the active website tab. The framework therefore uses `chrome.storage.local.debugLogs` as the primary assertion source and persists those logs to project files for later inspection.
- If the extension artifact is missing or the selected browser cannot load the configured artifact, the tests skip with a clear reason instead of failing with an obscure infrastructure error.
- Screenshots, traces, and videos are retained on failure to help debug policy mismatches.
