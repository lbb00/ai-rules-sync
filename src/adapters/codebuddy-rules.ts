import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const codebuddyRulesAdapter = createBaseAdapter({
  name: 'codebuddy-rules',
  tool: 'codebuddy',
  subtype: 'rules',
  configPath: ['codebuddy', 'rules'],
  defaultSourceDir: '.codebuddy/rules',
  targetDir: '.codebuddy/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});