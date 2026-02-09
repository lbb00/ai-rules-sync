import { createBaseAdapter } from './base.js';

export const copilotSkillsAdapter = createBaseAdapter({
  name: 'copilot-skills',
  tool: 'copilot',
  subtype: 'skills',
  configPath: ['copilot', 'skills'],
  defaultSourceDir: '.github/skills',
  targetDir: '.github/skills',
  mode: 'directory',
});
