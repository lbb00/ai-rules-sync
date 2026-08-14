import { createBaseAdapter } from './base.js';

export const deepseekSkillsAdapter = createBaseAdapter({
  name: 'deepseek-skills',
  tool: 'deepseek',
  subtype: 'skills',
  configPath: ['deepseek', 'skills'],
  defaultSourceDir: '.agents/skills',
  targetDir: '.agents/skills',
  mode: 'directory',
});