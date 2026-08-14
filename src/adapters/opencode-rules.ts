import { createBaseAdapter } from './base.js';

export const opencodeRulesAdapter = createBaseAdapter({
  name: 'opencode-rules',
  tool: 'opencode',
  subtype: 'rules',
  configPath: ['opencode', 'rules'],
  defaultSourceDir: '.opencode/rules',
  targetDir: '.opencode/rules',
  userTargetDir: '.config/opencode/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
});