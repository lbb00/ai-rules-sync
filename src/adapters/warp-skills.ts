import { SyncAdapter } from './types.js';
import { createBaseAdapter } from './base.js';

/**
 * Adapter for Warp agent skills (directories in .agents/skills/)
 */
export const warpSkillsAdapter: SyncAdapter = createBaseAdapter({
  name: 'warp-skills',
  tool: 'warp',
  subtype: 'skills',
  configPath: ['warp', 'skills'],
  mode: 'directory',
  defaultSourceDir: '.agents/skills',
  targetDir: '.agents/skills',
});
