import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Gemini CLI agents (.md files with YAML frontmatter in .gemini/agents/)
 */
export const geminiAgentsAdapter: SyncAdapter = createBaseAdapter({
  name: 'gemini-agents',
  tool: 'gemini',
  subtype: 'agents',
  configPath: ['gemini', 'agents'],
  mode: 'file',
  fileSuffixes: [SUFFIX],
  defaultSourceDir: '.gemini/agents',
  targetDir: '.gemini/agents',
  resolveSource: createSingleSuffixResolver(SUFFIX, 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
