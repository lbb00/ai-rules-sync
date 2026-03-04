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
  // Optional custom path for user.json (supports dotfiles integration)
  userConfigPath?: string;
}

export async function getConfig(): Promise<Config> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      return { repos: {}, ...config };
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
 */
export async function getUserConfigPath(): Promise<string> {
  const config = await getConfig();

  if (config.userConfigPath) {
    // Support ~ expansion
    return config.userConfigPath.replace(/^~/, os.homedir());
  }

  return DEFAULT_USER_CONFIG_FILE;
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

/**
 * Save the user project config to user.json.
 */
export async function saveUserProjectConfig(projectConfig: import('./project-config.js').ProjectConfig): Promise<void> {
  const userPath = await getUserConfigPath();
  await fs.ensureDir(path.dirname(userPath));
  await fs.writeJson(userPath, projectConfig, { spaces: 2 });
}
