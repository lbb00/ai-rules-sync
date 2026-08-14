import { createBaseAdapter } from './base.js';

export const qwenRulesAdapter = createBaseAdapter({
  name: 'qwen-rules',
  tool: 'qwen',
  subtype: 'rules',
  configPath: ['qwen', 'rules'],
  defaultSourceDir: '.qwen/rules',
  targetDir: '.qwen/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
});