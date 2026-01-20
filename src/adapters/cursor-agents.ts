import { createBaseAdapter } from './base.js';

export const cursorAgentsAdapter = createBaseAdapter({
  name: 'cursor-agents',
  tool: 'cursor',
  subtype: 'agents',
  configPath: ['cursor', 'agents'],
  defaultSourceDir: '.cursor/agents',
  targetDir: '.cursor/agents',
  mode: 'directory',
});
