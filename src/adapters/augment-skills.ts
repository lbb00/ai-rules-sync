import { createBaseAdapter } from './base.js';

export const augmentSkillsAdapter = createBaseAdapter({
  name: 'augment-skills',
  tool: 'augment',
  subtype: 'skills',
  configPath: ['augment', 'skills'],
  defaultSourceDir: '.augment/skills',
  targetDir: '.augment/skills',
  mode: 'directory',
});