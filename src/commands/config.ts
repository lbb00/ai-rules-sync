/**
 * Config management commands
 * Manage global sourceDir configuration for repositories
 */

import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { getConfig, setConfig, getUserConfigPath } from '../config.js';
import { SourceDirConfig } from '../project-config.js';

export interface QueryOutputOptions {
    json?: boolean;
}

/**
 * Set sourceDir for a repository
 * @param repoName - Repository name
 * @param toolSubtype - Format: "tool.subtype" (e.g., "cursor.rules")
 * @param sourcePath - Source path to set
 */
export async function setRepoSourceDir(
    repoName: string,
    toolSubtype: string,
    sourcePath: string
): Promise<void> {
    const config = await getConfig();
    const repo = config.repos[repoName];

    if (!repo) {
        throw new Error(`Repository "${repoName}" not found`);
    }

    // Parse tool.subtype
    const [tool, subtype] = toolSubtype.split('.');
    if (!tool || !subtype) {
        throw new Error(`Invalid format. Use: <tool>.<subtype> (e.g., cursor.rules)`);
    }

    // Initialize sourceDir structure
    repo.sourceDir ??= {};
    (repo.sourceDir as any)[tool] ??= {};
    (repo.sourceDir as any)[tool][subtype] = sourcePath;

    await setConfig(config);
    console.log(chalk.green(`✓ Set ${repoName}.sourceDir.${tool}.${subtype} = "${sourcePath}"`));
}

/**
 * Clear sourceDir for a repository
 * @param repoName - Repository name
 * @param toolSubtype - Optional format: "tool.subtype". If not provided, clears all sourceDir
 */
export async function clearRepoSourceDir(
    repoName: string,
    toolSubtype?: string
): Promise<void> {
    const config = await getConfig();
    const repo = config.repos[repoName];

    if (!repo) {
        throw new Error(`Repository "${repoName}" not found`);
    }

    if (!toolSubtype) {
        // Clear all sourceDir
        delete repo.sourceDir;
        await setConfig(config);
        console.log(chalk.green(`✓ Cleared all sourceDir for repository "${repoName}"`));
        return;
    }

    const [tool, subtype] = toolSubtype.split('.');
    if (!tool || !subtype) {
        throw new Error(`Invalid format. Use: <tool>.<subtype>`);
    }

    if (repo.sourceDir && (repo.sourceDir as any)[tool]) {
        delete (repo.sourceDir as any)[tool][subtype];
        await setConfig(config);
        console.log(chalk.green(`✓ Cleared ${repoName}.sourceDir.${tool}.${subtype}`));
    } else {
        console.log(chalk.yellow(`sourceDir.${tool}.${subtype} not found for repository "${repoName}"`));
    }
}

/**
 * Show repository configuration
 * @param repoName - Repository name
 */
export async function showRepoConfig(repoName: string, options?: QueryOutputOptions): Promise<void> {
    const config = await getConfig();
    const repo = config.repos[repoName];

    if (!repo) {
        throw new Error(`Repository "${repoName}" not found`);
    }

    if (options?.json) {
        console.log(JSON.stringify({
            name: repoName,
            url: repo.url,
            path: repo.path,
            sourceDir: repo.sourceDir
        }, null, 2));
        return;
    }

    console.log(chalk.bold(`\nRepository: ${repoName}`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(JSON.stringify(repo, null, 2));
}

/**
 * List all repositories
 */
export async function listRepos(options?: QueryOutputOptions): Promise<void> {
    const config = await getConfig();
    const repos = config.repos || {};
    const names = Object.keys(repos);

    if (options?.json) {
        const repositories = names.map(name => {
            const repo = repos[name];
            return {
                name,
                url: repo.url,
                path: repo.path,
                sourceDir: repo.sourceDir,
                isCurrent: name === config.currentRepo
            };
        });
        console.log(JSON.stringify({
            currentRepo: config.currentRepo || null,
            repositories
        }, null, 2));
        return;
    }

    if (names.length === 0) {
        console.log(chalk.yellow('No repositories configured.'));
        return;
    }

    console.log(chalk.bold('Configured repositories:'));
    for (const name of names) {
        const repo = repos[name];
        const isCurrent = name === config.currentRepo;
        const prefix = isCurrent ? chalk.green('* ') : '  ';
        console.log(`${prefix}${chalk.cyan(name)}`);
        console.log(`    URL: ${chalk.gray(repo.url)}`);
        console.log(`    Path: ${chalk.gray(repo.path)}`);

        if (repo.sourceDir) {
            console.log(`    Source directories:`);
            for (const tool of Object.keys(repo.sourceDir)) {
                const toolConfig = (repo.sourceDir as any)[tool];
                for (const subtype of Object.keys(toolConfig)) {
                    console.log(`      ${chalk.yellow(`${tool}.${subtype}`)}: ${toolConfig[subtype]}`);
                }
            }
        }
    }
}

/**
 * Show the current user config path
 */
export async function handleUserConfigShow(): Promise<void> {
    const config = await getConfig();
    const userPath = await getUserConfigPath();
    const isCustom = !!config.userConfigPath;
    const displayPath = userPath.replace(os.homedir(), '~');
    const label = isCustom ? chalk.yellow('(custom)') : chalk.gray('(default)');
    console.log(`User config path: ${chalk.cyan(displayPath)} ${label}`);
}

/** @deprecated Use handleUserConfigShow() instead */
export async function handleGlobalConfigShow(): Promise<void> {
    return handleUserConfigShow();
}

/**
 * Set a custom user config path
 */
export async function handleUserConfigSet(customPath: string): Promise<void> {
    // Normalize: store with ~ if path starts with homedir
    const expanded = customPath.replace(/^~/, os.homedir());
    const stored = expanded.startsWith(os.homedir())
        ? `~${expanded.slice(os.homedir().length)}`
        : expanded;

    await setConfig({ userConfigPath: stored });
    console.log(chalk.green(`✓ User config path set to: ${chalk.cyan(stored)}`));
}

/** @deprecated Use handleUserConfigSet() instead */
export async function handleGlobalConfigSet(customPath: string): Promise<void> {
    return handleUserConfigSet(customPath);
}

/**
 * Reset user config path to default
 */
export async function handleUserConfigReset(): Promise<void> {
    const config = await getConfig();
    if (config.userConfigPath) {
        delete config.userConfigPath;
        await setConfig(config);
        console.log(chalk.green('✓ User config path reset to default.'));
    } else {
        console.log(chalk.gray('User config path is already at default.'));
    }
}

/** @deprecated Use handleUserConfigReset() instead */
export async function handleGlobalConfigReset(): Promise<void> {
    return handleUserConfigReset();
}
