import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const codexAgentsAdapter = createBaseAdapter({
  name: 'codex-agents',
  tool: 'codex',
  subtype: 'agents',
  configPath: ['codex', 'agents'],
  defaultSourceDir: '.codex/agents',
  targetDir: '.codex/agents',
  mode: 'file',
  fileSuffixes: ['.toml'],
  resolveSource: createMultiSuffixResolver(['.toml'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.toml']),
});