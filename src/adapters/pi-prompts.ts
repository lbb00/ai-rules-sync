import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const piPromptsAdapter = createBaseAdapter({
  name: 'pi-prompts',
  tool: 'pi',
  subtype: 'prompts',
  configPath: ['pi', 'prompts'],
  defaultSourceDir: '.pi/prompts',
  targetDir: '.pi/prompts',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Prompt'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});