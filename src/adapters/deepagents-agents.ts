import { createBaseAdapter } from './base.js';

export const deepagentsAgentsAdapter = createBaseAdapter({
  name: 'deepagents-agents',
  tool: 'deepagents',
  subtype: 'agents',
  configPath: ['deepagents', 'agents'],
  defaultSourceDir: '.deepagents/agents',
  targetDir: '.deepagents/agents',
  mode: 'directory',
});