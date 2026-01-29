import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for OpenCode Agents (.opencode/agents/)
 * Mode: file - links individual agent files (.md)
 */
export const opencodeAgentsAdapter: SyncAdapter = createBaseAdapter({
  name: 'opencode-agents',
  tool: 'opencode',
  subtype: 'agents',
  configPath: ['opencode', 'agents'],
  defaultSourceDir: '.opencode/agents',
  targetDir: '.opencode/agents',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
