import { createBaseAdapter } from './base.js';

export const opencodeCommandsAdapter = createBaseAdapter({
  name: 'opencode-commands',
  tool: 'opencode',
  subtype: 'commands',
  configPath: ['opencode', 'commands'],
  defaultSourceDir: '.opencode/commands',
  targetDir: '.opencode/commands',
  mode: 'directory',
});
