import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const antigravityWorkflowsAdapter = createBaseAdapter({
  name: 'antigravity-cli-workflows',
  tool: 'antigravity-cli',
  subtype: 'workflows',
  configPath: ['antigravity-cli', 'workflows'],
  defaultSourceDir: '.agents/workflows',
  targetDir: '.agents/workflows',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Workflow'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});