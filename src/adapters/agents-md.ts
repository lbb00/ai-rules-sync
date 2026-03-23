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
// Scan actual directory listing to find AGENTS.md with correct case.
// fs.pathExists is unreliable on case-insensitive filesystems (e.g. macOS).
async function findAgentsMdInDir(dirPath: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.find(e => e === 'agents.md') ?? entries.find(e => e === 'AGENTS.md') ?? null;
  } catch {
    return null;
  }
}

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
      const found = await findAgentsMdInDir(path.join(basePath, normalizedName));
      if (found) {
        const sourceName = path.join(normalizedName, found);
        return { sourceName, sourcePath: path.join(basePath, normalizedName, found), suffix: SUFFIX };
      }

      throw new Error(`AGENTS.md not found in directory: ${normalizedName}`);
    }

    // Pattern 3: Simple name - try as directory, then root
    if (normalizedName && normalizedName !== '.') {
      // First, check if it's exactly "AGENTS" or "agents" (case-insensitive)
      const upperName = normalizedName.toUpperCase();
      if (upperName === 'AGENTS') {
        const found = await findAgentsMdInDir(basePath);
        if (found) {
          return { sourceName: found, sourcePath: path.join(basePath, found), suffix: SUFFIX };
        }
      }

      // Try as directory name (name/AGENTS.md)
      const foundInSubdir = await findAgentsMdInDir(path.join(basePath, normalizedName));
      if (foundInSubdir) {
        const sourceName = path.join(normalizedName, foundInSubdir);
        return { sourceName, sourcePath: path.join(basePath, normalizedName, foundInSubdir), suffix: SUFFIX };
      }

      // Fallback: try root-level AGENTS.md
      const foundAtRoot = await findAgentsMdInDir(basePath);
      if (foundAtRoot) {
        return { sourceName: foundAtRoot, sourcePath: path.join(basePath, foundAtRoot), suffix: SUFFIX };
      }

      throw new Error(`AGENTS.md not found for: ${normalizedName} (tried as directory and at root)`);
    }

    // Pattern 4: Empty or "." - root level only
    const found = await findAgentsMdInDir(basePath);
    if (found) {
      return { sourceName: found, sourcePath: path.join(basePath, found), suffix: SUFFIX };
    }

    throw new Error('AGENTS.md not found at repository root');
  },

  resolveTargetName: (name: string, alias?: string, sourceSuffix?: string): string => {
    return 'AGENTS.md';
  }
});
