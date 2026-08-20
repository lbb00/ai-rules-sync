import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { assertSupportedConfigVersion, CURRENT_CONFIG_VERSION } from './config-schema.js';

type Environment = Record<string, string | undefined>;

export function getConfigDir(env: Environment = process.env, home = os.homedir()): string {
  if (env.AIS_CONFIG_HOME) return path.resolve(env.AIS_CONFIG_HOME);
  if (env.XDG_CONFIG_HOME) return path.join(path.resolve(env.XDG_CONFIG_HOME), 'ai-rules-sync');
  return path.join(home, '.config', 'ai-rules-sync');
}

export function getConfigFilePath(env: Environment = process.env, home = os.homedir()): string {
  return path.join(getConfigDir(env, home), 'config.json');
}

export function getReposBaseDir(env: Environment = process.env, home = os.homedir()): string {
  return path.join(getConfigDir(env, home), 'repos');
}

export function getUserConfigDefaultPath(env: Environment = process.env, home = os.homedir()): string {
  return path.join(getConfigDir(env, home), 'user.json');
}

export interface RepoConfig {
  url: string;
  name: string;
  path: string;
  sourceDir?: import('./project-config.js').SourceDirConfig;
}

export interface ToolProfile {
  tools: string[];
}

export interface Config {
  version?: number;
  currentRepo?: string; // name of the current repo
  repos: Record<string, RepoConfig>;
  profiles?: Record<string, ToolProfile>;
  completionInstalled?: boolean; // whether shell completion setup has been handled
  // Optional custom path for user.json (supports dotfiles integration)
  userConfigPath?: string;
}

export async function getConfig(): Promise<Config> {
  const configFile = getConfigFilePath();
  if (!await fs.pathExists(configFile)) return { repos: {} };
  let config: Record<string, unknown>;
  try {
    config = await fs.readJson(configFile);
  } catch (error: any) {
    throw new Error(`Failed to read ${configFile}: ${error.message}`);
  }
  assertSupportedConfigVersion(config, configFile);
  return { repos: {}, ...config } as Config;
}

export async function setConfig(config: Partial<Config>) {
  const configDir = getConfigDir();
  await fs.ensureDir(configDir);
  const current = await getConfig();
  const newConfig = { ...current, ...config } as Config;

  // Ensure repos object exists if not present
  if (!newConfig.repos) {
      newConfig.repos = {};
  }

  await fs.writeJson(getConfigFilePath(), { version: CURRENT_CONFIG_VERSION, ...newConfig }, { spaces: 2 });
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

  return getUserConfigDefaultPath();
}

/**
 * Get the user project config (stored in user.json).
 */
export async function getUserProjectConfig(): Promise<import('./project-config.js').ProjectConfig> {
  const userPath = await getUserConfigPath();
  if (!await fs.pathExists(userPath)) return {};
  let config: Record<string, unknown>;
  try {
    config = await fs.readJson(userPath);
  } catch (error: any) {
    throw new Error(`Failed to read ${userPath}: ${error.message}`);
  }
  assertSupportedConfigVersion(config, userPath);
  return config as import('./project-config.js').ProjectConfig;
}

/**
 * Save the user project config to user.json.
 */
export async function saveUserProjectConfig(projectConfig: import('./project-config.js').ProjectConfig): Promise<void> {
  const userPath = await getUserConfigPath();
  await fs.ensureDir(path.dirname(userPath));
  await fs.writeJson(userPath, { version: CURRENT_CONFIG_VERSION, ...projectConfig }, { spaces: 2 });
}
