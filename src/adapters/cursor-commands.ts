import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Cursor Commands (.cursor/commands/)
 * Mode: file - links individual command files (.md)
 */
export const cursorCommandsAdapter: SyncAdapter = createBaseAdapter({
  name: 'cursor-commands',
  tool: 'cursor',
  subtype: 'commands',
  configPath: ['cursor', 'commands'],
  defaultSourceDir: '.cursor/commands',
  targetDir: '.cursor/commands',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
