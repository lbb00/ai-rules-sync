import { createBaseAdapter } from './base.js';

export const kiloAgentsAdapter = createBaseAdapter({
  name: 'kilo-agents',
  tool: 'kilo',
  subtype: 'agents',
  configPath: ['kilo', 'agents'],
  defaultSourceDir: '.kilo/agents',
  targetDir: '.kilo/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
});