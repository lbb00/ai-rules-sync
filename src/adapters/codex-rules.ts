import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.rules';

export const codexRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'codex-rules',
  tool: 'codex',
  subtype: 'rules',
  configPath: ['codex', 'rules'],
  defaultSourceDir: '.codex/rules',
  targetDir: '.codex/rules',
  mode: 'file',
  fileSuffixes: [SUFFIX],
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
