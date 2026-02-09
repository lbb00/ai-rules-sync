import { SyncAdapter } from './types.js';
import { createBaseAdapter } from './base.js';

/**
 * Adapter for Gemini CLI skills (directories with SKILL.md in .gemini/skills/)
 */
export const geminiSkillsAdapter: SyncAdapter = createBaseAdapter({
  name: 'gemini-skills',
  tool: 'gemini',
  subtype: 'skills',
  configPath: ['gemini', 'skills'],
  mode: 'directory',
  defaultSourceDir: '.gemini/skills',
  targetDir: '.gemini/skills'
});
