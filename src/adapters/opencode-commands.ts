import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for OpenCode Commands (.opencode/commands/)
 * Mode: file - links individual command files (.md)
 */
export const opencodeCommandsAdapter: SyncAdapter = createBaseAdapter({
  name: 'opencode-commands',
  tool: 'opencode',
  subtype: 'commands',
  configPath: ['opencode', 'commands'],
  defaultSourceDir: '.opencode/commands',
  targetDir: '.opencode/commands',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
