import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for OpenCode Rules (.opencode/rules/)
 * Mode: file - links individual rule files (.md)
 */
export const opencodeRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'opencode-rules',
  tool: 'opencode',
  subtype: 'rules',
  configPath: ['opencode', 'rules'],
  defaultSourceDir: '.opencode/rules',
  targetDir: '.opencode/rules',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
