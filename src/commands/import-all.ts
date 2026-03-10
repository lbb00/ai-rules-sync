import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { execa } from 'execa';
import { RepoConfig } from '../config.js';
import { SyncAdapter, AdapterRegistry } from '../adapters/types.js';
import { importEntryNoCommit, ImportedEntryInfo } from '../sync-engine.js';
import { addIgnoreEntry } from '../utils.js';
import { addUserDependency, getRepoSourceConfig, getSourceDir } from '../project-config.js';

/**
 * Simple yes/no prompt using readline
 */
async function prompt(question: string, defaultAnswer: boolean = true): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        const defaultHint = defaultAnswer ? '[Y/n]' : '[y/N]';
        rl.question(`${question} ${defaultHint}: `, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            if (normalized === '') {
                resolve(defaultAnswer);
            } else {
                resolve(normalized === 'y' || normalized === 'yes');
            }
        });
    });
}

/**
 * Represents a discovered entry in the project's target directory
 */
export interface DiscoveredProjectEntry {
    adapter: SyncAdapter;
    sourceName: string;      // Filename or dirname in project
    entryName: string;       // Without suffix (for config)
    sourcePath: string;      // Full path in project
    isDirectory: boolean;
    suffix?: string;
    alreadyInRepo: boolean;
}

/**
 * Options for import-all command
 */
export interface ImportAllOptions {
    dryRun?: boolean;
    force?: boolean;
    interactive?: boolean;
    user?: boolean;
    push?: boolean;
    message?: string;
    quiet?: boolean;
    isLocal?: boolean;
}

/**
 * Result of import-all operation
 */
export interface ImportAllResult {
    imported: number;
    skipped: number;
    errors: Array<{ entry: string; error: string }>;
}

/**
 * Discover entries in the project's target directory for a single adapter
 */
export async function discoverProjectEntriesForAdapter(
    adapter: SyncAdapter,
    repo: RepoConfig,
    projectPath: string,
    isUser: boolean
): Promise<DiscoveredProjectEntry[]> {
    const entries: DiscoveredProjectEntry[] = [];

    // Determine which target directory to scan
    const targetDirPath = isUser
        ? (adapter.userTargetDir || adapter.targetDir)
        : adapter.targetDir;

    const absoluteProjectPath = path.resolve(projectPath);
    const scanDir = path.join(absoluteProjectPath, targetDirPath);

    // Check if target directory exists
    if (!await fs.pathExists(scanDir)) {
        return entries;
    }

    // Determine repo destination directory for "already exists" checks
    const repoDir = repo.path;
    const repoConfig = await getRepoSourceConfig(repoDir);
    const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
    const repoSourcePath = path.join(repoDir, sourceDir);

    // Read directory contents
    let items: string[];
    try {
        items = await fs.readdir(scanDir);
    } catch (e: any) {
        return entries;
    }

    // Filter out hidden files/directories
    items = items.filter(item => !item.startsWith('.'));

    for (const item of items) {
        const itemPath = path.join(scanDir, item);
        let stats;

        try {
            stats = await fs.lstat(itemPath);
        } catch (e) {
            continue;
        }

        // Skip symlinks - they're already managed by ais
        if (stats.isSymbolicLink()) {
            continue;
        }

        const isDirectory = stats.isDirectory();

        // Apply adapter mode filters (same logic as add-all but scanning project dir)
        if (adapter.mode === 'file') {
            if (isDirectory) continue;

            const suffixes = adapter.fileSuffixes || [];
            let matched = false;
            let matchedSuffix: string | undefined;

            for (const suffix of suffixes) {
                if (item.endsWith(suffix)) {
                    matched = true;
                    matchedSuffix = suffix;
                    break;
                }
            }

            if (!matched) continue;

            const entryName = matchedSuffix ? item.slice(0, -matchedSuffix.length) : item;
            const alreadyInRepo = await fs.pathExists(path.join(repoSourcePath, item));

            entries.push({
                adapter,
                sourceName: item,
                entryName,
                sourcePath: itemPath,
                isDirectory: false,
                suffix: matchedSuffix,
                alreadyInRepo
            });
        } else if (adapter.mode === 'directory') {
            if (!isDirectory) continue;

            const alreadyInRepo = await fs.pathExists(path.join(repoSourcePath, item));

            entries.push({
                adapter,
                sourceName: item,
                entryName: item,
                sourcePath: itemPath,
                isDirectory: true,
                alreadyInRepo
            });
        } else if (adapter.mode === 'hybrid') {
            const hybridSuffixes = adapter.hybridFileSuffixes || [];

            if (isDirectory) {
                const alreadyInRepo = await fs.pathExists(path.join(repoSourcePath, item));

                entries.push({
                    adapter,
                    sourceName: item,
                    entryName: item,
                    sourcePath: itemPath,
                    isDirectory: true,
                    alreadyInRepo
                });
            } else {
                let matched = false;
                let matchedSuffix: string | undefined;

                for (const suffix of hybridSuffixes) {
                    if (item.endsWith(suffix)) {
                        matched = true;
                        matchedSuffix = suffix;
                        break;
                    }
                }

                if (!matched) continue;

                const entryName = matchedSuffix ? item.slice(0, -matchedSuffix.length) : item;
                const alreadyInRepo = await fs.pathExists(path.join(repoSourcePath, item));

                entries.push({
                    adapter,
                    sourceName: item,
                    entryName,
                    sourcePath: itemPath,
                    isDirectory: false,
                    suffix: matchedSuffix,
                    alreadyInRepo
                });
            }
        }
    }

    return entries;
}

/**
 * Discover all importable entries across adapters
 */
export async function discoverAllProjectEntries(
    projectPath: string,
    repo: RepoConfig,
    adapterRegistry: AdapterRegistry,
    options?: { adapters?: string[]; user?: boolean }
): Promise<DiscoveredProjectEntry[]> {
    const allEntries: DiscoveredProjectEntry[] = [];

    let adapters: SyncAdapter[];
    if (options?.adapters && options.adapters.length > 0) {
        adapters = options.adapters
            .map(name => adapterRegistry.getByName(name))
            .filter((a): a is SyncAdapter => a !== undefined);
    } else {
        adapters = adapterRegistry.all();
    }

    for (const adapter of adapters) {
        const entries = await discoverProjectEntriesForAdapter(
            adapter, repo, projectPath, options?.user || false
        );
        allEntries.push(...entries);
    }

    return allEntries;
}

/**
 * Import discovered entries in batch, with a single git commit
 */
export async function importDiscoveredEntries(
    projectPath: string,
    entries: DiscoveredProjectEntry[],
    repo: RepoConfig,
    options: ImportAllOptions
): Promise<ImportAllResult> {
    const result: ImportAllResult = {
        imported: 0,
        skipped: 0,
        errors: []
    };

    const importedInfos: ImportedEntryInfo[] = [];

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const progress = `[${i + 1}/${entries.length}]`;

        // Skip if already in repo (unless --force)
        if (entry.alreadyInRepo && !options.force) {
            if (!options.interactive) {
                if (!options.quiet) {
                    console.log(chalk.yellow(`${progress} ${entry.adapter.name}/${entry.sourceName} (already in repo)`));
                }
                result.skipped++;
                continue;
            }
        }

        // Interactive mode: prompt for each entry
        if (options.interactive) {
            const typeLabel = entry.isDirectory ? ' (directory)' : '';
            const alreadyLabel = entry.alreadyInRepo ? ' [already in repo]' : '';
            const shouldImport = await prompt(
                `Import ${entry.adapter.name}/${entry.sourceName}${typeLabel}${alreadyLabel}?`,
                !entry.alreadyInRepo
            );

            if (!shouldImport) {
                if (!options.quiet) {
                    console.log(chalk.gray(`${progress} Skipped`));
                }
                result.skipped++;
                continue;
            }
        }

        // Dry run: just log what would be done
        if (options.dryRun) {
            const typeLabel = entry.isDirectory ? ' (dir)' : '';
            const forceLabel = entry.alreadyInRepo && options.force ? ' [overwrite]' : '';
            console.log(`${progress} ${entry.adapter.name}/${entry.sourceName}${typeLabel}${forceLabel}`);
            result.imported++;
            continue;
        }

        // Actually import the entry (copy + symlink, no commit)
        try {
            const info = await importEntryNoCommit(entry.adapter, {
                projectPath,
                name: entry.sourceName,
                repo,
                isLocal: options.isLocal || false,
                force: options.force,
            });

            importedInfos.push(info);

            if (!options.quiet) {
                const typeLabel = entry.isDirectory ? ' (dir)' : '';
                console.log(chalk.green(`${progress} ${entry.adapter.name}/${entry.sourceName}${typeLabel} -> repo`));
            }

            // Handle config registration and gitignore
            if (options.user) {
                await addUserDependency(
                    entry.adapter.configPath,
                    entry.sourceName,
                    repo.url,
                    undefined,
                    undefined
                );
            } else {
                await entry.adapter.addDependency(
                    projectPath,
                    entry.sourceName,
                    repo.url,
                    undefined,
                    options.isLocal || false
                );

                // Gitignore management
                const targetDirPath = entry.adapter.targetDir;
                const relEntry = `${targetDirPath}/${info.targetName}`;
                if (options.isLocal) {
                    const gitInfoExclude = path.join(projectPath, '.git', 'info', 'exclude');
                    if (await fs.pathExists(path.dirname(gitInfoExclude))) {
                        await fs.ensureFile(gitInfoExclude);
                        await addIgnoreEntry(gitInfoExclude, relEntry, '# AI Rules Sync');
                    }
                } else {
                    const gitignorePath = path.join(projectPath, '.gitignore');
                    await addIgnoreEntry(gitignorePath, relEntry, '# AI Rules Sync');
                }
            }

            result.imported++;
        } catch (error: any) {
            result.errors.push({
                entry: `${entry.adapter.name}/${entry.sourceName}`,
                error: error.message
            });

            if (!options.quiet) {
                console.log(chalk.red(`${progress} ${entry.adapter.name}/${entry.sourceName} (${error.message})`));
            }
        }
    }

    // Batch git commit if we actually imported anything
    if (!options.dryRun && importedInfos.length > 0) {
        const repoDir = repo.path;

        // Git add all imported entries
        const relativePaths = importedInfos.map(info => info.repoRelativePath);
        await execa('git', ['add', ...relativePaths], { cwd: repoDir });

        // Check if there are staged changes to commit
        const hasStagedChanges = (await execa('git', ['diff', '--cached', '--stat'], { cwd: repoDir })).stdout.trim().length > 0;

        if (hasStagedChanges) {
            // Determine commit message
            let commitMessage: string;
            if (options.message) {
                commitMessage = options.message;
            } else {
                const importedEntries = entries.filter(e =>
                    importedInfos.some(info => info.name === e.sourceName)
                );
                const uniqueAdapters = [...new Set(importedEntries.map(e => `${e.adapter.tool} ${e.adapter.subtype}`))];
                const label = uniqueAdapters.length === 1
                    ? uniqueAdapters[0]
                    : 'entries';
                commitMessage = `Import ${importedInfos.length} ${label}`;
            }

            await execa('git', ['commit', '-m', commitMessage], { cwd: repoDir, stdio: 'inherit' });

            if (!options.quiet) {
                console.log(chalk.green(`Committed ${importedInfos.length} entries to rules repository.`));
            }
        } else if (!options.quiet) {
            console.log(chalk.gray(`Repository already up to date (no content changes).`));
        }

        if (options.push) {
            console.log(chalk.gray('Pushing to remote repository...'));
            await execa('git', ['push'], { cwd: repoDir, stdio: 'inherit' });
            if (!options.quiet) {
                console.log(chalk.green(`Pushed to remote repository.`));
            }
        }
    }

    return result;
}

/**
 * Main handler for import-all command
 */
export async function handleImportAll(
    projectPath: string,
    repo: RepoConfig,
    adapterRegistry: AdapterRegistry,
    options: ImportAllOptions & { adapters?: string[] }
): Promise<ImportAllResult> {
    if (!options.quiet) {
        console.log(chalk.gray('Discovering entries in project...'));
    }

    const entries = await discoverAllProjectEntries(projectPath, repo, adapterRegistry, {
        adapters: options.adapters,
        user: options.user
    });

    if (entries.length === 0) {
        if (!options.quiet) {
            console.log(chalk.yellow('No importable entries found in project.'));
        }
        return { imported: 0, skipped: 0, errors: [] };
    }

    // Group by adapter for summary
    if (!options.quiet && !options.dryRun) {
        const groupedCounts = new Map<string, number>();
        for (const entry of entries) {
            const count = groupedCounts.get(entry.adapter.name) || 0;
            groupedCounts.set(entry.adapter.name, count + 1);
        }

        for (const [adapterName, count] of groupedCounts) {
            console.log(chalk.gray(`  ${adapterName}: ${count} entries`));
        }
        console.log(chalk.gray(`Total: ${entries.length} entries discovered\n`));
    }

    // Dry run header
    if (options.dryRun) {
        console.log(chalk.bold('[DRY RUN] Would import:\n'));
    } else if (!options.quiet) {
        console.log(chalk.gray('Importing entries:\n'));
    }

    const result = await importDiscoveredEntries(projectPath, entries, repo, options);

    // Dry run footer
    if (options.dryRun) {
        console.log(chalk.gray(`\nTotal: ${result.imported} entries would be imported`));
        console.log(chalk.gray('Run without --dry-run to perform import'));
    }

    return result;
}
