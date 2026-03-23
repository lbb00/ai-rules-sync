import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.json';

export const claudeSettingsAdapter: SyncAdapter = createBaseAdapter({
  name: 'claude-settings',
  tool: 'claude',
  subtype: 'settings',
  configPath: ['claude', 'settings'],
  defaultSourceDir: '.claude',
  targetDir: '.claude',
  userTargetDir: '.claude',
  userDefaultSourceDir: '.claude/user',
  mode: 'file',
  fileSuffixes: [SUFFIX],
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Settings'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX]),
});
