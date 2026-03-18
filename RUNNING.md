# Running The Tests

This file gives the shortest path to install and run the project locally and explains how the suite runs in CI.

## Local

1. Install dependencies:

```bash
npm ci
```

2. Create local configuration:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` if you need to change values such as:

- `HOME_TEST_API_DOMAIN`
- `HOME_TEST_API_KEY`
- `HOME_TEST_EXTENSION_SOURCE`
- `HOME_TEST_EXTENSION_PATH`

4. Run the default suite:

```bash
npm test
```

Useful alternatives:

```bash
npm run test:ci
```

```bash
npm run test:headed
```

What local runs use:

- `.env.local` when it exists
- otherwise the built-in defaults from [runtime-config.ts](/Users/roma/PlaywrightExtention/src/config/runtime-config.ts)

Unless you override the extension source, local runs load the unpacked extension from:

- [Prompt-Security-Browser-Extension](/Users/roma/PlaywrightExtention/Prompt-Security-Browser-Extension)

## CI

GitHub Actions runs the suite from [.github/workflows/ci.yml](/Users/roma/PlaywrightExtention/.github/workflows/ci.yml).

CI flow:

1. Check out the repository.
2. Install dependencies with `npm ci`.
3. Install Playwright browsers.
4. Run the suite with `npm run test:ci`.
5. Print the Playwright suite output directly in the workflow logs.

What CI uses:

- GitHub Actions provides `CI=true`
- `.env.local` is not loaded
- the framework uses workflow environment variables if they are provided
- otherwise it falls back to the built-in defaults from [runtime-config.ts](/Users/roma/PlaywrightExtention/src/config/runtime-config.ts)

Unless the workflow overrides the extension source or path, CI loads the unpacked extension from:

- [Prompt-Security-Browser-Extension](/Users/roma/PlaywrightExtention/Prompt-Security-Browser-Extension)

## Requirement-Oriented Run

To run the assignment coverage described in [REQUIREMENTS.md](/Users/roma/PlaywrightExtention/REQUIREMENTS.md):

```bash
npm test
```

That executes the default `chrome-extension` Playwright project and runs the specs under [tests/specs](/Users/roma/PlaywrightExtention/tests/specs).
