import { createBaseAdapter } from './base.js';

export const codebuddyRulesAdapter = createBaseAdapter({
  name: 'codebuddy-rules',
  tool: 'codebuddy',
  subtype: 'rules',
  configPath: ['codebuddy', 'rules'],
  defaultSourceDir: '.codebuddy/rules',
  targetDir: '.codebuddy/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
});