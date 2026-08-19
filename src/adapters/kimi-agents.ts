import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const kimiAgentsAdapter = createBaseAdapter({
  name: 'kimi-agents',
  tool: 'kimi',
  subtype: 'agents',
  configPath: ['kimi', 'agents'],
  defaultSourceDir: '.kimi-code/agents',
  targetDir: '.kimi-code/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});