import { createBaseAdapter } from './base.js';

export const claudeSkillsAdapter = createBaseAdapter({
  name: 'claude-skills',
  tool: 'claude',
  subtype: 'skills',
  configPath: ['claude', 'skills'],
  defaultSourceDir: '.claude/skills',
  targetDir: '.claude/skills',
  mode: 'directory',
});