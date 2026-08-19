import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const augmentAgentsAdapter = createBaseAdapter({
  name: 'augment-agents',
  tool: 'augment',
  subtype: 'agents',
  configPath: ['augment', 'agents'],
  defaultSourceDir: '.augment/agents',
  targetDir: '.augment/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});