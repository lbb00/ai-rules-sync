import { SyncAdapter } from './types.js';
import { createBaseAdapter } from './base.js';

export const codexSkillsAdapter: SyncAdapter = createBaseAdapter({
  name: 'codex-skills',
  tool: 'codex',
  subtype: 'skills',
  configPath: ['codex', 'skills'],
  defaultSourceDir: '.agents/skills',
  targetDir: '.agents/skills',
  mode: 'directory',
});
