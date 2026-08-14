import { createBaseAdapter } from './base.js';

export const piSkillsAdapter = createBaseAdapter({
  name: 'pi-skills',
  tool: 'pi',
  subtype: 'skills',
  configPath: ['pi', 'skills'],
  defaultSourceDir: '.pi/skills',
  targetDir: '.pi/skills',
  mode: 'directory',
});