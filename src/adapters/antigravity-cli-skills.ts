import { createBaseAdapter } from './base.js';

export const antigravitySkillsAdapter = createBaseAdapter({
  name: 'antigravity-cli-skills',
  tool: 'antigravity-cli',
  subtype: 'skills',
  configPath: ['antigravity-cli', 'skills'],
  defaultSourceDir: '.agents/skills',
  targetDir: '.agents/skills',
  mode: 'directory',
});