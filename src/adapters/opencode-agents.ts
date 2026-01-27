import { createBaseAdapter } from './base.js';

export const opencodeAgentsAdapter = createBaseAdapter({
  name: 'opencode-agents',
  tool: 'opencode',
  subtype: 'agents',
  configPath: ['opencode', 'agents'],
  defaultSourceDir: '.opencode/agents',
  targetDir: '.opencode/agents',
  mode: 'directory',
});
