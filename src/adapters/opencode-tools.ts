import { SyncAdapter } from './types.js';
import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIXES = ['.ts', '.js'];

/**
 * Adapter for OpenCode Tools (.opencode/tools/)
 * Mode: file - links individual tool files (.ts, .js)
 */
export const opencodeToolsAdapter: SyncAdapter = createBaseAdapter({
  name: 'opencode-tools',
  tool: 'opencode',
  subtype: 'tools',
  configPath: ['opencode', 'tools'],
  defaultSourceDir: '.opencode/tools',
  targetDir: '.opencode/tools',
  userTargetDir: '.config/opencode/tools',
  mode: 'file',
  fileSuffixes: SUFFIXES,

  resolveSource: createMultiSuffixResolver(SUFFIXES, 'Tool'),
  resolveTargetName: createSuffixAwareTargetResolver(SUFFIXES)
});
