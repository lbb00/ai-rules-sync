import fs from 'fs-extra';
import path from 'path';
import { getUserConfigPath, getUserProjectConfig, saveUserProjectConfig } from './config.js';

const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

export const CURRENT_CONFIG_VERSION = 1;

/**
 * Source dir value: string (legacy) or discriminated union with mode.
 */
export type SourceDirValue = string | SourceDirFileValue | SourceDirDirectoryValue;

export interface SourceDirFileValue {
    mode: 'file';
    dir: string;
    sourceFile?: string;
    targetFile?: string;
}

export interface SourceDirDirectoryValue {
    mode: 'directory';
    dir: string;
    sourceDir?: string;
    targetName?: string;
}

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

function readNestedSourceDirValue(source: unknown, tool: string, subtype: string): SourceDirValue | undefined {
    if (!source || typeof source !== 'object') {
        return undefined;
    }

    const toolConfig = (source as Record<string, unknown>)[tool];
    if (!toolConfig || typeof toolConfig !== 'object') {
        return undefined;
    }

    const value = (toolConfig as Record<string, unknown>)[subtype];
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        const v = value as Record<string, unknown>;
        if (typeof v.dir === 'string') {
            // Has mode field - new format
            if (v.mode === 'file') return value as SourceDirFileValue;
            if (v.mode === 'directory') return value as SourceDirDirectoryValue;
            // Legacy format without mode - infer
            if (v.sourceFile || v.targetFile) return { mode: 'file', ...v } as SourceDirFileValue;
            if (v.sourceDir || v.targetName) return { mode: 'directory', ...v } as SourceDirDirectoryValue;
            // Just dir - treat as string equivalent
            return v.dir as string;
        }
    }
    return undefined;
}

function readNestedTargetFileValue(source: unknown, tool: string, subtype: string): string | undefined {
    const rawValue = readNestedSourceDirValue(source, tool, subtype);
    if (rawValue && typeof rawValue === 'object' && rawValue.mode === 'file' && rawValue.targetFile) {
        return rawValue.targetFile;
    }
    return undefined;
}

function writeNestedValue(target: RepoSourceConfig, tool: string, subtype: string, value: SourceDirValue): void {
    const mutable = target as Record<string, unknown>;
    const existingToolConfig = mutable[tool];
    const toolConfig =
        existingToolConfig && typeof existingToolConfig === 'object'
            ? (existingToolConfig as Record<string, unknown>)
            : {};
    toolConfig[subtype] = value;
    mutable[tool] = toolConfig;
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
                writeNestedValue(config, tool, subtype, value);
            } else if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).dir === 'string') {
                hasAny = true;
                const v = value as Record<string, unknown>;
                if (v.mode === 'file' || v.mode === 'directory') {
                    writeNestedValue(config, tool, subtype, value as SourceDirValue);
                } else if (v.sourceFile || v.targetFile) {
                    writeNestedValue(config, tool, subtype, { mode: 'file', ...v } as SourceDirFileValue);
                } else if (v.sourceDir || v.targetName) {
                    writeNestedValue(config, tool, subtype, { mode: 'directory', ...v } as SourceDirDirectoryValue);
                } else {
                    // Just dir - treat as string
                    writeNestedValue(config, tool, subtype, v.dir as string);
                }
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
 * Defines where source files/dirs are located in a rules repo.
 * Value can be string (dir path) or object with dir + optional overrides:
 * - File mode: sourceFile, targetFile (e.g. common/AGENTS.md -> CLAUDE.md)
 * - Directory mode: sourceDir, targetName (e.g. common/shared-rules -> cursor-rules)
 */
export interface SourceDirConfig {
    [tool: string]: Record<string, SourceDirValue> | undefined;
}

export type RuleMap = Record<string, RuleEntry>;
export type SubtypeMap = Record<string, RuleMap>;
export type ToolSections = Record<string, SubtypeMap>;

/**
 * Unified configuration for ai-rules-sync.json.
 * Used both in rules repos (sourceDir) and in projects (dependency records).
 * Dynamic index signature supports any registered tool without code changes.
 */
export interface ProjectConfig {
    version?: number;
    // Global path prefix for source directories (only used in rules repos)
    rootPath?: string;
    // Source directory configuration (only used in rules repos)
    sourceDir?: SourceDirConfig;
    // Dependency records — indexed by tool name, then subtype
    [tool: string]: number | string | SourceDirConfig | SubtypeMap | undefined;
}

/**
 * Repository source configuration.
 * Uses dynamic index signature so new tools require zero changes here.
 */
export interface RepoSourceConfig {
    rootPath?: string;
    [tool: string]: string | Record<string, SourceDirValue> | undefined;
}

export type ConfigSource = 'new' | 'none';

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

export type ConfigPath = readonly string[];

/**
 * Get a value at a nested path in an object
 */
export function getAtPath(obj: unknown, configPath: ConfigPath): unknown {
    let current: unknown = obj;
    for (const key of configPath) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

/**
 * Ensure a nested path exists in an object, creating empty objects as needed
 */
export function ensureAtPath(obj: Record<string, unknown>, configPath: ConfigPath): Record<string, unknown> {
    let current: Record<string, unknown> = obj;
    for (const key of configPath) {
        current[key] ??= {};
        current = current[key] as Record<string, unknown>;
    }
    return current;
}

/**
 * Delete a key at a nested path
 */
export function deleteAtPath(obj: unknown, configPath: ConfigPath, key: string): boolean {
    const parent = getAtPath(obj, configPath);
    if (parent && typeof parent === 'object' && key in (parent as Record<string, unknown>)) {
        delete (parent as Record<string, unknown>)[key];
        return true;
    }
    return false;
}

/**
 * Get the rule section for a given config path
 */
export function getRuleSection(config: ProjectConfig, configPath: ConfigPath): Record<string, RuleEntry> {
    const section = getAtPath(config, configPath);
    if (!section || typeof section !== 'object') return {};
    return section as Record<string, RuleEntry>;
}

/**
 * Normalize legacy config formats to current version.
 * - Adds version field if missing
 * - Converts flat agentsMd to nested agentsMd.file
 * - Adds mode field to SourceDirValue objects
 */
export function normalizeConfig(raw: Record<string, unknown>): ProjectConfig {
    const config = { ...raw } as Record<string, unknown>;

    // Add version if missing
    if (!config.version) {
        config.version = CURRENT_CONFIG_VERSION;
    }

    // Normalize flat agentsMd to nested form
    if (config.agentsMd && typeof config.agentsMd === 'object') {
        const agentsMd = config.agentsMd as Record<string, unknown>;
        // Check if it's flat (has string/object values directly, not subtypes with nested records)
        const isFlat = Object.values(agentsMd).some(
            v => typeof v === 'string' || (v && typeof v === 'object' && 'url' in (v as Record<string, unknown>))
        );
        if (isFlat) {
            config.agentsMd = { file: agentsMd };
        }
    }

    // Normalize sourceDir SourceDirValue objects
    if (config.sourceDir && typeof config.sourceDir === 'object') {
        const sourceDir = config.sourceDir as Record<string, Record<string, unknown>>;
        for (const [tool, subtypes] of Object.entries(sourceDir)) {
            if (!subtypes || typeof subtypes !== 'object') continue;
            for (const [subtype, value] of Object.entries(subtypes)) {
                if (value && typeof value === 'object' && !('mode' in (value as Record<string, unknown>))) {
                    const v = value as Record<string, unknown>;
                    if (v.sourceFile || v.targetFile) {
                        (subtypes as Record<string, unknown>)[subtype] = { mode: 'file', ...v };
                    } else if (v.sourceDir || v.targetName) {
                        (subtypes as Record<string, unknown>)[subtype] = { mode: 'directory', ...v };
                    }
                    // If only `dir` exists, keep as-is (legacy simple path object treated as string equivalent)
                }
            }
        }
    }

    return config as unknown as ProjectConfig;
}

/**
 * Merge two ProjectConfig objects dynamically.
 * Registry-driven: works with any tool/subtype combination present in the configs
 * without requiring a hardcoded tool list.
 */
function mergeCombined(main: ProjectConfig, local: ProjectConfig): ProjectConfig {
    const result: Record<string, unknown> = {};

    // Collect all top-level keys from both configs
    const allKeys = new Set([...Object.keys(main), ...Object.keys(local)]);

    for (const key of allKeys) {
        if (key === 'version' || key === 'rootPath' || key === 'sourceDir') {
            result[key] = main[key] ?? local[key];
        } else {
            // Tool section with subtypes: merge each subtype independently
            const mainTool = (main[key] && typeof main[key] === 'object') ? main[key] as Record<string, unknown> : {};
            const localTool = (local[key] && typeof local[key] === 'object') ? local[key] as Record<string, unknown> : {};
            const subtypes = new Set([...Object.keys(mainTool), ...Object.keys(localTool)]);
            result[key] = {};
            for (const subtype of subtypes) {
                (result[key] as Record<string, unknown>)[subtype] = {
                    ...((mainTool[subtype] as Record<string, unknown>) || {}),
                    ...((localTool[subtype] as Record<string, unknown>) || {}),
                };
            }
        }
    }

    return result as unknown as ProjectConfig;
}

export async function getConfigSource(projectPath: string): Promise<ConfigSource> {
    if (await hasAnyNewConfig(projectPath)) return 'new';
    return 'none';
}

/**
 * Read repository-side source configuration (used when `projectPath` is a rules repo).
 * Returns the full config which may contain sourceDir.
 * Supports sourceDir-based repository configuration.
 */
export async function getRepoSourceConfig(projectPath: string): Promise<RepoSourceConfig> {
    const newPath = path.join(projectPath, CONFIG_FILENAME);
    if (await fs.pathExists(newPath)) {
        const config = await readConfigFile<ProjectConfig>(newPath);

        // New format: sourceDir is present
        if (config.sourceDir) {
            return buildRepoSourceFromNestedStrings(config.sourceDir, config.rootPath).config;
        }

        // Not a rules repo config (no sourceDir)
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
    const rawValue = readNestedSourceDirValue(repoConfig, tool, subtype);
    const toolDir = typeof rawValue === 'string' ? rawValue : rawValue?.dir;

    // 3. Apply rootPath and default
    const dir = toolDir ?? defaultDir;
    return rootPath ? path.join(rootPath, dir) : dir;
}

/**
 * Get optional source file override for a tool/subtype.
 * When sourceDir uses object format { dir, sourceFile }, returns sourceFile.
 * Used when a different source filename is needed (e.g. common/AGENTS.md as CLAUDE.md source).
 */
export function getSourceFileOverride(repoConfig: RepoSourceConfig, tool: string, subtype: string): string | undefined {
    const rawValue = readNestedSourceDirValue(repoConfig, tool, subtype);
    if (rawValue && typeof rawValue === 'object' && rawValue.mode === 'file' && rawValue.sourceFile) {
        return rawValue.sourceFile;
    }
    return undefined;
}

/**
 * Get optional target file override for a tool/subtype.
 * When sourceDir uses object format { mode: 'file', dir, targetFile }, returns targetFile.
 * Used when symlink should have a different name (e.g. AGENTS.md -> CLAUDE.md).
 */
export function getTargetFileOverride(repoConfig: RepoSourceConfig, tool: string, subtype: string): string | undefined {
    const rawValue = readNestedSourceDirValue(repoConfig, tool, subtype);
    if (rawValue && typeof rawValue === 'object' && rawValue.mode === 'file' && rawValue.targetFile) {
        return rawValue.targetFile;
    }
    return undefined;
}

/**
 * Get optional source directory override for a tool/subtype (directory mode).
 * When sourceDir uses object format { mode: 'directory', dir, sourceDir }, returns sourceDir.
 * Used when a different source subdirectory is needed (e.g. common/shared-rules).
 */
export function getSourceDirOverride(repoConfig: RepoSourceConfig, tool: string, subtype: string): string | undefined {
    const rawValue = readNestedSourceDirValue(repoConfig, tool, subtype);
    if (rawValue && typeof rawValue === 'object' && rawValue.mode === 'directory' && rawValue.sourceDir) {
        return rawValue.sourceDir;
    }
    return undefined;
}

/**
 * Get optional target name override for a tool/subtype (directory mode).
 * When sourceDir uses object format { mode: 'directory', dir, targetName }, returns targetName.
 * Used when symlink directory should have a different name (e.g. shared-rules -> cursor-rules).
 * For file mode, use getTargetFileOverride instead.
 */
export function getTargetNameOverride(repoConfig: RepoSourceConfig, tool: string, subtype: string): string | undefined {
    const rawValue = readNestedSourceDirValue(repoConfig, tool, subtype);
    if (rawValue && typeof rawValue === 'object' && rawValue.mode === 'directory' && rawValue.targetName) {
        return rawValue.targetName;
    }
    return undefined;
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
    const mainRaw = await readConfigFile<Record<string, unknown>>(path.join(projectPath, CONFIG_FILENAME));
    const localRaw = await readConfigFile<Record<string, unknown>>(path.join(projectPath, LOCAL_CONFIG_FILENAME));
    const main = normalizeConfig(mainRaw);
    const local = normalizeConfig(localRaw);
    return mergeCombined(main, local);
}

async function readNewConfigForWrite(projectPath: string, isLocal: boolean): Promise<ProjectConfig> {
    const configPath = path.join(projectPath, isLocal ? LOCAL_CONFIG_FILENAME : CONFIG_FILENAME);
    return await readConfigFile<ProjectConfig>(configPath);
}

async function writeNewConfig(projectPath: string, isLocal: boolean, config: ProjectConfig): Promise<void> {
    const configPath = path.join(projectPath, isLocal ? LOCAL_CONFIG_FILENAME : CONFIG_FILENAME);
    const output = { version: CURRENT_CONFIG_VERSION, ...config };
    await fs.writeJson(configPath, output, { spaces: 2 });
}

/**
 * Generic function to add a dependency to project config
 * This function works with any adapter by using the configPath
 */
export async function addDependencyGeneric(
    projectPath: string,
    configPath: ConfigPath,
    name: string,
    repoUrl: string,
    alias?: string,
    isLocal: boolean = false,
    targetDir?: string
): Promise<void> {
    const config = await readNewConfigForWrite(projectPath, isLocal);

    const section = ensureAtPath(config as Record<string, unknown>, configPath);

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

    section[targetName] = entryValue;

    await writeNewConfig(projectPath, isLocal, config);
}

/**
 * Generic function to remove a dependency from project config
 */
export async function removeDependencyGeneric(
    projectPath: string,
    configPath: ConfigPath,
    alias: string
): Promise<{ removedFrom: string[] }> {
    const removedFrom: string[] = [];

    const mainPath = path.join(projectPath, CONFIG_FILENAME);
    const mainConfig = await readConfigFile<ProjectConfig>(mainPath);
    if (deleteAtPath(mainConfig, configPath, alias)) {
        await fs.writeJson(mainPath, mainConfig, { spaces: 2 });
        removedFrom.push(CONFIG_FILENAME);
    }

    const localPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    const localConfig = await readConfigFile<ProjectConfig>(localPath);
    if (deleteAtPath(localConfig, configPath, alias)) {
        await fs.writeJson(localPath, localConfig, { spaces: 2 });
        removedFrom.push(LOCAL_CONFIG_FILENAME);
    }

    return { removedFrom };
}

/**
 * Add a dependency to the user project config (user.json).
 * Used when --user flag is set.
 */
export async function addUserDependency(
    configPath: ConfigPath,
    name: string,
    repoUrl: string,
    alias?: string,
    targetDir?: string
): Promise<void> {
    const config = await getUserProjectConfig();

    const section = ensureAtPath(config as Record<string, unknown>, configPath);

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

    section[targetName] = entryValue;
    await saveUserProjectConfig(config);
}

/**
 * Remove a dependency from the user project config (user.json).
 * Used when --user flag is set.
 */
export async function removeUserDependency(
    configPath: ConfigPath,
    alias: string
): Promise<{ removedFrom: string[] }> {
    const removedFrom: string[] = [];
    const userPath = await getUserConfigPath();
    const config = await getUserProjectConfig();

    if (deleteAtPath(config, configPath, alias)) {
        await saveUserProjectConfig(config);
        removedFrom.push(path.basename(userPath));
    }

    return { removedFrom };
}
