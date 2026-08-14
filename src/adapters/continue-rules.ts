import { createBaseAdapter } from './base.js';

export const continueRulesAdapter = createBaseAdapter({
  name: 'continue-rules',
  tool: 'continue',
  subtype: 'rules',
  configPath: ['continue', 'rules'],
  defaultSourceDir: '.continue/rules',
  targetDir: '.continue/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
});