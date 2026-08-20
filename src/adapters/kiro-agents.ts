import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const kiroAgentsAdapter = createBaseAdapter({
  name: 'kiro-agents',
  tool: 'kiro',
  subtype: 'agents',
  configPath: ['kiro', 'agents'],
  defaultSourceDir: '.kiro/agents',
  targetDir: '.kiro/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});