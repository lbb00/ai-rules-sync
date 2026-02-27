import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ai-rules-sync');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const REPOS_BASE_DIR = path.join(CONFIG_DIR, 'repos');
const DEFAULT_USER_CONFIG_FILE = path.join(CONFIG_DIR, 'user.json');

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
  // Deprecated: renamed to userConfigPath
  globalConfigPath?: string;
  // Optional custom path for user.json (supports dotfiles integration)
  userConfigPath?: string;
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
 * Get the path to the user project config file.
 * Uses custom path from config if set, otherwise defaults to ~/.config/ai-rules-sync/user.json.
 * Handles migration from old globalConfigPath and global.json.
 */
export async function getUserConfigPath(): Promise<string> {
  const config = await getConfig();

  // Migration: rename globalConfigPath → userConfigPath
  if (config.globalConfigPath && !config.userConfigPath) {
    const migratedPath = config.globalConfigPath;
    delete (config as any).globalConfigPath;
    config.userConfigPath = migratedPath;
    await fs.ensureDir(CONFIG_DIR);
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  }

  if (config.userConfigPath) {
    // Support ~ expansion
    return config.userConfigPath.replace(/^~/, os.homedir());
  }

  // Migration: rename global.json → user.json if user.json doesn't exist
  const oldFile = path.join(CONFIG_DIR, 'global.json');
  if (!await fs.pathExists(DEFAULT_USER_CONFIG_FILE) && await fs.pathExists(oldFile)) {
    await fs.move(oldFile, DEFAULT_USER_CONFIG_FILE);
  }

  return DEFAULT_USER_CONFIG_FILE;
}

/** @deprecated Use getUserConfigPath() instead */
export async function getGlobalConfigPath(): Promise<string> {
  return getUserConfigPath();
}

/**
 * Get the user project config (stored in user.json).
 */
export async function getUserProjectConfig(): Promise<import('./project-config.js').ProjectConfig> {
  const userPath = await getUserConfigPath();
  if (await fs.pathExists(userPath)) {
    try {
      return await fs.readJson(userPath);
    } catch {
      // ignore
    }
  }
  return {};
}

/** @deprecated Use getUserProjectConfig() instead */
export async function getGlobalProjectConfig(): Promise<import('./project-config.js').ProjectConfig> {
  return getUserProjectConfig();
}

/**
 * Save the user project config to user.json.
 */
export async function saveUserProjectConfig(projectConfig: import('./project-config.js').ProjectConfig): Promise<void> {
  const userPath = await getUserConfigPath();
  await fs.ensureDir(path.dirname(userPath));
  await fs.writeJson(userPath, projectConfig, { spaces: 2 });
}

/** @deprecated Use saveUserProjectConfig() instead */
export async function saveGlobalProjectConfig(projectConfig: import('./project-config.js').ProjectConfig): Promise<void> {
  return saveUserProjectConfig(projectConfig);
}
