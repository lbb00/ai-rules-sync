import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ai-rules-sync');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const REPOS_BASE_DIR = path.join(CONFIG_DIR, 'repos');
const DEFAULT_GLOBAL_CONFIG_FILE = path.join(CONFIG_DIR, 'global.json');

export interface RepoConfig {
  url: string;
  name: string;
  path: string;
  sourceDir?: import('./project-config.js').SourceDirConfig;
}

export interface Config {
  currentRepo?: string; // name of the current repo
  repos: Record<string, RepoConfig>;
  completionInstalled?: boolean; // whether shell completion setup has been handled
  // Deprecated field for migration
  repoUrl?: string;
  // Optional custom path for global.json (supports dotfiles integration)
  globalConfigPath?: string;
}

export async function getConfig(): Promise<Config> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);

      // Migration logic for old config format
      if (config.repoUrl && !config.repos) {
        const defaultName = 'default';
        const defaultPath = path.join(REPOS_BASE_DIR, defaultName);

        // Move old repo dir if exists
        const oldRepoDir = path.join(CONFIG_DIR, 'repo');
        if (await fs.pathExists(oldRepoDir)) {
          await fs.ensureDir(REPOS_BASE_DIR);
          if (!await fs.pathExists(defaultPath)) {
             await fs.move(oldRepoDir, defaultPath);
          }
        }

        return {
          currentRepo: defaultName,
          repos: {
            [defaultName]: {
              name: defaultName,
              url: config.repoUrl,
              path: defaultPath
            }
          }
        };
      }
      return config;
    }
  } catch (error) {
    // ignore error
  }
  return { repos: {} };
}

export async function setConfig(config: Partial<Config>) {
  await fs.ensureDir(CONFIG_DIR);
  const current = await getConfig();
  const newConfig = { ...current, ...config } as Config;

  // Ensure repos object exists if not present
  if (!newConfig.repos) {
      newConfig.repos = {};
  }

  // Clean up deprecated field
  if ('repoUrl' in newConfig) {
    delete (newConfig as any).repoUrl;
  }

  await fs.writeJson(CONFIG_FILE, newConfig, { spaces: 2 });
}

export function getReposBaseDir() {
  return REPOS_BASE_DIR;
}

export async function getCurrentRepo(): Promise<RepoConfig | null> {
  const config = await getConfig();
  if (config.currentRepo && config.repos && config.repos[config.currentRepo]) {
    return config.repos[config.currentRepo];
  }
  return null;
}

/**
 * Get the path to the global project config file.
 * Uses custom path from config if set, otherwise defaults to ~/.config/ai-rules-sync/global.json.
 */
export async function getGlobalConfigPath(): Promise<string> {
  const config = await getConfig();
  if (config.globalConfigPath) {
    // Support ~ expansion
    return config.globalConfigPath.replace(/^~/, os.homedir());
  }
  return DEFAULT_GLOBAL_CONFIG_FILE;
}

/**
 * Get the global project config (stored in global.json).
 */
export async function getGlobalProjectConfig(): Promise<import('./project-config.js').ProjectConfig> {
  const globalPath = await getGlobalConfigPath();
  if (await fs.pathExists(globalPath)) {
    try {
      return await fs.readJson(globalPath);
    } catch {
      // ignore
    }
  }
  return {};
}

/**
 * Save the global project config to global.json.
 */
export async function saveGlobalProjectConfig(projectConfig: import('./project-config.js').ProjectConfig): Promise<void> {
  const globalPath = await getGlobalConfigPath();
  await fs.ensureDir(path.dirname(globalPath));
  await fs.writeJson(globalPath, projectConfig, { spaces: 2 });
}
