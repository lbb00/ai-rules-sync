import { createBaseAdapter } from './base.js';

export const qwenSkillsAdapter = createBaseAdapter({
  name: 'qwen-skills',
  tool: 'qwen',
  subtype: 'skills',
  configPath: ['qwen', 'skills'],
  defaultSourceDir: '.qwen/skills',
  targetDir: '.qwen/skills',
  mode: 'directory',
});