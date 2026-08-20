import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const augmentCommandsAdapter = createBaseAdapter({
  name: 'augment-commands',
  tool: 'augment',
  subtype: 'commands',
  configPath: ['augment', 'commands'],
  defaultSourceDir: '.augment/commands',
  targetDir: '.augment/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});