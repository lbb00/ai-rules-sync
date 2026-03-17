import { createBaseAdapter } from './base.js';

export const claudeOutputStylesAdapter = createBaseAdapter({
  name: 'claude-output-styles',
  tool: 'claude',
  subtype: 'output-styles',
  configPath: ['claude', 'output-styles'],
  defaultSourceDir: '.claude/output-styles',
  targetDir: '.claude/output-styles',
  mode: 'directory',
});
