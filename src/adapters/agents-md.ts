import path from 'path';
import fs from 'fs-extra';
import { SyncAdapter, ResolvedSource } from './types.js';
import { createBaseAdapter } from './base.js';

const SUFFIX = '.md';

/**
 * Universal adapter for AGENTS.md files (agents.md standard)
 * Links AGENTS.md from repository to project root
 * See: https://agents.md/
 *
 * This adapter is tool-agnostic and can be used by any AI coding tool
 * that follows the agents.md standard.
 *
 * Supports flexible AGENTS.md location:
 * - Root level: ".", "AGENTS", "AGENTS.md"
 * - Directory: "frontend" → frontend/AGENTS.md
 * - Nested path: "docs/team" → docs/team/AGENTS.md
 * - Explicit file: "frontend/AGENTS.md"
 */
export const agentsMdAdapter: SyncAdapter = createBaseAdapter({
  name: 'agents-md-file',
  tool: 'agents-md',
  subtype: 'file',
  configPath: ['agentsMd', 'file'],
  defaultSourceDir: '.',
  targetDir: '.',
  mode: 'file',
  fileSuffixes: [SUFFIX],

  resolveSource: async (repoDir: string, rootPath: string, name: string): Promise<ResolvedSource> => {
    const basePath = path.join(repoDir, rootPath);

    // Normalize path separators
    const normalizedName = name.replace(/\\/g, '/');

    // Pattern 1: If name ends with .md, treat as complete path
    if (normalizedName.toLowerCase().endsWith('.md')) {
      const fullPath = path.join(basePath, normalizedName);

      // Validate it's an AGENTS.md file
      const basename = path.basename(normalizedName).toUpperCase();
      if (!basename.startsWith('AGENTS')) {
        throw new Error(`Only AGENTS.md files are supported, got: ${path.basename(normalizedName)}`);
      }

      if (await fs.pathExists(fullPath)) {
        return { sourceName: normalizedName, sourcePath: fullPath, suffix: SUFFIX };
      }

      throw new Error(`AGENTS.md file not found at: ${normalizedName}`);
    }

    // Pattern 2: Name contains path separator - treat as directory
    if (normalizedName.includes('/')) {
      // Try directory/AGENTS.md (case variations)
      for (const variant of ['AGENTS.md', 'agents.md']) {
        const candidatePath = path.join(basePath, normalizedName, variant);
        if (await fs.pathExists(candidatePath)) {
          const sourceName = path.join(normalizedName, variant);
          return { sourceName, sourcePath: candidatePath, suffix: SUFFIX };
        }
      }

      throw new Error(`AGENTS.md not found in directory: ${normalizedName}`);
    }

    // Pattern 3: Simple name - try as directory, then root
    if (normalizedName && normalizedName !== '.') {
      // First, check if it's exactly "AGENTS" or "agents" (case-insensitive)
      const upperName = normalizedName.toUpperCase();
      if (upperName === 'AGENTS') {
        // Try root-level AGENTS.md variants
        for (const variant of ['AGENTS.md', 'agents.md']) {
          const candidatePath = path.join(basePath, variant);
          if (await fs.pathExists(candidatePath)) {
            return { sourceName: variant, sourcePath: candidatePath, suffix: SUFFIX };
          }
        }
      }

      // Try as directory name (name/AGENTS.md)
      for (const variant of ['AGENTS.md', 'agents.md']) {
        const candidatePath = path.join(basePath, normalizedName, variant);
        if (await fs.pathExists(candidatePath)) {
          const sourceName = path.join(normalizedName, variant);
          return { sourceName, sourcePath: candidatePath, suffix: SUFFIX };
        }
      }

      // Fallback: try root-level AGENTS.md
      for (const variant of ['AGENTS.md', 'agents.md']) {
        const candidatePath = path.join(basePath, variant);
        if (await fs.pathExists(candidatePath)) {
          return { sourceName: variant, sourcePath: candidatePath, suffix: SUFFIX };
        }
      }

      throw new Error(`AGENTS.md not found for: ${normalizedName} (tried as directory and at root)`);
    }

    // Pattern 4: Empty or "." - root level only
    for (const variant of ['AGENTS.md', 'agents.md']) {
      const candidatePath = path.join(basePath, variant);
      if (await fs.pathExists(candidatePath)) {
        return { sourceName: variant, sourcePath: candidatePath, suffix: SUFFIX };
      }
    }

    throw new Error('AGENTS.md not found at repository root');
  },

  resolveTargetName: (name: string, alias?: string, sourceSuffix?: string): string => {
    return 'AGENTS.md';
  }
});
