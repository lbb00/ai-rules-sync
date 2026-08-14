import { createBaseAdapter } from './base.js';

export const zedSkillsAdapter = createBaseAdapter({
  name: 'zed-skills',
  tool: 'zed',
  subtype: 'skills',
  configPath: ['zed', 'skills'],
  defaultSourceDir: '.agents/skills',
  targetDir: '.agents/skills',
  mode: 'directory',
});