import { createBaseAdapter } from './base.js';

export const kimiSkillsAdapter = createBaseAdapter({
  name: 'kimi-skills',
  tool: 'kimi',
  subtype: 'skills',
  configPath: ['kimi', 'skills'],
  defaultSourceDir: '.kimi-code/skills',
  targetDir: '.kimi-code/skills',
  mode: 'directory',
});