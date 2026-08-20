import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const qwenAgentsAdapter = createBaseAdapter({
  name: 'qwen-agents',
  tool: 'qwen',
  subtype: 'agents',
  configPath: ['qwen', 'agents'],
  defaultSourceDir: '.qwen/agents',
  targetDir: '.qwen/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});