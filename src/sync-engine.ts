import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execa } from 'execa';
import { RepoConfig } from './config.js';
import { SyncAdapter, LinkResult, SyncOptions } from './adapters/types.js';
import { addIgnoreEntry, removeIgnoreEntry } from './utils.js';
import { getRepoSourceConfig, getSourceDir, getCombinedProjectConfig, getTargetDir } from './project-config.js';

/**
 * Generic sync engine that works with any SyncAdapter
 */

/**
 * Link an entry using the specified adapter
 */
export async function linkEntry(
    adapter: SyncAdapter,
    options: SyncOptions
): Promise<LinkResult> {
    const { projectPath, name, repo, alias, isLocal = false } = options;
    const repoDir = repo.path;

    // Get source directory from repo config
    const repoConfig = await getRepoSourceConfig(repoDir);
    const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);

    // Resolve source
    let sourceName: string;
    let sourcePath: string;
    let suffix: string | undefined;

    if (adapter.resolveSource) {
        const resolved = await adapter.resolveSource(repoDir, sourceDir, name);
        sourceName = resolved.sourceName;
        sourcePath = resolved.sourcePath;
        suffix = resolved.suffix;
    } else {
        // Default resolution
        sourcePath = path.join(repoDir, sourceDir, name);
        if (!await fs.pathExists(sourcePath)) {
            throw new Error(`Entry "${name}" not found in repository.`);
        }
        sourceName = name;
    }

    // Resolve target name
    let targetName: string;
    if (adapter.resolveTargetName) {
        targetName = adapter.resolveTargetName(name, alias, suffix);
    } else {
        targetName = alias || name;
    }

    const absoluteProjectPath = path.resolve(projectPath);

    // Determine target directory
    // Priority: options.targetDir > config entry targetDir > adapter default
    let targetDirPath: string;
    if (options.targetDir) {
        // Use targetDir from options (highest priority - for add command)
        targetDirPath = path.normalize(options.targetDir);
    } else {
        // Check config for existing entry targetDir, or use adapter default
        try {
            const projectConfig = await getCombinedProjectConfig(projectPath);
            targetDirPath = getTargetDir(
                projectConfig,
                adapter.tool,
                adapter.subtype,
                targetName,
                adapter.targetDir
            );
        } catch (e) {
            // If config doesn't exist or can't be read, use adapter default
            targetDirPath = adapter.targetDir;
        }
    }

    // Ensure we always have a valid targetDirPath
    if (!targetDirPath) {
        targetDirPath = adapter.targetDir;
    }

    // In user/global mode, use userTargetDir if the adapter defines one
    if (options.skipIgnore && adapter.userTargetDir) {
        targetDirPath = adapter.userTargetDir;
    }

    const targetDir = path.join(absoluteProjectPath, targetDirPath);
    const targetPath = path.join(targetDir, targetName);

    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    // Create symlink
    if (await fs.pathExists(targetPath)) {
        const stats = await fs.lstat(targetPath);
        if (stats.isSymbolicLink()) {
            console.log(chalk.yellow(`Entry "${targetName}" already linked. Re-linking...`));
            await fs.remove(targetPath);
        } else {
            console.log(chalk.yellow(`Warning: "${targetPath}" exists and is not a symlink. Skipping to avoid data loss.`));
            return { sourceName, targetName, linked: false };
        }
    }

    await fs.ensureSymlink(sourcePath, targetPath);
    console.log(chalk.green(`Linked "${sourceName}" to project as "${targetName}".`));

    // Handle ignore file (skip for global mode)
    if (!options.skipIgnore) {
        const ignoreEntry = `${targetDirPath}/${targetName}`;
        await handleIgnoreEntry(absoluteProjectPath, ignoreEntry, isLocal, true);
    }

    return { sourceName, targetName, linked: true };
}

/**
 * Unlink an entry using the specified adapter
 */
export async function unlinkEntry(
    adapter: SyncAdapter,
    projectPath: string,
    alias: string
): Promise<void> {
    const absoluteProjectPath = path.resolve(projectPath);

    // Get target directory from project config (for unlink, always read from config)
    const projectConfig = await getCombinedProjectConfig(projectPath);
    const targetDirPath = getTargetDir(
        projectConfig,
        adapter.tool,
        adapter.subtype,
        alias,
        adapter.targetDir
    );

    const targetDir = path.join(absoluteProjectPath, targetDirPath);

    // Try to find the actual file - it may have a suffix added
    let actualFileName = alias;
    let targetPath = path.join(targetDir, alias);

    if (!await fs.pathExists(targetPath)) {
        // Try with common suffixes for file-based adapters
        const suffixes = adapter.fileSuffixes || adapter.hybridFileSuffixes;
        if (suffixes) {
            for (const suffix of suffixes) {
                if (!alias.endsWith(suffix)) {
                    const candidatePath = path.join(targetDir, `${alias}${suffix}`);
                    if (await fs.pathExists(candidatePath)) {
                        actualFileName = `${alias}${suffix}`;
                        targetPath = candidatePath;
                        break;
                    }
                }
            }
        }
    }

    // Remove symlink/file
    if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
        console.log(chalk.green(`Removed "${alias}" from project.`));
    } else {
        console.log(chalk.yellow(`Entry "${alias}" not found in project.`));
    }

    // Remove from ignore files (try both with and without suffix)
    const ignoreEntries = [
        `${targetDirPath}/${alias}`,
        `${targetDirPath}/${actualFileName}`
    ];

    const gitignorePath = path.join(absoluteProjectPath, '.gitignore');
    for (const ignoreEntry of ignoreEntries) {
        if (await removeIgnoreEntry(gitignorePath, ignoreEntry)) {
            console.log(chalk.green(`Removed "${ignoreEntry}" from .gitignore.`));
        }
    }

    const gitInfoExclude = path.join(absoluteProjectPath, '.git', 'info', 'exclude');
    for (const ignoreEntry of ignoreEntries) {
        if (await removeIgnoreEntry(gitInfoExclude, ignoreEntry)) {
            console.log(chalk.green(`Removed "${ignoreEntry}" from .git/info/exclude.`));
        }
    }
}

/**
 * Handle adding/removing entries from ignore files
 */
async function handleIgnoreEntry(
    projectPath: string,
    entry: string,
    isLocal: boolean,
    add: boolean
): Promise<void> {
    let ignoreFilePath: string;
    let isPrivate = false;

    if (isLocal) {
        const gitInfoExclude = path.join(projectPath, '.git', 'info', 'exclude');
        if (await fs.pathExists(path.dirname(gitInfoExclude))) {
            ignoreFilePath = gitInfoExclude;
            isPrivate = true;
            if (!await fs.pathExists(ignoreFilePath)) {
                await fs.createFile(ignoreFilePath);
            }
        } else {
            console.log(chalk.yellow(`Warning: Could not find .git/info/exclude. Skipping automatic ignore for private entry.`));
            console.log(chalk.yellow(`Please manually add "${entry}" to your private ignore file.`));
            return;
        }
    } else {
        ignoreFilePath = path.join(projectPath, '.gitignore');
        isPrivate = false;
    }

    if (add) {
        const added = await addIgnoreEntry(ignoreFilePath, entry, '# AI Rules Sync');
        const fileName = isPrivate ? '.git/info/exclude' : '.gitignore';

        if (added) {
            console.log(chalk.green(`Added "${entry}" to ${fileName}.`));
        } else {
            console.log(chalk.gray(`"${entry}" already in ${fileName}.`));
        }
    }
}

/**
 * Import options extending SyncOptions
 */
export interface ImportOptions extends SyncOptions {
    commitMessage?: string;
    force?: boolean;
    push?: boolean;
}

/**
 * Import an entry from project to rules repository
 * This is the reverse operation of link - it copies local files to the repo,
 * commits them, removes the originals, and creates symlinks back.
 */
export async function importEntry(
    adapter: SyncAdapter,
    options: ImportOptions
): Promise<{ imported: boolean; sourceName: string; targetName: string }> {
    const { projectPath, name, repo, force = false, push = false, commitMessage } = options;

    const absoluteProjectPath = path.resolve(projectPath);

    // Determine target path in project
    const projectConfig = await getCombinedProjectConfig(projectPath);
    const targetDirPath = getTargetDir(
        projectConfig,
        adapter.tool,
        adapter.subtype,
        name,
        adapter.targetDir
    );
    const targetPath = path.join(absoluteProjectPath, targetDirPath, name);

    // Determine destination path in repo (needed for git operations)
    const repoDir = repo.path;
    const repoConfig = await getRepoSourceConfig(repoDir);
    const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
    const destPath = path.join(repoDir, sourceDir, name);
    const relativePath = path.relative(repoDir, destPath);

    // Delegate all fs operations (copy, remove, symlink) to manager.import()
    const manager = adapter.forProject(projectPath, repo, options.isLocal);
    const linkResult = await manager.import(targetPath, name, {
        force,
        repoUrl: repo.url,
    });
    const sourceName = linkResult.sourceName;
    const targetName = linkResult.targetName;

    // Git add and commit (ai-rules-sync specific, stays in sync-engine)
    await execa('git', ['add', relativePath], { cwd: repoDir });
    const message = commitMessage || `Import ${adapter.tool} ${adapter.subtype}: ${name}`;
    await execa('git', ['commit', '-m', message], { cwd: repoDir, stdio: 'inherit' });
    console.log(chalk.green(`Committed to rules repository.`));

    if (push) {
        console.log(chalk.gray('Pushing to remote repository...'));
        await execa('git', ['push'], { cwd: repoDir, stdio: 'inherit' });
        console.log(chalk.green(`Pushed to remote repository.`));
    }

    return { imported: true, sourceName, targetName };
}
