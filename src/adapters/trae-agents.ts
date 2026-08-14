import { createBaseAdapter } from './base.js';

export const traeAgentsAdapter = createBaseAdapter({
  name: 'trae-agents',
  tool: 'trae',
  subtype: 'agents',
  configPath: ['trae', 'agents'],
  defaultSourceDir: '.trae/agents',
  targetDir: '.trae/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
});