import { createBaseAdapter } from './base.js';

export const antigravityWorkflowsAdapter = createBaseAdapter({
  name: 'antigravity-cli-workflows',
  tool: 'antigravity-cli',
  subtype: 'workflows',
  configPath: ['antigravity-cli', 'workflows'],
  defaultSourceDir: '.agents/workflows',
  targetDir: '.agents/workflows',
  mode: 'file',
  fileSuffixes: ['.md'],
});