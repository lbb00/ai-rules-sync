import { createBaseAdapter } from './base.js';

export const codebuddySkillsAdapter = createBaseAdapter({
  name: 'codebuddy-skills',
  tool: 'codebuddy',
  subtype: 'skills',
  configPath: ['codebuddy', 'skills'],
  defaultSourceDir: '.codebuddy/skills',
  targetDir: '.codebuddy/skills',
  mode: 'directory',
});