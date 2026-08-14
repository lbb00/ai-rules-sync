import { createBaseAdapter } from './base.js';

export const gooseSkillsAdapter = createBaseAdapter({
  name: 'goose-skills',
  tool: 'goose',
  subtype: 'skills',
  configPath: ['goose', 'skills'],
  defaultSourceDir: '.goose/skills',
  targetDir: '.goose/skills',
  mode: 'directory',
});