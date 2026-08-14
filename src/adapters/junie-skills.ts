import { createBaseAdapter } from './base.js';

export const junieSkillsAdapter = createBaseAdapter({
  name: 'junie-skills',
  tool: 'junie',
  subtype: 'skills',
  configPath: ['junie', 'skills'],
  defaultSourceDir: '.junie/skills',
  targetDir: '.junie/skills',
  mode: 'directory',
});