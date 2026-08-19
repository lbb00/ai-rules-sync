import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const factorydroidAgentsAdapter = createBaseAdapter({
  name: 'factorydroid-agents',
  tool: 'factorydroid',
  subtype: 'agents',
  configPath: ['factorydroid', 'agents'],
  defaultSourceDir: '.factory/droids',
  targetDir: '.factory/droids',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});