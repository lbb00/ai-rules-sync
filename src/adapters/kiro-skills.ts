import { createBaseAdapter } from './base.js';

export const kiroSkillsAdapter = createBaseAdapter({
  name: 'kiro-skills',
  tool: 'kiro',
  subtype: 'skills',
  configPath: ['kiro', 'skills'],
  defaultSourceDir: '.kiro/skills',
  targetDir: '.kiro/skills',
  mode: 'directory',
});