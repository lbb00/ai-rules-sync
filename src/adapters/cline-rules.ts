import { SyncAdapter } from './types.js';
import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIXES = ['.md', '.txt'];

/**
 * Adapter for Cline rules (.md/.txt files in .clinerules/)
 */
export const clineRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'cline-rules',
  tool: 'cline',
  subtype: 'rules',
  configPath: ['cline', 'rules'],
  mode: 'file',
  fileSuffixes: SUFFIXES,
  defaultSourceDir: '.clinerules',
  targetDir: '.clinerules',
  resolveSource: createMultiSuffixResolver(SUFFIXES, 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(SUFFIXES)
});
