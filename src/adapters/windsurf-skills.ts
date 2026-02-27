import { SyncAdapter } from './types.js';
import { createBaseAdapter } from './base.js';

/**
 * Adapter for Windsurf skills (directories with SKILL.md in .windsurf/skills/)
 */
export const windsurfSkillsAdapter: SyncAdapter = createBaseAdapter({
  name: 'windsurf-skills',
  tool: 'windsurf',
  subtype: 'skills',
  configPath: ['windsurf', 'skills'],
  mode: 'directory',
  defaultSourceDir: '.windsurf/skills',
  targetDir: '.windsurf/skills'
});
