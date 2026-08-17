/**
 * Command helper functions extracted from index.ts
 */

import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import { getConfig, setConfig, getReposBaseDir, getCurrentRepo, RepoConfig } from '../config.js';
import { cloneOrUpdateRepo, getRemoteUrl } from '../git.js';
import { isLocalPath, resolveLocalPath } from '../utils.js';

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

    // 3. Try as local path
    if (isLocalPath(target)) {
      const resolvedPath = await resolveLocalPath(target, process.cwd());
      if (!resolvedPath) {
        throw new Error(`Path "${target}" does not exist or is not a directory.`);
      }
      const remoteUrl = await getRemoteUrl(resolvedPath);
      const isGit = await fs.pathExists(path.join(resolvedPath, '.git'));

      if (isGit && remoteUrl) {
        // Git repo with remote: symlink to repos/ and use remote URL
        let name = path.basename(resolvedPath) || 'local-repo';
        const symlinkPath = path.join(getReposBaseDir(), name);

        if (config.repos) {
          for (const repo of Object.values(config.repos)) {
            if (repo.url === remoteUrl) return repo;
            if (path.resolve(repo.path) === path.resolve(resolvedPath)) return repo;
            if (path.resolve(await fs.realpath(repo.path).catch(() => '')) === path.resolve(resolvedPath)) return repo;
          }
        }

        if (await fs.pathExists(symlinkPath)) {
          const stat = await fs.lstat(symlinkPath);
          if (stat.isSymbolicLink()) {
            const symTarget = await fs.realpath(symlinkPath);
            if (path.resolve(symTarget) === path.resolve(resolvedPath)) {
              const repo = config.repos?.[name] ?? { name, url: remoteUrl, path: symlinkPath };
              await setConfig({ repos: { ...(config.repos || {}), [name]: repo } });
              return repo;
            }
          }
          throw new Error(
            `Repository "${name}" already exists at ${symlinkPath}. ` +
            `Use "ais use ${name}" or remove it first.`
          );
        }

        for (const repo of Object.values(config.repos || {})) {
          if (repo.url === remoteUrl) {
            throw new Error(`Repository with remote "${remoteUrl}" is already configured. Use "ais use <name>".`);
          }
        }

        await fs.ensureDir(getReposBaseDir());
        await fs.symlink(resolvedPath, symlinkPath);
        const newRepo: RepoConfig = { name, url: remoteUrl, path: symlinkPath };
        await setConfig({ repos: { ...(config.repos || {}), [name]: newRepo } });
        await cloneOrUpdateRepo(newRepo);
        return newRepo;
      }

      // Non-git or no remote: use path directly
      if (config.repos) {
        for (const repo of Object.values(config.repos)) {
          if (path.resolve(repo.path) === path.resolve(resolvedPath)) return repo;
        }
      }
      console.log(chalk.blue(`Using local repository at ${resolvedPath}`));
      let name = path.basename(resolvedPath) || 'local-repo';
      if (config.repos && config.repos[name] && config.repos[name].path !== resolvedPath) {
        name = `${name}-${Date.now()}`;
      }
      const url = remoteUrl || resolvedPath;
      const newRepo: RepoConfig = { name, url, path: resolvedPath };
      await setConfig({ repos: { ...(config.repos || {}), [name]: newRepo } });
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
