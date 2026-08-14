import { createBaseAdapter } from './base.js';

export const kiloCommandsAdapter = createBaseAdapter({
  name: 'kilo-commands',
  tool: 'kilo',
  subtype: 'commands',
  configPath: ['kilo', 'commands'],
  defaultSourceDir: '.kilo/commands',
  targetDir: '.kilo/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
});