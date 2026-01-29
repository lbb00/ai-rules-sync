/**
 * Config management commands
 * Manage global sourceDir configuration for repositories
 */

import chalk from 'chalk';
import { getConfig, setConfig } from '../config.js';
import { SourceDirConfig } from '../project-config.js';

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
export async function showRepoConfig(repoName: string): Promise<void> {
    const config = await getConfig();
    const repo = config.repos[repoName];

    if (!repo) {
        throw new Error(`Repository "${repoName}" not found`);
    }

    console.log(chalk.bold(`\nRepository: ${repoName}`));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(JSON.stringify(repo, null, 2));
}

/**
 * List all repositories
 */
export async function listRepos(): Promise<void> {
    const config = await getConfig();
    const repos = config.repos || {};
    const names = Object.keys(repos);

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
