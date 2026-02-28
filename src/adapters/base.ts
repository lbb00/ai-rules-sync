import fs from 'fs-extra';
import path from 'path';
import { SyncAdapter, SyncOptions, LinkResult, ResolvedSource } from './types.js';
import { linkEntry as engineLinkEntry, unlinkEntry as engineUnlinkEntry } from '../sync-engine.js';
import { addDependencyGeneric, removeDependencyGeneric } from '../project-config.js';

/**
 * Configuration for creating a base adapter
 */
export interface AdapterConfig {
    name: string;
    tool: string;
    subtype: string;
    configPath: [string, string];
    defaultSourceDir: string;
    targetDir: string;
    userTargetDir?: string;
    mode: 'directory' | 'file' | 'hybrid';
    fileSuffixes?: string[];
    hybridFileSuffixes?: string[];
    resolveSource?: (repoDir: string, rootPath: string, name: string) => Promise<any>;
    resolveTargetName?: (name: string, alias?: string, sourceSuffix?: string) => string;
}

/**
 * Create a base adapter with common functionality
 * This factory function handles add/remove/link/unlink operations generically
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

        async addDependency(projectPath, name, repoUrl, alias, isLocal = false, targetDir) {
            return addDependencyGeneric(projectPath, config.configPath, name, repoUrl, alias, isLocal, targetDir);
        },

        async removeDependency(projectPath, alias) {
            return removeDependencyGeneric(projectPath, config.configPath, alias);
        },

        async link(options: SyncOptions): Promise<LinkResult> {
            return engineLinkEntry(this, options);
        },

        async unlink(projectPath: string, alias: string): Promise<void> {
            return engineUnlinkEntry(this, projectPath, alias);
        }
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
 * Create a multi-suffix resolver for hybrid mode adapters
 * Supports both files (with multiple possible suffixes) and directories
 */
export function createMultiSuffixResolver(suffixes: string[], entityName: string) {
    return async (repoDir: string, rootPath: string, name: string): Promise<ResolvedSource> => {
        const basePath = path.join(repoDir, rootPath, name);

        // 1. Check exact name first - could be directory or file with suffix
        if (await fs.pathExists(basePath)) {
            const stats = await fs.stat(basePath);
            if (stats.isDirectory()) {
                // Prefer directory match
                return { sourceName: name, sourcePath: basePath, suffix: undefined };
            }
            // It's a file with the exact name (probably has suffix already)
            const matchedSuffix = suffixes.find(s => name.endsWith(s));
            return { sourceName: name, sourcePath: basePath, suffix: matchedSuffix };
        }

        // 2. Name doesn't have suffix - try each suffix in order
        for (const suffix of suffixes) {
            const candName = `${name}${suffix}`;
            const candPath = path.join(repoDir, rootPath, candName);
            if (await fs.pathExists(candPath)) {
                return { sourceName: candName, sourcePath: candPath, suffix };
            }
        }

        throw new Error(`${entityName} "${name}" not found in repository.`);
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
