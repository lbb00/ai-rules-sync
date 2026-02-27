import { SyncAdapter } from './types.js';
import { createBaseAdapter } from './base.js';

/**
 * Adapter for Cline skills (directories with SKILL.md in .cline/skills/)
 */
export const clineSkillsAdapter: SyncAdapter = createBaseAdapter({
  name: 'cline-skills',
  tool: 'cline',
  subtype: 'skills',
  configPath: ['cline', 'skills'],
  mode: 'directory',
  defaultSourceDir: '.cline/skills',
  targetDir: '.cline/skills'
});
