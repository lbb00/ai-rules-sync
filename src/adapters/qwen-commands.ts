import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const qwenCommandsAdapter = createBaseAdapter({
  name: 'qwen-commands',
  tool: 'qwen',
  subtype: 'commands',
  configPath: ['qwen', 'commands'],
  defaultSourceDir: '.qwen/commands',
  targetDir: '.qwen/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});