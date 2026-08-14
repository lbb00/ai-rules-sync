import { createBaseAdapter } from './base.js';

export const kimiAgentsAdapter = createBaseAdapter({
  name: 'kimi-agents',
  tool: 'kimi',
  subtype: 'agents',
  configPath: ['kimi', 'agents'],
  defaultSourceDir: '.kimi-code/agents',
  targetDir: '.kimi-code/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
});