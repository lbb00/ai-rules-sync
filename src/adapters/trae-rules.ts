import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Trae Rules (.trae/rules/)
 * Mode: file - links individual rule files (.md)
 */
export const traeRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'trae-rules',
  tool: 'trae',
  subtype: 'rules',
  configPath: ['trae', 'rules'],
  defaultSourceDir: '.trae/rules',
  targetDir: '.trae/rules',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
