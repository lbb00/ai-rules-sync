import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const junieCommandsAdapter = createBaseAdapter({
  name: 'junie-commands',
  tool: 'junie',
  subtype: 'commands',
  configPath: ['junie', 'commands'],
  defaultSourceDir: '.junie/commands',
  targetDir: '.junie/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});