import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Codex AGENTS.md file (.codex/AGENTS.md)
 * Mode: file - links individual .md files from .codex/ directory
 *
 * Global mode usage:
 *   ais codex md add AGENTS --global
 *   → creates symlink at ~/.codex/AGENTS.md
 *
 * Project mode usage:
 *   ais codex md add AGENTS
 *   → creates symlink at ./.codex/AGENTS.md
 */
export const codexMdAdapter: SyncAdapter = createBaseAdapter({
  name: 'codex-md',
  tool: 'codex',
  subtype: 'md',
  configPath: ['codex', 'md'],
  defaultSourceDir: '.codex',
  targetDir: '.codex',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'AGENTS.md'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
