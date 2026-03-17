import type { GenAiApplicationDefinition } from '../../src/models/access-policy';

/**
 * Defines the policy expectations that the home test requires, including additional blocked
 * web GenAI applications to cover the "others like gemini.google.com" wording.
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
  },
  {
    key: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/',
    expectedPolicy: 'block',
    expectedHost: 'claude.ai'
  },
  {
    key: 'perplexity',
    name: 'Perplexity',
    url: 'https://www.perplexity.ai/',
    expectedPolicy: 'block',
    expectedHost: 'www.perplexity.ai'
  },
  {
    key: 'copilot',
    name: 'Microsoft Copilot',
    url: 'https://copilot.microsoft.com/',
    expectedPolicy: 'block',
    expectedHost: 'copilot.microsoft.com'
  }
] as const;
