import { createBaseAdapter } from './base.js';

export const aiderSkillsAdapter = createBaseAdapter({
  name: 'aider-skills',
  tool: 'aider',
  subtype: 'skills',
  configPath: ['aider', 'skills'],
  defaultSourceDir: '.aider/skills',
  targetDir: '.aider/skills',
  mode: 'directory',
});