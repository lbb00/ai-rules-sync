import { createBaseAdapter } from './base.js';

export const junieRulesAdapter = createBaseAdapter({
  name: 'junie-rules',
  tool: 'junie',
  subtype: 'rules',
  configPath: ['junie', 'rules'],
  defaultSourceDir: '.junie/rules',
  targetDir: '.junie/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
});