import { createBaseAdapter } from './base.js';

export const windsurfCommandsAdapter = createBaseAdapter({
  name: 'windsurf-commands',
  tool: 'windsurf',
  subtype: 'commands',
  configPath: ['windsurf', 'commands'],
  defaultSourceDir: '.windsurf/workflows',
  targetDir: '.windsurf/workflows',
  mode: 'file',
  fileSuffixes: ['.md'],
});