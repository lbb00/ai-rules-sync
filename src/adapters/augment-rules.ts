import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const augmentRulesAdapter = createBaseAdapter({
  name: 'augment-rules',
  tool: 'augment',
  subtype: 'rules',
  configPath: ['augment', 'rules'],
  defaultSourceDir: '.augment/rules',
  targetDir: '.augment/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});