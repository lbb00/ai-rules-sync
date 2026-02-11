import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Claude Rules (.claude/rules/)
 * Mode: file - links individual rule files (.md)
 */
export const claudeRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'claude-rules',
  tool: 'claude',
  subtype: 'rules',
  configPath: ['claude', 'rules'],
  defaultSourceDir: '.claude/rules',
  targetDir: '.claude/rules',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
