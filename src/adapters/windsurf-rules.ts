import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Windsurf rules (.md files in .windsurf/rules/)
 */
export const windsurfRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'windsurf-rules',
  tool: 'windsurf',
  subtype: 'rules',
  configPath: ['windsurf', 'rules'],
  mode: 'file',
  fileSuffixes: [SUFFIX],
  defaultSourceDir: '.windsurf/rules',
  targetDir: '.windsurf/rules',
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
