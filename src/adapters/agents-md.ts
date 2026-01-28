import path from 'path';
import fs from 'fs-extra';
import { SyncAdapter, ResolvedSource, SyncOptions, LinkResult } from './types.js';
import { createBaseAdapter } from './base.js';
import { linkEntry as engineLinkEntry, unlinkEntry as engineUnlinkEntry } from '../sync-engine.js';

const SUFFIX = '.md';
const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

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
// Helper functions for config management
async function readConfigFile<T>(filePath: string): Promise<T> {
  if (await fs.pathExists(filePath)) {
    try {
      return await fs.readJson(filePath);
    } catch (e) {
      // ignore
    }
  }
  return {} as T;
}

async function writeConfigFile(filePath: string, config: any): Promise<void> {
  await fs.writeJson(filePath, config, { spaces: 2 });
}

// Create base adapter
const baseAdapter = createBaseAdapter({
  name: 'agents-md-file',  // Must match ${tool}-${subtype}
  tool: 'agents-md',
  subtype: 'file',
  configPath: ['agentsMd', 'file'],  // Used for source directory resolution only
  defaultSourceDir: '.',  // Repository root, AGENTS.md can be anywhere
  targetDir: '.',  // Project root
  mode: 'file',
  fileSuffixes: [SUFFIX],

  // Custom resolver with flexible path resolution
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

  // Always resolve to AGENTS.md in project root
  resolveTargetName: (name: string, alias?: string, sourceSuffix?: string): string => {
    return 'AGENTS.md';
  }
});

// Export adapter with custom dependency management
// The config structure for agentsMd is flat (not nested like other tools)
export const agentsMdAdapter: SyncAdapter = {
  ...baseAdapter,

  // Custom addDependency that writes to flat agentsMd structure
  async addDependency(projectPath: string, name: string, repoUrl: string, alias?: string, isLocal: boolean = false): Promise<{ migrated: boolean }> {
    const configPath = path.join(projectPath, isLocal ? LOCAL_CONFIG_FILENAME : CONFIG_FILENAME);
    const config = await readConfigFile<any>(configPath);

    config.agentsMd ??= {};

    const targetName = alias || name;
    config.agentsMd[targetName] =
      alias && alias !== name
        ? { url: repoUrl, rule: name }
        : repoUrl;

    await writeConfigFile(configPath, config);
    return { migrated: false };
  },

  // Custom removeDependency that removes from flat agentsMd structure
  async removeDependency(projectPath: string, alias: string): Promise<{ removedFrom: string[]; migrated: boolean }> {
    const removedFrom: string[] = [];

    const mainPath = path.join(projectPath, CONFIG_FILENAME);
    const mainConfig = await readConfigFile<any>(mainPath);
    if (mainConfig.agentsMd?.[alias]) {
      delete mainConfig.agentsMd[alias];
      await writeConfigFile(mainPath, mainConfig);
      removedFrom.push(CONFIG_FILENAME);
    }

    const localPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    const localConfig = await readConfigFile<any>(localPath);
    if (localConfig.agentsMd?.[alias]) {
      delete localConfig.agentsMd[alias];
      await writeConfigFile(localPath, localConfig);
      removedFrom.push(LOCAL_CONFIG_FILENAME);
    }

    return { removedFrom, migrated: false };
  }
};
