import fs from 'fs-extra';
import path from 'path';
import { getUserConfigPath, getUserProjectConfig, saveUserProjectConfig } from './config.js';

const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

// Legacy (temporary) compatibility. Intentionally centralized so it can be removed in a future version.
const LEGACY_CONFIG_FILENAME = 'cursor-rules.json';
const LEGACY_LOCAL_CONFIG_FILENAME = 'cursor-rules.local.json';

function readNestedStringValue(source: unknown, tool: string, subtype: string): string | undefined {
    if (!source || typeof source !== 'object') {
        return undefined;
    }

    const toolConfig = (source as Record<string, unknown>)[tool];
    if (!toolConfig || typeof toolConfig !== 'object') {
        return undefined;
    }

    const value = (toolConfig as Record<string, unknown>)[subtype];
    return typeof value === 'string' ? value : undefined;
}

function writeNestedStringValue(target: RepoSourceConfig, tool: string, subtype: string, value: string): void {
    const mutable = target as Record<string, unknown>;
    const existingToolConfig = mutable[tool];
    const toolConfig =
        existingToolConfig && typeof existingToolConfig === 'object'
            ? existingToolConfig as Record<string, unknown>
            : {};
    toolConfig[subtype] = value;
    mutable[tool] = toolConfig;
}

/**
 * Dynamically iterate over all tool/subtype pairs present in a source object,
 * extracting entries where the value is a string (source directory paths).
 * Replaces the previous hardcoded REPO_SOURCE_PATHS constant.
 */
function buildRepoSourceFromNestedStrings(source: unknown, rootPath?: string): { hasAny: boolean; config: RepoSourceConfig } {
    const config: RepoSourceConfig = { rootPath };
    let hasAny = false;

    if (!source || typeof source !== 'object') {
        return { hasAny, config };
    }

    const src = source as Record<string, unknown>;
    for (const [tool, toolConfig] of Object.entries(src)) {
        if (tool === 'rootPath' || tool === 'sourceDir') continue;
        if (!toolConfig || typeof toolConfig !== 'object') continue;

        for (const [subtype, value] of Object.entries(toolConfig as Record<string, unknown>)) {
            if (typeof value === 'string') {
                hasAny = true;
                writeNestedStringValue(config, tool, subtype, value);
            }
        }
    }

    return { hasAny, config };
}

/**
 * Extended rule entry with optional targetDir
 */
export type RuleEntry = string | {
    url: string;
    rule?: string;
    targetDir?: string;  // Entry-level custom target directory
};

/**
 * Source directory configuration (for rules repositories).
 * Defines where source files are located in a rules repo.
 * Uses dynamic index signature to support any tool/subtype combination.
 */
export interface SourceDirConfig {
    [tool: string]: Record<string, string> | undefined;
}

/**
 * Unified configuration for ai-rules-sync.json.
 * Used both in rules repos (sourceDir) and in projects (dependency records).
 * Dynamic index signature supports any registered tool without code changes.
 */
export interface ProjectConfig {
    // Global path prefix for source directories (only used in rules repos)
    rootPath?: string;
    // Source directory configuration (only used in rules repos)
    sourceDir?: SourceDirConfig;
    // Dependency records — indexed by tool name, then subtype
    [tool: string]: any;
}

/**
 * Repository source configuration.
 * Uses dynamic index signature so new tools require zero changes here.
 * The `any` index type allows accessing tool-specific sub-properties (e.g. repoConfig.windsurf?.rules)
 * without requiring explicit per-tool type declarations.
 */
export interface RepoSourceConfig {
    rootPath?: string;
    [tool: string]: any;
}

export type ConfigSource = 'new' | 'legacy' | 'none';

async function readConfigFile<T>(filePath: string): Promise<T> {
    if (await fs.pathExists(filePath)) {
        try {
            return await fs.readJson(filePath);
        } catch (e) {
            // ignore
        }
    }
    return {} as T;
}

async function hasAnyNewConfig(projectPath: string): Promise<boolean> {
    return (
        await fs.pathExists(path.join(projectPath, CONFIG_FILENAME)) ||
        await fs.pathExists(path.join(projectPath, LOCAL_CONFIG_FILENAME))
    );
}

async function hasAnyLegacyConfig(projectPath: string): Promise<boolean> {
    return (
        await fs.pathExists(path.join(projectPath, LEGACY_CONFIG_FILENAME)) ||
        await fs.pathExists(path.join(projectPath, LEGACY_LOCAL_CONFIG_FILENAME))
    );
}

function legacyToNew(legacy: { rules?: Record<string, RuleEntry> }): ProjectConfig {
    return {
        cursor: {
            rules: legacy.rules || {}
        }
    };
}

/**
 * Merge two ProjectConfig objects dynamically.
 * Registry-driven: works with any tool/subtype combination present in the configs
 * without requiring a hardcoded tool list.
 *
 * Special cases:
 *   - rootPath / sourceDir: take from main
 *   - agentsMd: flat object (no subLevel nesting)
 *   - all others: tool → subtype → Record<alias, entry>
 */
function mergeCombined(main: ProjectConfig, local: ProjectConfig): ProjectConfig {
    const result: Record<string, any> = {};

    // Collect all top-level keys from both configs
    const allKeys = new Set([...Object.keys(main), ...Object.keys(local)]);

    for (const key of allKeys) {
        if (key === 'rootPath' || key === 'sourceDir') {
            // Scalar / nested config: prefer main
            result[key] = main[key] ?? local[key];
        } else if (key === 'agentsMd') {
            // agentsMd is a flat record (no subtype level)
            result[key] = { ...(main[key] || {}), ...(local[key] || {}) };
        } else {
            // Tool section with subtypes: merge each subtype independently
            const mainTool = (main[key] && typeof main[key] === 'object') ? main[key] : {};
            const localTool = (local[key] && typeof local[key] === 'object') ? local[key] : {};
            const subtypes = new Set([...Object.keys(mainTool), ...Object.keys(localTool)]);
            result[key] = {};
            for (const subtype of subtypes) {
                result[key][subtype] = {
                    ...(mainTool[subtype] || {}),
                    ...(localTool[subtype] || {}),
                };
            }
        }
    }

    return result as ProjectConfig;
}

export async function getConfigSource(projectPath: string): Promise<ConfigSource> {
    if (await hasAnyNewConfig(projectPath)) return 'new';
    if (await hasAnyLegacyConfig(projectPath)) return 'legacy';
    return 'none';
}

/**
 * Read repository-side source configuration (used when `projectPath` is a rules repo).
 * Returns the full config which may contain sourceDir.
 * Supports both new (sourceDir) and legacy (flat cursor/copilot with string values) formats.
 */
export async function getRepoSourceConfig(projectPath: string): Promise<RepoSourceConfig> {
    const newPath = path.join(projectPath, CONFIG_FILENAME);
    if (await fs.pathExists(newPath)) {
        const config = await readConfigFile<ProjectConfig>(newPath);

        // New format: sourceDir is present
        if (config.sourceDir) {
            return buildRepoSourceFromNestedStrings(config.sourceDir, config.rootPath).config;
        }

        // Legacy format: <tool>.<subtype> values are strings (source dirs).
        const { hasAny, config: legacyRepoConfig } = buildRepoSourceFromNestedStrings(config, config.rootPath);
        if (hasAny) {
            return legacyRepoConfig;
        }

        // Not a rules repo config (no sourceDir, no string values)
        return { rootPath: config.rootPath };
    }
    return {};
}

/**
 * Get the source directory for a specific tool type from repo config.
 * @param repoConfig - The repo source configuration
 * @param tool - Tool name: 'cursor', 'copilot', 'claude', etc.
 * @param subtype - Subtype: 'rules', 'plans', 'instructions', 'skills', 'agents', etc.
 * @param defaultDir - Default directory if not configured
 * @param globalOverride - Optional override from CLI or global config (highest priority)
 */
export function getSourceDir(
    repoConfig: RepoSourceConfig,
    tool: string,
    subtype: string,
    defaultDir: string,
    globalOverride?: SourceDirConfig
): string {
    const rootPath = repoConfig.rootPath || '';

    // 1. Check globalOverride first (CLI or global config - highest priority)
    if (globalOverride) {
        const overrideDir = readNestedStringValue(globalOverride, tool, subtype);
        if (overrideDir !== undefined) {
            // globalOverride paths are relative to repo root, so no rootPath prefix
            return overrideDir;
        }
    }

    // 2. Check repoConfig (from repo's ai-rules-sync.json)
    const toolDir = readNestedStringValue(repoConfig, tool, subtype);

    // 3. Apply rootPath and default
    const dir = toolDir ?? defaultDir;
    return rootPath ? path.join(rootPath, dir) : dir;
}

/**
 * Get entry configuration from project config
 */
export function getEntryConfig(
    projectConfig: ProjectConfig,
    tool: string,
    subtype: string,
    key: string
): RuleEntry | undefined {
    const toolConfig = (projectConfig as any)[tool];
    if (!toolConfig) return undefined;

    const subtypeConfig = toolConfig[subtype];
    if (!subtypeConfig) return undefined;

    return subtypeConfig[key];
}

/**
 * Get the target directory for a specific tool type from project config.
 * Priority: entry-level targetDir > adapter default
 */
export function getTargetDir(
    projectConfig: ProjectConfig,
    tool: string,
    subtype: string,
    key: string,
    defaultDir: string
): string {
    // 1. Check entry-level targetDir (highest priority)
    const entry = getEntryConfig(projectConfig, tool, subtype, key);
    if (entry && typeof entry === 'object' && entry.targetDir) {
        return path.normalize(entry.targetDir);
    }

    // 2. Fall back to adapter default (lowest priority)
    return defaultDir;
}

export async function getCombinedProjectConfig(projectPath: string): Promise<ProjectConfig> {
    const source = await getConfigSource(projectPath);

    if (source === 'new') {
        const main = await readConfigFile<ProjectConfig>(path.join(projectPath, CONFIG_FILENAME));
        const local = await readConfigFile<ProjectConfig>(path.join(projectPath, LOCAL_CONFIG_FILENAME));
        return mergeCombined(main, local);
    }

    if (source === 'legacy') {
        const legacyMain = await readConfigFile<{ rootPath?: string; rules?: Record<string, RuleEntry> }>(
            path.join(projectPath, LEGACY_CONFIG_FILENAME)
        );
        const legacyLocal = await readConfigFile<{ rootPath?: string; rules?: Record<string, RuleEntry> }>(
            path.join(projectPath, LEGACY_LOCAL_CONFIG_FILENAME)
        );
        return mergeCombined(legacyToNew(legacyMain), legacyToNew(legacyLocal));
    }

    return mergeCombined({}, {});
}

/**
 * Migrate legacy cursor-rules*.json into new ai-rules-sync*.json files.
 * This is ONLY called by write paths (add/remove) to keep legacy-compat removable.
 */
export async function migrateLegacyToNew(projectPath: string): Promise<{ migrated: boolean }> {
    const source = await getConfigSource(projectPath);
    if (source !== 'legacy') return { migrated: false };

    const legacyMainPath = path.join(projectPath, LEGACY_CONFIG_FILENAME);
    const legacyLocalPath = path.join(projectPath, LEGACY_LOCAL_CONFIG_FILENAME);

    const legacyMain = await readConfigFile<{ rules?: Record<string, RuleEntry> }>(legacyMainPath);
    const legacyLocal = await readConfigFile<{ rules?: Record<string, RuleEntry> }>(legacyLocalPath);

    const newMain = legacyToNew(legacyMain);
    const newLocal = legacyToNew(legacyLocal);

    await fs.writeJson(path.join(projectPath, CONFIG_FILENAME), newMain, { spaces: 2 });
    if (Object.keys(newLocal.cursor?.rules || {}).length > 0) {
        await fs.writeJson(path.join(projectPath, LOCAL_CONFIG_FILENAME), newLocal, { spaces: 2 });
    }

    return { migrated: true };
}

async function readNewConfigForWrite(projectPath: string, isLocal: boolean): Promise<ProjectConfig> {
    const configPath = path.join(projectPath, isLocal ? LOCAL_CONFIG_FILENAME : CONFIG_FILENAME);
    return await readConfigFile<ProjectConfig>(configPath);
}

async function writeNewConfig(projectPath: string, isLocal: boolean, config: ProjectConfig): Promise<void> {
    const configPath = path.join(projectPath, isLocal ? LOCAL_CONFIG_FILENAME : CONFIG_FILENAME);
    await fs.writeJson(configPath, config, { spaces: 2 });
}

/**
 * Generic function to add a dependency to project config
 * This function works with any adapter by using the configPath
 */
export async function addDependencyGeneric(
    projectPath: string,
    configPath: [string, string],
    name: string,
    repoUrl: string,
    alias?: string,
    isLocal: boolean = false,
    targetDir?: string
): Promise<{ migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const config = await readNewConfigForWrite(projectPath, isLocal);

    const [topLevel, subLevel] = configPath;

    // Initialize nested structure if needed
    (config as any)[topLevel] ??= {};
    (config as any)[topLevel][subLevel] ??= {};

    const targetName = alias || name;

    // Build entry value
    let entryValue: RuleEntry;
    if (targetDir || (alias && alias !== name)) {
        // Use object format if targetDir is specified or if alias is different from name
        entryValue = {
            url: repoUrl,
            ...(alias && alias !== name ? { rule: name } : {}),
            ...(targetDir ? { targetDir } : {})
        };
    } else {
        // Use simple string format
        entryValue = repoUrl;
    }

    (config as any)[topLevel][subLevel][targetName] = entryValue;

    await writeNewConfig(projectPath, isLocal, config);
    return migration;
}

/**
 * Generic function to remove a dependency from project config
 */
export async function removeDependencyGeneric(
    projectPath: string,
    configPath: [string, string],
    alias: string
): Promise<{ removedFrom: string[]; migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const removedFrom: string[] = [];

    const [topLevel, subLevel] = configPath;

    const mainPath = path.join(projectPath, CONFIG_FILENAME);
    const mainConfig = await readConfigFile<ProjectConfig>(mainPath);
    if ((mainConfig as any)[topLevel]?.[subLevel]?.[alias]) {
        delete (mainConfig as any)[topLevel][subLevel][alias];
        await fs.writeJson(mainPath, mainConfig, { spaces: 2 });
        removedFrom.push(CONFIG_FILENAME);
    }

    const localPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    const localConfig = await readConfigFile<ProjectConfig>(localPath);
    if ((localConfig as any)[topLevel]?.[subLevel]?.[alias]) {
        delete (localConfig as any)[topLevel][subLevel][alias];
        await fs.writeJson(localPath, localConfig, { spaces: 2 });
        removedFrom.push(LOCAL_CONFIG_FILENAME);
    }

    return { removedFrom, migrated: migration.migrated };
}

/**
 * Add a dependency to the user project config (user.json).
 * Used when --user flag is set.
 */
export async function addUserDependency(
    configPath: [string, string],
    name: string,
    repoUrl: string,
    alias?: string,
    targetDir?: string
): Promise<void> {
    const config = await getUserProjectConfig();
    const [topLevel, subLevel] = configPath;

    (config as any)[topLevel] ??= {};
    (config as any)[topLevel][subLevel] ??= {};

    const targetName = alias || name;

    let entryValue: RuleEntry;
    if (targetDir || (alias && alias !== name)) {
        entryValue = {
            url: repoUrl,
            ...(alias && alias !== name ? { rule: name } : {}),
            ...(targetDir ? { targetDir } : {})
        };
    } else {
        entryValue = repoUrl;
    }

    (config as any)[topLevel][subLevel][targetName] = entryValue;
    await saveUserProjectConfig(config);
}

/** @deprecated Use addUserDependency() instead */
export async function addGlobalDependency(
    configPath: [string, string],
    name: string,
    repoUrl: string,
    alias?: string,
    targetDir?: string
): Promise<void> {
    return addUserDependency(configPath, name, repoUrl, alias, targetDir);
}

/**
 * Remove a dependency from the user project config (user.json).
 * Used when --user flag is set.
 */
export async function removeUserDependency(
    configPath: [string, string],
    alias: string
): Promise<{ removedFrom: string[] }> {
    const removedFrom: string[] = [];
    const userPath = await getUserConfigPath();
    const config = await getUserProjectConfig();
    const [topLevel, subLevel] = configPath;

    if ((config as any)[topLevel]?.[subLevel]?.[alias]) {
        delete (config as any)[topLevel][subLevel][alias];
        await saveUserProjectConfig(config);
        removedFrom.push(path.basename(userPath));
    }

    return { removedFrom };
}

/** @deprecated Use removeUserDependency() instead */
export async function removeGlobalDependency(
    configPath: [string, string],
    alias: string
): Promise<{ removedFrom: string[] }> {
    return removeUserDependency(configPath, alias);
}
