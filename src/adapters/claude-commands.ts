import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

export const claudeCommandsAdapter: SyncAdapter = createBaseAdapter({
  name: 'claude-commands',
  tool: 'claude',
  subtype: 'commands',
  configPath: ['claude', 'commands'],
  defaultSourceDir: '.claude/commands',
  targetDir: '.claude/commands',
  mode: 'hybrid',
  hybridFileSuffixes: [SUFFIX],
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX]),
});
