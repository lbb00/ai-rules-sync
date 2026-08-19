import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const traeAgentsAdapter = createBaseAdapter({
  name: 'trae-agents',
  tool: 'trae',
  subtype: 'agents',
  configPath: ['trae', 'agents'],
  defaultSourceDir: '.trae/agents',
  targetDir: '.trae/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});