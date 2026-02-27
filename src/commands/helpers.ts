/**
 * Command helper functions extracted from index.ts
 */

import path from 'path';
import chalk from 'chalk';
import { getConfig, setConfig, getReposBaseDir, getCurrentRepo, RepoConfig } from '../config.js';
import { cloneOrUpdateRepo } from '../git.js';
import { getCombinedProjectConfig, ProjectConfig } from '../project-config.js';
import { stripCopilotSuffix } from '../adapters/index.js';

/**
 * Get the target repository based on CLI options
 */
export async function getTargetRepo(options: { target?: string }): Promise<RepoConfig> {
  const config = await getConfig();

  if (options.target) {
    const target = options.target;

    // 1. Try as existing name
    if (config.repos && config.repos[target]) {
      return config.repos[target];
    }

    // 2. Try as URL
    if (target.includes('://') || target.includes('git@') || target.endsWith('.git')) {
      // Check if this URL is already configured under ANY name
      if (config.repos) {
        for (const [key, repo] of Object.entries(config.repos)) {
          if (repo.url === target) {
            return repo;
          }
        }
      }

      // Not found, add it
      console.log(chalk.blue(`Detected URL for target. Configuring repository...`));

      let name = path.basename(target, '.git');
      if (!name) name = 'repo-' + Date.now();

      // Handle name collision: if name exists but URL differs, append suffix
      if (config.repos && config.repos[name] && config.repos[name].url !== target) {
        name = `${name}-${Date.now()}`;
      }

      const repoDir = path.join(getReposBaseDir(), name);
      const newRepo: RepoConfig = {
        name,
        url: target,
        path: repoDir
      };

      await setConfig({
        repos: { ...(config.repos || {}), [name]: newRepo }
      });

      await cloneOrUpdateRepo(newRepo);
      return newRepo;
    }

    throw new Error(`Repository "${target}" not found in configuration.`);
  }

  const currentRepo = await getCurrentRepo();
  if (!currentRepo) {
    throw new Error('No repository configured. Please run "ais use [url]" first.');
  }
  return currentRepo;
}

export type DefaultMode =
  | 'cursor'
  | 'copilot'
  | 'claude'
  | 'trae'
  | 'opencode'
  | 'codex'
  | 'gemini'
  | 'warp'
  | 'windsurf'
  | 'cline'
  | 'agents-md'
  | 'ambiguous'
  | 'none';

/**
 * Infer the default mode based on project configuration
 */
export async function inferDefaultMode(projectPath: string): Promise<DefaultMode> {
  const cfg = await getCombinedProjectConfig(projectPath);
  const counts: Record<Exclude<DefaultMode, 'ambiguous' | 'none'>, number> = {
    cursor:
      Object.keys(cfg.cursor?.rules || {}).length +
      Object.keys(cfg.cursor?.commands || {}).length +
      Object.keys(cfg.cursor?.skills || {}).length +
      Object.keys(cfg.cursor?.agents || {}).length,
    copilot:
      Object.keys(cfg.copilot?.instructions || {}).length +
      Object.keys(cfg.copilot?.skills || {}).length +
      Object.keys(cfg.copilot?.prompts || {}).length +
      Object.keys(cfg.copilot?.agents || {}).length,
    claude:
      Object.keys(cfg.claude?.skills || {}).length +
      Object.keys(cfg.claude?.agents || {}).length +
      Object.keys(cfg.claude?.rules || {}).length +
      Object.keys(cfg.claude?.md || {}).length,
    trae:
      Object.keys(cfg.trae?.rules || {}).length +
      Object.keys(cfg.trae?.skills || {}).length,
    opencode:
      Object.keys(cfg.opencode?.agents || {}).length +
      Object.keys(cfg.opencode?.skills || {}).length +
      Object.keys(cfg.opencode?.commands || {}).length +
      Object.keys(cfg.opencode?.tools || {}).length,
    codex:
      Object.keys(cfg.codex?.rules || {}).length +
      Object.keys(cfg.codex?.skills || {}).length,
    gemini:
      Object.keys(cfg.gemini?.commands || {}).length +
      Object.keys(cfg.gemini?.skills || {}).length +
      Object.keys(cfg.gemini?.agents || {}).length,
    warp: Object.keys(cfg.warp?.skills || {}).length,
    windsurf: Object.keys(cfg.windsurf?.rules || {}).length,
    cline: Object.keys(cfg.cline?.rules || {}).length,
    'agents-md': Object.keys(cfg.agentsMd || {}).length
  };

  const activeModes = (Object.entries(counts) as [Exclude<DefaultMode, 'ambiguous' | 'none'>, number][])
    .filter(([, count]) => count > 0)
    .map(([mode]) => mode);

  if (activeModes.length === 0) return 'none';
  if (activeModes.length === 1) return activeModes[0];
  return 'ambiguous';
}

/**
 * Throw an error requiring explicit mode specification
 */
export function requireExplicitMode(mode: DefaultMode): never {
  const explicitTools = '"ais cursor ...", "ais copilot ...", "ais claude ...", "ais trae ...", "ais opencode ...", "ais codex ...", "ais gemini ...", "ais warp ...", "ais windsurf ...", "ais cline ...", or "ais agents-md ..."';
  if (mode === 'ambiguous') {
    throw new Error(`Multiple tool configs exist in this project. Please use ${explicitTools} explicitly.`);
  }
  throw new Error(`No default mode could be inferred. Please use ${explicitTools} explicitly.`);
}

/**
 * Resolve Copilot alias from config with suffix handling
 */
export function resolveCopilotAliasFromConfig(input: string, keys: string[]): string {
  if (input.endsWith('.md') || input.endsWith('.instructions.md')) return input;
  const matches = keys.filter(k => stripCopilotSuffix(k) === input);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Alias "${input}" matches multiple Copilot entries: ${matches.join(', ')}. Please specify the suffix explicitly.`);
  }
  return input;
}

/**
 * Strip .md suffix from command name
 */
export function stripCommandSuffix(name: string): string {
  if (name.endsWith('.md')) return name.slice(0, -'.md'.length);
  return name;
}

/**
 * Resolve command alias from config with suffix handling
 */
export function resolveCommandAliasFromConfig(input: string, keys: string[]): string {
  if (input.endsWith('.md')) return input;
  const matches = keys.filter(k => stripCommandSuffix(k) === input);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Alias "${input}" matches multiple command entries: ${matches.join(', ')}. Please specify the suffix explicitly.`);
  }
  return input;
}

/**
 * Parse a config entry to extract repo URL, entry name, and alias
 */
export function parseConfigEntry(key: string, value: string | { url: string; rule?: string }): {
  repoUrl: string;
  entryName: string;
  alias: string | undefined;
} {
  if (typeof value === 'string') {
    return {
      repoUrl: value,
      entryName: key,
      alias: undefined
    };
  } else {
    return {
      repoUrl: value.url,
      entryName: value.rule || key,
      alias: key
    };
  }
}
