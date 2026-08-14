import { createBaseAdapter } from './base.js';

export const factorydroidSkillsAdapter = createBaseAdapter({
  name: 'factorydroid-skills',
  tool: 'factorydroid',
  subtype: 'skills',
  configPath: ['factorydroid', 'skills'],
  defaultSourceDir: '.factory/skills',
  targetDir: '.factory/skills',
  mode: 'directory',
});