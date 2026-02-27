import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Claude CLAUDE.md file (.claude/CLAUDE.md)
 * Mode: file - links individual .md files from .claude/ directory
 *
 * Global mode usage:
 *   ais claude md add CLAUDE --global
 *   → creates symlink at ~/.claude/CLAUDE.md
 *
 * Project mode usage:
 *   ais claude md add CLAUDE
 *   → creates symlink at ./.claude/CLAUDE.md
 */
export const claudeMdAdapter: SyncAdapter = createBaseAdapter({
  name: 'claude-md',
  tool: 'claude',
  subtype: 'md',
  configPath: ['claude', 'md'],
  defaultSourceDir: '.claude',
  targetDir: '.claude',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'CLAUDE.md'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
