import type { GenAiApplicationDefinition } from '../../src/models/access-policy';

/**
 * Defines the policy expectations that the home test requires.
 */
export const genAiApplications: readonly GenAiApplicationDefinition[] = [
  {
    key: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    expectedPolicy: 'allow',
    expectedHost: 'chatgpt.com'
  },
  {
    key: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    expectedPolicy: 'block',
    expectedHost: 'gemini.google.com'
  }
] as const;

/**
 * Resolves an application definition by key so other tests can select a target dynamically.
 */
export function getGenAiApplicationByKey(key: string): GenAiApplicationDefinition {
  const application = genAiApplications.find((candidate) => candidate.key === key);

  if (!application) {
    throw new Error(`Unknown GenAI application key "${key}". Update HOME_TEST_LOG_TEST_APPLICATION_KEY or tests/data/genai-applications.ts.`);
  }

  return application;
}
