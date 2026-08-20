import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const junieAgentsAdapter = createBaseAdapter({
  name: 'junie-agents',
  tool: 'junie',
  subtype: 'agents',
  configPath: ['junie', 'agents'],
  defaultSourceDir: '.junie/agents',
  targetDir: '.junie/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});