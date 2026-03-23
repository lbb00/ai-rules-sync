import path from 'path';
import fs from 'fs-extra';
import { SyncAdapter, ResolvedSource } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

/**
 * Custom resolver that supports sourceFileOverride from rules repo sourceDir.
 * When sourceDir is { dir: "common", sourceFile: "AGENTS.md" }, resolves common/AGENTS.md
 * as the source while target remains CLAUDE.md (symlink can have different filename).
 */
async function resolveClaudeMdSource(
  repoDir: string,
  rootPath: string,
  name: string,
  options?: { sourceFileOverride?: string }
): Promise<ResolvedSource> {
  if (options?.sourceFileOverride) {
    const sourcePath = path.join(repoDir, rootPath, options.sourceFileOverride);
    if (await fs.pathExists(sourcePath)) {
      return {
        sourceName: options.sourceFileOverride,
        sourcePath,
        suffix: SUFFIX,
      };
    }
    throw new Error(`Source file "${options.sourceFileOverride}" not found at ${path.join(rootPath, options.sourceFileOverride)}`);
  }
  return createSingleSuffixResolver(SUFFIX, 'CLAUDE.md')(repoDir, rootPath, name);
}

/**
 * Adapter for Claude CLAUDE.md file (.claude/CLAUDE.md)
 * Mode: file - links individual .md files from .claude/ directory
 *
 * Global mode usage:
 *   ais claude md add CLAUDE --user
 *   → creates symlink at ~/.claude/CLAUDE.md
 *
 * Project mode usage:
 *   ais claude md add CLAUDE
 *   → creates symlink at ./.claude/CLAUDE.md
 *
 * Rules repo sourceDir override (use common/AGENTS.md as CLAUDE.md source):
 *   sourceDir: { claude: { md: { dir: "common", sourceFile: "AGENTS.md" } } }
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

  resolveSource: resolveClaudeMdSource,
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX])
});
