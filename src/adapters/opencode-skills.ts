import { createBaseAdapter } from './base.js';

export const opencodeSkillsAdapter = createBaseAdapter({
  name: 'opencode-skills',
  tool: 'opencode',
  subtype: 'skills',
  configPath: ['opencode', 'skills'],
  defaultSourceDir: '.opencode/skills',
  targetDir: '.opencode/skills',
  mode: 'directory',
});
