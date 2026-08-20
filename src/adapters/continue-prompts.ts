import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const continuePromptsAdapter = createBaseAdapter({
  name: 'continue-prompts',
  tool: 'continue',
  subtype: 'prompts',
  configPath: ['continue', 'prompts'],
  defaultSourceDir: '.continue/prompts',
  targetDir: '.continue/prompts',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Prompt'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});