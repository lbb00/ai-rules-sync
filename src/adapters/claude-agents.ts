import { createBaseAdapter } from './base.js';

export const claudeAgentsAdapter = createBaseAdapter({
  name: 'claude-agents',
  tool: 'claude',
  subtype: 'agents',
  configPath: ['claude', 'agents'],
  defaultSourceDir: '.claude/agents',
  targetDir: '.claude/agents',
  mode: 'directory',
});