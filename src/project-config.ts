import fs from 'fs-extra';
import path from 'path';
import { getUserConfigPath, getUserProjectConfig, saveUserProjectConfig } from './config.js';

const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

/** Source dir value: string (legacy) or object with dir and optional sourceFile/targetFile overrides */
export type SourceDirValue = string | { dir: string; sourceFile?: string; targetFile?: string };

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
    if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).dir === 'string') {
        return value as SourceDirValue;
    }
    return undefined;
}

function readNestedTargetFileValue(source: unknown, tool: string, subtype: string): string | undefined {
    const rawValue = readNestedSourceDirValue(source, tool, subtype);
    if (rawValue && typeof rawValue === 'object' && rawValue.targetFile) {
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
                writeNestedValue(config, tool, subtype, value as SourceDirValue);
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
 * Value can be string (dir path) or object with dir + optional sourceFile/targetFile overrides.
 * Example: { dir: "common", sourceFile: "AGENTS.md", targetFile: "CLAUDE.md" } lets claude-md use common/AGENTS.md as CLAUDE.md source.
 */
export interface SourceDirConfig {
    [tool: string]: Record<string, string | { dir: string; sourceFile?: string; targetFile?: string }> | undefined;
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
    if (rawValue && typeof rawValue === 'object' && rawValue.sourceFile) {
        return rawValue.sourceFile;
    }
    return undefined;
}

/**
 * Get optional target file override for a tool/subtype.
 * When sourceDir uses object format { dir, sourceFile, targetFile }, returns targetFile.
 * Used when symlink should have a different name (e.g. AGENTS.md -> CLAUDE.md).
 */
export function getTargetFileOverride(repoConfig: RepoSourceConfig, tool: string, subtype: string): string | undefined {
    return readNestedTargetFileValue(repoConfig, tool, subtype);
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
    const main = await readConfigFile<ProjectConfig>(path.join(projectPath, CONFIG_FILENAME));
    const local = await readConfigFile<ProjectConfig>(path.join(projectPath, LOCAL_CONFIG_FILENAME));
    return mergeCombined(main, local);
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
): Promise<void> {
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
}

/**
 * Generic function to remove a dependency from project config
 */
export async function removeDependencyGeneric(
    projectPath: string,
    configPath: [string, string],
    alias: string
): Promise<{ removedFrom: string[] }> {
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

    return { removedFrom };
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
