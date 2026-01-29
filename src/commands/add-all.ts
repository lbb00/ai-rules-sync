import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import { RepoConfig } from '../config.js';
import { SyncAdapter, AdapterRegistry } from '../adapters/types.js';
import { getRepoSourceConfig, getSourceDir, getCombinedProjectConfig } from '../project-config.js';
import { linkEntry } from '../sync-engine.js';

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
 * Represents a discovered entry in the repository
 */
export interface DiscoveredEntry {
    adapter: SyncAdapter;
    sourceName: string;      // With suffix if file
    entryName: string;       // Without suffix (for config)
    sourcePath: string;      // Full path in repo
    isDirectory: boolean;
    suffix?: string;
    alreadyInConfig: boolean;
}

/**
 * Options for add-all command
 */
export interface AddAllOptions {
    target?: string;
    tools?: string[];
    adapters?: string[];
    dryRun?: boolean;
    force?: boolean;
    interactive?: boolean;
    isLocal?: boolean;
    skipExisting?: boolean;
    quiet?: boolean;
}

/**
 * Result of add-all operation
 */
export interface AddAllResult {
    installed: number;
    skipped: number;
    errors: Array<{ entry: string; error: string }>;
}

/**
 * Discover entries for a single adapter
 */
export async function discoverEntriesForAdapter(
    adapter: SyncAdapter,
    repo: RepoConfig,
    projectPath: string
): Promise<DiscoveredEntry[]> {
    const repoDir = repo.path;
    const entries: DiscoveredEntry[] = [];

    // Get source directory from repo config
    const repoConfig = await getRepoSourceConfig(repoDir);
    const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
    const sourceDirPath = path.join(repoDir, sourceDir);

    // Check if source directory exists
    if (!await fs.pathExists(sourceDirPath)) {
        return entries;
    }

    // Read project config to check what's already configured
    let projectConfig;
    try {
        projectConfig = await getCombinedProjectConfig(projectPath);
    } catch (e) {
        projectConfig = {};
    }

    const configSection = (projectConfig as any)[adapter.tool]?.[adapter.subtype] || {};

    // Read directory contents
    let items: string[];
    try {
        items = await fs.readdir(sourceDirPath);
    } catch (e: any) {
        // Permission error or other read issue
        return entries;
    }

    // Filter out hidden files/directories
    items = items.filter(item => !item.startsWith('.'));

    for (const item of items) {
        const itemPath = path.join(sourceDirPath, item);
        let stats;

        try {
            stats = await fs.lstat(itemPath);
        } catch (e) {
            // Can't stat this item, skip it
            continue;
        }

        // Skip broken symlinks
        if (stats.isSymbolicLink()) {
            try {
                await fs.stat(itemPath); // Follow the symlink
            } catch (e) {
                // Broken symlink, skip
                continue;
            }
        }

        const isDirectory = stats.isDirectory();

        // Apply adapter mode filters
        if (adapter.mode === 'file') {
            // File mode: only include files matching suffixes
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

            // Strip suffix to get entry name
            const entryName = matchedSuffix ? item.slice(0, -matchedSuffix.length) : item;
            const alreadyInConfig = entryName in configSection;

            entries.push({
                adapter,
                sourceName: item,
                entryName,
                sourcePath: itemPath,
                isDirectory: false,
                suffix: matchedSuffix,
                alreadyInConfig
            });
        } else if (adapter.mode === 'directory') {
            // Directory mode: only include directories
            if (!isDirectory) continue;

            const alreadyInConfig = item in configSection;

            entries.push({
                adapter,
                sourceName: item,
                entryName: item,
                sourcePath: itemPath,
                isDirectory: true,
                alreadyInConfig
            });
        } else if (adapter.mode === 'hybrid') {
            // Hybrid mode: include both files and directories
            const hybridSuffixes = adapter.hybridFileSuffixes || [];

            if (isDirectory) {
                // Directory
                const alreadyInConfig = item in configSection;

                entries.push({
                    adapter,
                    sourceName: item,
                    entryName: item,
                    sourcePath: itemPath,
                    isDirectory: true,
                    alreadyInConfig
                });
            } else {
                // File: must match hybrid suffixes
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

                // Strip suffix to get entry name
                const entryName = matchedSuffix ? item.slice(0, -matchedSuffix.length) : item;
                const alreadyInConfig = entryName in configSection;

                entries.push({
                    adapter,
                    sourceName: item,
                    entryName,
                    sourcePath: itemPath,
                    isDirectory: false,
                    suffix: matchedSuffix,
                    alreadyInConfig
                });
            }
        }
    }

    return entries;
}

/**
 * Discover all entries across adapters
 */
export async function discoverAllEntries(
    projectPath: string,
    repo: RepoConfig,
    adapterRegistry: AdapterRegistry,
    options?: { tools?: string[], adapters?: string[] }
): Promise<DiscoveredEntry[]> {
    const allEntries: DiscoveredEntry[] = [];

    // Determine which adapters to use
    let adapters: SyncAdapter[];

    if (options?.adapters && options.adapters.length > 0) {
        // Filter by specific adapter names
        adapters = options.adapters
            .map(name => adapterRegistry.getByName(name))
            .filter((a): a is SyncAdapter => a !== undefined);
    } else if (options?.tools && options.tools.length > 0) {
        // Filter by tools
        adapters = [];
        for (const tool of options.tools) {
            adapters.push(...adapterRegistry.getForTool(tool));
        }
    } else {
        // All adapters
        adapters = adapterRegistry.all();
    }

    // Discover entries for each adapter
    for (const adapter of adapters) {
        const entries = await discoverEntriesForAdapter(adapter, repo, projectPath);
        allEntries.push(...entries);
    }

    return allEntries;
}

/**
 * Install discovered entries
 */
export async function installDiscoveredEntries(
    projectPath: string,
    entries: DiscoveredEntry[],
    repo: RepoConfig,
    options: AddAllOptions
): Promise<AddAllResult> {
    const result: AddAllResult = {
        installed: 0,
        skipped: 0,
        errors: []
    };

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const progress = `[${i + 1}/${entries.length}]`;

        // Skip if already in config (unless force or interactive)
        if (entry.alreadyInConfig && !options.force) {
            if (options.skipExisting || !options.interactive) {
                if (!options.quiet) {
                    console.log(chalk.yellow(`${progress} ${entry.adapter.name}/${entry.entryName} ⊘ (already configured)`));
                }
                result.skipped++;
                continue;
            }
        }

        // Interactive mode: prompt for each entry
        if (options.interactive) {
            const typeLabel = entry.isDirectory ? ' (directory)' : '';
            const alreadyLabel = entry.alreadyInConfig ? ' [already configured]' : '';
            const shouldInstall = await prompt(
                `Install ${entry.adapter.name}/${entry.entryName}${typeLabel}${alreadyLabel}?`,
                !entry.alreadyInConfig
            );

            if (!shouldInstall) {
                if (!options.quiet) {
                    console.log(chalk.gray(`${progress} Skipped`));
                }
                result.skipped++;
                continue;
            }
        }

        // Dry run: just log what would be done
        if (options.dryRun) {
            const targetDir = entry.adapter.targetDir;
            const targetName = entry.entryName;
            const typeLabel = entry.isDirectory ? ' (dir)' : '';
            console.log(`${progress} ${entry.adapter.name}/${entry.entryName}${typeLabel} → ${targetDir}/${targetName}`);
            result.installed++;
            continue;
        }

        // Actually install the entry
        try {
            // Use adapter's addDependency and link methods
            await entry.adapter.addDependency(
                projectPath,
                entry.entryName,
                repo.url,
                entry.entryName, // Use same name as alias
                options.isLocal || false
            );

            await entry.adapter.link({
                projectPath,
                name: entry.entryName,
                repo,
                alias: entry.entryName,
                isLocal: options.isLocal || false
            });

            if (!options.quiet) {
                const targetDir = entry.adapter.targetDir;
                const targetName = entry.entryName;
                const typeLabel = entry.isDirectory ? ' (dir)' : '';
                console.log(chalk.green(`${progress} ${entry.adapter.name}/${entry.entryName}${typeLabel} → ${targetDir}/${targetName} ✓`));
            }

            result.installed++;
        } catch (error: any) {
            result.errors.push({
                entry: `${entry.adapter.name}/${entry.entryName}`,
                error: error.message
            });

            if (!options.quiet) {
                console.log(chalk.red(`${progress} ${entry.adapter.name}/${entry.entryName} ✗ (${error.message})`));
            }
        }
    }

    return result;
}

/**
 * Main handler for add-all command
 */
export async function handleAddAll(
    projectPath: string,
    repo: RepoConfig,
    adapterRegistry: AdapterRegistry,
    options: AddAllOptions
): Promise<AddAllResult> {
    // Discover entries
    if (!options.quiet) {
        console.log(chalk.gray('Discovering entries from repository...'));
    }

    const entries = await discoverAllEntries(projectPath, repo, adapterRegistry, {
        tools: options.tools,
        adapters: options.adapters
    });

    if (entries.length === 0) {
        if (!options.quiet) {
            console.log(chalk.yellow('No entries found in repository.'));
        }
        return { installed: 0, skipped: 0, errors: [] };
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
        console.log(chalk.bold('[DRY RUN] Would install:\n'));
    } else if (!options.quiet) {
        console.log(chalk.gray('Installing entries:\n'));
    }

    // Install entries
    const result = await installDiscoveredEntries(projectPath, entries, repo, options);

    // Dry run footer
    if (options.dryRun) {
        console.log(chalk.gray(`\nTotal: ${result.installed} entries would be installed`));
        console.log(chalk.gray('Run without --dry-run to perform installation'));
    }

    return result;
}
