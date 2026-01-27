import { createBaseAdapter } from './base.js';

export const opencodeCustomToolsAdapter = createBaseAdapter({
  name: 'opencode-custom-tools',
  tool: 'opencode',
  subtype: 'custom-tools',
  configPath: ['opencode', 'custom-tools'],
  defaultSourceDir: '.opencode/custom-tools',
  targetDir: '.opencode/custom-tools',
  mode: 'directory',
});
