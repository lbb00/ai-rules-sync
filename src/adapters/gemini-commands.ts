import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.toml';

/**
 * Adapter for Gemini CLI commands (.toml files in .gemini/commands/)
 */
export const geminiCommandsAdapter: SyncAdapter = createBaseAdapter({
  name: 'gemini-commands',
  tool: 'gemini',
  subtype: 'commands',
  configPath: ['gemini', 'commands'],
  mode: 'file',
  fileSuffixes: [SUFFIX],
  defaultSourceDir: '.gemini/commands',
  targetDir: '.gemini/commands',
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
