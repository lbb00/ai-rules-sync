import { createBaseAdapter } from './base.js';

export const qwenCommandsAdapter = createBaseAdapter({
  name: 'qwen-commands',
  tool: 'qwen',
  subtype: 'commands',
  configPath: ['qwen', 'commands'],
  defaultSourceDir: '.qwen/commands',
  targetDir: '.qwen/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
});