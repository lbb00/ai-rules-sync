import { createBaseAdapter } from './base.js';

export const continueSkillsAdapter = createBaseAdapter({
  name: 'continue-skills',
  tool: 'continue',
  subtype: 'skills',
  configPath: ['continue', 'skills'],
  defaultSourceDir: '.continue/skills',
  targetDir: '.continue/skills',
  mode: 'directory',
});