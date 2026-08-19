import fs from 'fs-extra';
import path from 'path';
import { SyncAdapter, SyncOptions, LinkResult, ResolvedSource } from './types.js';
import { unlinkEntry as engineUnlinkEntry } from '../sync-engine.js';
import { addDependencyGeneric, removeDependencyGeneric } from '../project-config.js';
import { dotfile } from '../dotany/index.js';
import { GitRepoSource } from '../plugin/git-repo-source.js';
import { AiRulesSyncManifest } from '../plugin/ai-rules-sync-manifest.js';
import { UserRulesSyncManifest } from '../plugin/user-rules-sync-manifest.js';
import type { DotfileManager } from '../dotany/manager.js';
import { RepoConfig } from '../config.js';
import type { RepoResolverFn } from '../dotany/types.js';

/**
 * Configuration for creating a base adapter
 */
export interface AdapterConfig {
    name: string;
    tool: string;
    subtype: string;
    configPath: string[];
    defaultSourceDir: string;
    targetDir: string;
    userTargetDir?: string;
    mode: 'directory' | 'file' | 'hybrid';
    fileSuffixes?: string[];
    hybridFileSuffixes?: string[];
    resolveSource?: (repoDir: string, rootPath: string, name: string, options?: { sourceFileOverride?: string; sourceDirOverride?: string }) => Promise<any>;
    resolveTargetName?: (name: string, alias?: string, sourceSuffix?: string) => string;
}

/**
 * Create a base adapter with common functionality.
 * Delegates link/unlink to the dotfile abstraction layer.
 */
export function createBaseAdapter(config: AdapterConfig): SyncAdapter {
    return {
        name: config.name,
        tool: config.tool,
        subtype: config.subtype,
        configPath: config.configPath,
        defaultSourceDir: config.defaultSourceDir,
        targetDir: config.targetDir,
        userTargetDir: config.userTargetDir,
        mode: config.mode,
        fileSuffixes: config.fileSuffixes,
        hybridFileSuffixes: config.hybridFileSuffixes,
        resolveSource: config.resolveSource,
        resolveTargetName: config.resolveTargetName,

        forProject(projectPath: string, repoOrResolver: RepoConfig | RepoResolverFn | null, isLocal?: boolean, isUser?: boolean): DotfileManager {
            return dotfile.create({
                name: config.name,
                source: new GitRepoSource(repoOrResolver, config),
                targetDir: isUser && config.userTargetDir ? config.userTargetDir : config.targetDir,
                targetRoot: projectPath,
                manifest: isUser
                    ? new UserRulesSyncManifest(config.configPath)
                    : new AiRulesSyncManifest(projectPath, config.configPath, isLocal),
                resolveTargetName: config.resolveTargetName,
                knownSuffixes: config.mode === 'hybrid' ? config.hybridFileSuffixes : config.fileSuffixes,
            });
        },

        async addDependency(projectPath, name, repoUrl, alias, isLocal = false, targetDir) {
            return addDependencyGeneric(projectPath, config.configPath, name, repoUrl, alias, isLocal, targetDir);
        },

        async removeDependency(projectPath, alias) {
            return removeDependencyGeneric(projectPath, config.configPath, alias);
        },

        async link(options: SyncOptions): Promise<LinkResult> {
            // Delegate to DotfileManager.add() (symlink only — manifest is written separately by addDependency)
            // In user/global mode (skipIgnore=true), use userTargetDir if defined
            const effectiveTargetDir = options.skipIgnore && config.userTargetDir
                ? config.userTargetDir
                : config.targetDir;
            const manager = dotfile.create({
                name: config.name,
                source: new GitRepoSource(options.repo, config),
                targetDir: effectiveTargetDir,
                targetRoot: options.projectPath,
                resolveTargetName: config.resolveTargetName,
                // No manifest here: addDependency handles manifest writes separately
            });
            return manager.add(options.name, {
                alias: options.alias,
                targetDir: options.targetDir,
                repoUrl: options.repo.url,
            });
        },

        async unlink(projectPath: string, alias: string, isUser?: boolean): Promise<void> {
            return engineUnlinkEntry(this, projectPath, alias, isUser);
        },
    };
}

/**
 * Create a single-suffix resolver for file mode adapters
 * Handles files with one specific suffix (e.g., .md)
 */
export function createSingleSuffixResolver(suffix: string, entityName: string) {
    return async (repoDir: string, rootPath: string, name: string): Promise<ResolvedSource> => {
        // If name already has the suffix, use as-is
        if (name.endsWith(suffix)) {
            const sourcePath = path.join(repoDir, rootPath, name);
            if (!await fs.pathExists(sourcePath)) {
                throw new Error(`${entityName} "${name}" not found in repository.`);
            }
            return { sourceName: name, sourcePath, suffix };
        }

        // Try adding the suffix
        const candName = `${name}${suffix}`;
        const candPath = path.join(repoDir, rootPath, candName);
        if (await fs.pathExists(candPath)) {
            return { sourceName: candName, sourcePath: candPath, suffix };
        }

        // Try exact name (could be directory or exact filename)
        const exactPath = path.join(repoDir, rootPath, name);
        if (await fs.pathExists(exactPath)) {
            return { sourceName: name, sourcePath: exactPath, suffix: undefined };
        }

        throw new Error(`${entityName} "${name}" not found in repository.`);
    };
}

/**
 * Create a multi-suffix resolver for file mode adapters (or hybrid, with
 * `allowDirectoryMatch`). Supports files with multiple possible suffixes;
 * a bare directory of the exact entry name only counts as a match when
 * `allowDirectoryMatch` is set.
 * When sourceDirOverride is set (from rules repo sourceDir), resolves to that directory.
 *
 * A plain `mode: 'file'` adapter must NOT match a same-named directory: a
 * shared sourceDir (`sourceDir['*'].agents`) can hold a directory-shaped
 * entry for one tool (e.g. deepagents' `<name>/AGENTS.md`) alongside a
 * file-shaped entry for another (e.g. claude's `<name>.md`) under the same
 * bare name — matching the directory here would silently link the wrong
 * entry instead of the correctly-suffixed file. Only `cursor-rules`
 * (mode: 'hybrid') genuinely accepts either shape for the same entry.
 */
export function createMultiSuffixResolver(
    suffixes: string[],
    entityName: string,
    options: { allowDirectoryMatch?: boolean } = {}
) {
    const { allowDirectoryMatch = false } = options;
    return async (
        repoDir: string,
        rootPath: string,
        name: string,
        resolveOptions?: { sourceDirOverride?: string }
    ): Promise<ResolvedSource> => {
        const effectiveName = resolveOptions?.sourceDirOverride ?? name;
        const basePath = path.join(repoDir, rootPath, effectiveName);
        let baseIsDirectory = false;

        // 1. Check exact name first - could be directory or file with suffix
        if (await fs.pathExists(basePath)) {
            const stats = await fs.stat(basePath);
            baseIsDirectory = stats.isDirectory();
            if (baseIsDirectory) {
                if (allowDirectoryMatch) {
                    return { sourceName: effectiveName, sourcePath: basePath, suffix: undefined };
                }
            } else {
                const matchedSuffix = suffixes.find(s => effectiveName.endsWith(s));
                return { sourceName: effectiveName, sourcePath: basePath, suffix: matchedSuffix };
            }
        }

        // 2. Name doesn't have suffix - try each suffix in order
        for (const suffix of suffixes) {
            const candName = `${effectiveName}${suffix}`;
            const candPath = path.join(repoDir, rootPath, candName);
            if (await fs.pathExists(candPath)) {
                return { sourceName: candName, sourcePath: candPath, suffix };
            }
        }

        if (baseIsDirectory) {
            throw new Error(
                `${entityName} "${effectiveName}" exists in the repository as a directory, but this tool expects a single ${suffixes.join('/')} file — the repository doesn't provide a file-shaped entry for it.`
            );
        }

        throw new Error(`${entityName} "${effectiveName}" not found in repository.`);
    };
}

/**
 * Create a suffix-aware target name resolver
 * Ensures target name has proper suffix when source has one
 */
export function createSuffixAwareTargetResolver(suffixes: string[]) {
    return (name: string, alias?: string, sourceSuffix?: string): string => {
        const base = alias || name;
        // If alias has no suffix but source does, add the source suffix
        if (sourceSuffix && !suffixes.some(s => base.endsWith(s))) {
            return `${base}${sourceSuffix}`;
        }
        return base;
    };
}
