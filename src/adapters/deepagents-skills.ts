import { createBaseAdapter } from './base.js';

export const deepagentsSkillsAdapter = createBaseAdapter({
  name: 'deepagents-skills',
  tool: 'deepagents',
  subtype: 'skills',
  configPath: ['deepagents', 'skills'],
  defaultSourceDir: '.deepagents/skills',
  targetDir: '.deepagents/skills',
  mode: 'directory',
});