import { createBaseAdapter } from './base.js';

export const claudeStatusLinesAdapter = createBaseAdapter({
  name: 'claude-status-lines',
  tool: 'claude',
  subtype: 'status-lines',
  configPath: ['claude', 'status-lines'],
  defaultSourceDir: '.claude/status-lines',
  targetDir: '.claude/status-lines',
  userTargetDir: '.claude/status_lines',
  mode: 'directory',
});
