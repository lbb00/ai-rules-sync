import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

export const claudeAgentsAdapter: SyncAdapter = createBaseAdapter({
  name: 'claude-agents',
  tool: 'claude',
  subtype: 'agents',
  configPath: ['claude', 'agents'],
  defaultSourceDir: '.claude/agents',
  targetDir: '.claude/agents',
  mode: 'hybrid',
  hybridFileSuffixes: [SUFFIX],
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX]),
});