import { createBaseAdapter } from './base.js';

export const factorydroidCommandsAdapter = createBaseAdapter({
  name: 'factorydroid-commands',
  tool: 'factorydroid',
  subtype: 'commands',
  configPath: ['factorydroid', 'commands'],
  defaultSourceDir: '.factory/commands',
  targetDir: '.factory/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
});