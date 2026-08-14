import { createBaseAdapter } from './base.js';

export const workbuddySkillsAdapter = createBaseAdapter({
  name: 'workbuddy-skills',
  tool: 'workbuddy',
  subtype: 'skills',
  configPath: ['workbuddy', 'skills'],
  defaultSourceDir: '.workbuddy/skills',
  targetDir: '.workbuddy/skills',
  mode: 'directory',
});