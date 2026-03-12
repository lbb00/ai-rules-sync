import { createBaseAdapter } from './base.js';

export const claudeAgentMemoryAdapter = createBaseAdapter({
  name: 'claude-agent-memory',
  tool: 'claude',
  subtype: 'agent-memory',
  configPath: ['claude', 'agent-memory'],
  defaultSourceDir: '.claude/agent-memory',
  targetDir: '.claude/agent-memory',
  mode: 'directory',
});
