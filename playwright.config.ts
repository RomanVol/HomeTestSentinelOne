import { defineConfig } from '@playwright/test';
import { createProjects, loadRuntimeConfig } from './src/config/runtime-config';

const runtimeConfig = loadRuntimeConfig();

export default defineConfig({
  testDir: './tests/specs',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['line'], ['html', { open: 'never' }]],
  timeout: runtimeConfig.assertionTimeoutMs + runtimeConfig.navigationTimeoutMs,
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: createProjects(runtimeConfig)
});

