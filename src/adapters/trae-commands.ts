import { createBaseAdapter } from './base.js';

export const traeCommandsAdapter = createBaseAdapter({
  name: 'trae-commands',
  tool: 'trae',
  subtype: 'commands',
  configPath: ['trae', 'commands'],
  defaultSourceDir: '.trae/commands',
  targetDir: '.trae/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
});