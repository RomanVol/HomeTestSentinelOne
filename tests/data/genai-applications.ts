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

