import { SyncAdapter } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Adapter for Gemini CLI GEMINI.md file (.gemini/GEMINI.md)
 * Mode: file - links individual .md files from .gemini/ directory
 *
 * Global mode usage:
 *   ais gemini md add GEMINI --global
 *   → creates symlink at ~/.gemini/GEMINI.md
 *
 * Project mode usage:
 *   ais gemini md add GEMINI
 *   → creates symlink at ./.gemini/GEMINI.md
 */
export const geminiMdAdapter: SyncAdapter = createBaseAdapter({
  name: 'gemini-md',
  tool: 'gemini',
  subtype: 'md',
  configPath: ['gemini', 'md'],
  defaultSourceDir: '.gemini',
  targetDir: '.gemini',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: createSingleSuffixResolver(SUFFIX, 'GEMINI.md'),
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
