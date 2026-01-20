import { createBaseAdapter } from './base.js';

export const traeSkillsAdapter = createBaseAdapter({
  name: 'trae-skills',
  tool: 'trae',
  subtype: 'skills',
  configPath: ['trae', 'skills'],
  defaultSourceDir: '.trae/skills',
  targetDir: '.trae/skills',
  mode: 'directory',
});
