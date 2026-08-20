import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const kiroRulesAdapter = createBaseAdapter({
  name: 'kiro-rules',
  tool: 'kiro',
  subtype: 'rules',
  configPath: ['kiro', 'rules'],
  defaultSourceDir: '.kiro/steering',
  targetDir: '.kiro/steering',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});