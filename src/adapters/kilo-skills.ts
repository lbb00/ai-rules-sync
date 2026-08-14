import { createBaseAdapter } from './base.js';

export const kiloSkillsAdapter = createBaseAdapter({
  name: 'kilo-skills',
  tool: 'kilo',
  subtype: 'skills',
  configPath: ['kilo', 'skills'],
  defaultSourceDir: '.kilo/skills',
  targetDir: '.kilo/skills',
  mode: 'directory',
});