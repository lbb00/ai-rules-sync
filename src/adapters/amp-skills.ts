import { createBaseAdapter } from './base.js';

export const ampSkillsAdapter = createBaseAdapter({
  name: 'amp-skills',
  tool: 'amp',
  subtype: 'skills',
  configPath: ['amp', 'skills'],
  defaultSourceDir: '.agents/skills',
  targetDir: '.agents/skills',
  mode: 'directory',
});