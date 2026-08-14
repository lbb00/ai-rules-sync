import { createBaseAdapter } from './base.js';

export const kiroRulesAdapter = createBaseAdapter({
  name: 'kiro-rules',
  tool: 'kiro',
  subtype: 'rules',
  configPath: ['kiro', 'rules'],
  defaultSourceDir: '.kiro/steering',
  targetDir: '.kiro/steering',
  mode: 'file',
  fileSuffixes: ['.md'],
});