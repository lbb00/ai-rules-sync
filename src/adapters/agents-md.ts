import path from 'path';
import fs from 'fs-extra';
import { SyncAdapter, ResolvedSource } from './types.js';
import { createBaseAdapter } from './base.js';

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
  async addDependency(projectPath: string, name: string, repoUrl: string, alias?: string, isLocal: boolean = false, targetDir?: string): Promise<void> {
    const configPath = path.join(projectPath, isLocal ? LOCAL_CONFIG_FILENAME : CONFIG_FILENAME);
    const config = await readConfigFile<any>(configPath);

    config.agentsMd ??= {};

    const targetName = alias || name;

    // Build entry value
    let entryValue: any;
    if (targetDir || (alias && alias !== name)) {
      entryValue = {
        url: repoUrl,
        ...(alias && alias !== name ? { rule: name } : {}),
        ...(targetDir ? { targetDir } : {})
      };
    } else {
      entryValue = repoUrl;
    }

    config.agentsMd[targetName] = entryValue;

    await writeConfigFile(configPath, config);
  },

  // Custom removeDependency that removes from flat agentsMd structure
  async removeDependency(projectPath: string, alias: string): Promise<{ removedFrom: string[] }> {
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

    return { removedFrom };
  }
};
