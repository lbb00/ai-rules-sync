import { createBaseAdapter } from './base.js';

export const hermesSkillsAdapter = createBaseAdapter({
  name: 'hermes-skills',
  tool: 'hermes',
  subtype: 'skills',
  configPath: ['hermes', 'skills'],
  defaultSourceDir: '.hermes/skills',
  targetDir: '.hermes/skills',
  mode: 'directory',
});