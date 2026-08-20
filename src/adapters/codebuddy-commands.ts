import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const codebuddyCommandsAdapter = createBaseAdapter({
  name: 'codebuddy-commands',
  tool: 'codebuddy',
  subtype: 'commands',
  configPath: ['codebuddy', 'commands'],
  defaultSourceDir: '.codebuddy/commands',
  targetDir: '.codebuddy/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});