import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const qwenRulesAdapter = createBaseAdapter({
  name: 'qwen-rules',
  tool: 'qwen',
  subtype: 'rules',
  configPath: ['qwen', 'rules'],
  defaultSourceDir: '.qwen/rules',
  targetDir: '.qwen/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});