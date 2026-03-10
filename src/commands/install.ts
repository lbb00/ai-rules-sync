/**
 * Generic install function that works with any adapter
 */

import path from 'path';
import os from 'os';
import chalk from 'chalk';
import fs from 'fs-extra';
import { SyncAdapter } from '../adapters/types.js';
import { RuleEntry } from '../project-config.js';
import { getConfig, setConfig, getReposBaseDir, getUserProjectConfig, getUserConfigPath, RepoConfig } from '../config.js';
import { cloneOrUpdateRepo } from '../git.js';
import { parseConfigEntry } from './helpers.js';
import { isLocalPath, resolveLocalPath } from '../utils.js';
import type { RepoResolverFn } from '../dotany/types.js';

/**
 * Find or create a repo configuration
 */
async function findOrCreateRepo(
    repos: Record<string, RepoConfig>,
    repoUrl: string,
    entryName: string
): Promise<RepoConfig> {
    // Check if repo already exists (by url or by path for local repos)
    for (const k in repos) {
        if (repos[k].url === repoUrl) {
            const repo = repos[k];
            if (!await fs.pathExists(repo.path)) {
                await cloneOrUpdateRepo(repo);
            }
            return repo;
        }
        if (path.resolve(repos[k].path) === path.resolve(repoUrl)) {
            return repos[k];
        }
    }

    // Local path: use directly if it exists
    if (isLocalPath(repoUrl)) {
        const resolvedPath = await resolveLocalPath(repoUrl, process.cwd());
        if (resolvedPath) {
            let name = path.basename(resolvedPath) || `repo-${Date.now()}`;
            if (repos[name]) name = `${name}-${Date.now()}`;
            const repoConfig: RepoConfig = { name, url: resolvedPath, path: resolvedPath };
            await setConfig({ repos: { ...repos, [name]: repoConfig } });
            repos[name] = repoConfig;
            return repoConfig;
        }
        throw new Error(
            `Local repository path "${repoUrl}" does not exist. ` +
            `Run "ais use <path>" first if this is a shared project.`
        );
    }

    // Create new repo config (remote URL)
    console.log(chalk.yellow(`Repository for ${entryName} not found locally. Configuring...`));

    let name = path.basename(repoUrl, '.git');
    if (!name) name = `repo-${Date.now()}`;
    if (repos[name]) name = `${name}-${Date.now()}`;

    const repoDir = path.join(getReposBaseDir(), name);
    const repoConfig: RepoConfig = { name, url: repoUrl, path: repoDir };

    await setConfig({ repos: { ...repos, [name]: repoConfig } });
    repos[name] = repoConfig;
    await cloneOrUpdateRepo(repoConfig);

    return repoConfig;
}

/**
 * Generic install function - works with any adapter.
 * Uses manager.apply() from the dotfile API.
 */
export async function installEntriesForAdapter(
    adapter: SyncAdapter,
    projectPath: string
): Promise<void> {
    const globalConfig = await getConfig();
    const repos = globalConfig.repos || {};

    const repoResolver: RepoResolverFn = (repoUrl: string, entryName: string) =>
        findOrCreateRepo(repos, repoUrl, entryName);

    const manager = adapter.forProject(projectPath, repoResolver);
    const result = await manager.apply();

    if (result.linked.length === 0 && result.skipped.length === 0) {
        console.log(chalk.yellow(`No ${adapter.tool} ${adapter.subtype} found in ai-rules-sync*.json.`));
        return;
    }

    console.log(chalk.green(`All ${adapter.tool} ${adapter.subtype} installed successfully.`));
}

/**
 * Install all entries for a tool (all subtypes)
 */
export async function installEntriesForTool(
    adapters: SyncAdapter[],
    projectPath: string
): Promise<void> {
    for (const adapter of adapters) {
        await installEntriesForAdapter(adapter, projectPath);
    }
}

/**
 * Install entries for an adapter from user config (user.json)
 */
export async function installUserEntriesForAdapter(
    adapter: SyncAdapter
): Promise<void> {
    const userConfig = await getUserProjectConfig();
    const [topLevel, subLevel] = adapter.configPath;
    const entries = (userConfig as any)?.[topLevel]?.[subLevel] as Record<string, RuleEntry> | undefined;

    if (!entries || Object.keys(entries).length === 0) {
        console.log(chalk.yellow(`No user ${adapter.tool} ${adapter.subtype} found in user config.`));
        return;
    }

    const config = await getConfig();
    const repos = config.repos || {};
    const projectPath = os.homedir();

    for (const [key, value] of Object.entries(entries)) {
        const { repoUrl, entryName, alias } = parseConfigEntry(key, value);

        console.log(chalk.blue(`Installing ${adapter.tool} ${adapter.subtype} "${entryName}" (as "${key}") from ${repoUrl}...`));

        const repoConfig = await findOrCreateRepo(repos, repoUrl, entryName);

        const targetDir = typeof value === 'object' && value.targetDir ? value.targetDir : undefined;

        await adapter.link({
            projectPath,
            name: entryName,
            repo: repoConfig,
            alias,
            isLocal: false,
            targetDir,
            skipIgnore: true
        });
    }

    console.log(chalk.green(`All user ${adapter.tool} ${adapter.subtype} installed successfully.`));
}

/**
 * Install all user entries for all adapters
 */
export async function installAllUserEntries(
    adapters: SyncAdapter[]
): Promise<{ total: number }> {
    const userConfigPath = await getUserConfigPath();
    const userConfig = await getUserProjectConfig();

    let total = 0;

    for (const adapter of adapters) {
        const [topLevel, subLevel] = adapter.configPath;
        const entries = (userConfig as any)?.[topLevel]?.[subLevel] as Record<string, RuleEntry> | undefined;
        if (entries && Object.keys(entries).length > 0) {
            await installUserEntriesForAdapter(adapter);
            total += Object.keys(entries).length;
        }
    }

    if (total === 0) {
        console.log(chalk.yellow(`No user config found. Use "ais claude md add <name> --user" to add entries.`));
    } else {
        const displayPath = userConfigPath.replace(os.homedir(), '~');
        console.log(chalk.gray(`\nUser config: ${displayPath}`));
        console.log(chalk.green(`Installed ${total} entries.`));
    }

    return { total };
}
