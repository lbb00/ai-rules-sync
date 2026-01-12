import fs from 'fs-extra';
import path from 'path';

const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

// Legacy (temporary) compatibility. Intentionally centralized so it can be removed in a future version.
const LEGACY_CONFIG_FILENAME = 'cursor-rules.json';
const LEGACY_LOCAL_CONFIG_FILENAME = 'cursor-rules.local.json';

export type RuleEntry = string | { url: string; rule?: string };

/**
 * Source directory configuration (for rules repositories)
 * Defines where source files are located in a rules repo
 */
export interface SourceDirConfig {
    cursor?: {
        // Source directory for cursor rules, default: ".cursor/rules"
        rules?: string;
        // Source directory for cursor plans, default: ".cursor/plans"
        plans?: string;
    };
    copilot?: {
        // Source directory for copilot instructions, default: ".github/instructions"
        instructions?: string;
    };
}

/**
 * Unified configuration for ai-rules-sync.json
 * Used both in rules repos (sourceDir) and in projects (cursor/copilot dependencies)
 *
 * In rules repos:
 *   - rootPath: global path prefix
 *   - sourceDir: where source files are located
 *
 * In projects:
 *   - cursor/copilot: dependency records
 */
export interface ProjectConfig {
    // Global path prefix for source directories, default: "" (root directory)
    // Only used in rules repos
    rootPath?: string;
    // Source directory configuration (only used in rules repos)
    sourceDir?: SourceDirConfig;
    // Dependency records (used in projects)
    cursor?: {
        // key is the local alias (target name), value is repo url OR object with url and original rule name
        rules?: Record<string, RuleEntry>;
        plans?: Record<string, RuleEntry>;
    };
    copilot?: {
        // key is the local alias (target name), value is repo url OR object with url and original rule name
        instructions?: Record<string, RuleEntry>;
    };
}

/**
 * @deprecated Use ProjectConfig with sourceDir instead
 * Kept for backward compatibility during transition
 */
export interface RepoSourceConfig {
    rootPath?: string;
    cursor?: {
        rules?: string;
        plans?: string;
    };
    copilot?: {
        instructions?: string;
    };
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

function mergeCombined(main: ProjectConfig, local: ProjectConfig): ProjectConfig {
    return {
        cursor: {
            rules: { ...(main.cursor?.rules || {}), ...(local.cursor?.rules || {}) },
            plans: { ...(main.cursor?.plans || {}), ...(local.cursor?.plans || {}) }
        },
        copilot: {
            instructions: { ...(main.copilot?.instructions || {}), ...(local.copilot?.instructions || {}) }
        }
    };
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
            return {
                rootPath: config.rootPath,
                cursor: config.sourceDir.cursor,
                copilot: config.sourceDir.copilot
            };
        }

        // Legacy format: cursor.rules/plans/instructions are strings (source dirs)
        // We need to detect if this is a rules repo config (string values) vs project config (object values)
        // Check if cursor.rules is a string (rules repo) or object (project dependencies)
        const cursorRules = config.cursor?.rules;
        const cursorPlans = config.cursor?.plans;
        const copilotInstructions = config.copilot?.instructions;

        const isCursorRulesString = typeof cursorRules === 'string';
        const isCursorPlansString = typeof cursorPlans === 'string';
        const isCopilotInstructionsString = typeof copilotInstructions === 'string';

        // If any of these are strings, treat as legacy rules repo config
        if (isCursorRulesString || isCursorPlansString || isCopilotInstructionsString) {
            return {
                rootPath: config.rootPath,
                cursor: {
                    rules: isCursorRulesString ? cursorRules : undefined,
                    plans: isCursorPlansString ? cursorPlans : undefined
                },
                copilot: {
                    instructions: isCopilotInstructionsString ? copilotInstructions : undefined
                }
            };
        }

        // Not a rules repo config (no sourceDir, no string values)
        return { rootPath: config.rootPath };
    }
    return {};
}

/**
 * Get the source directory for a specific tool type from repo config.
 * @param repoConfig - The repo source configuration
 * @param tool - Tool name: 'cursor' or 'copilot'
 * @param subtype - Subtype: 'rules', 'plans', or 'instructions'
 * @param defaultDir - Default directory if not configured
 */
export function getSourceDir(
    repoConfig: RepoSourceConfig,
    tool: string,
    subtype: string,
    defaultDir: string
): string {
    const rootPath = repoConfig.rootPath || '';
    let toolDir: string | undefined;

    if (tool === 'cursor') {
        if (subtype === 'rules') {
            toolDir = repoConfig.cursor?.rules;
        } else if (subtype === 'plans') {
            toolDir = repoConfig.cursor?.plans;
        }
    } else if (tool === 'copilot') {
        if (subtype === 'instructions') {
            toolDir = repoConfig.copilot?.instructions;
        }
    }

    const dir = toolDir ?? defaultDir;
    return rootPath ? path.join(rootPath, dir) : dir;
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

export async function addCursorDependency(projectPath: string, ruleName: string, repoUrl: string, alias?: string, isLocal: boolean = false): Promise<{ migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const config = await readNewConfigForWrite(projectPath, isLocal);

    config.cursor ??= {};
    config.cursor.rules ??= {};

    const targetName = alias || ruleName;
    config.cursor.rules[targetName] =
        alias && alias !== ruleName
            ? { url: repoUrl, rule: ruleName }
            : repoUrl;

    await writeNewConfig(projectPath, isLocal, config);
    return migration;
}

export async function removeCursorDependency(projectPath: string, alias: string): Promise<{ removedFrom: string[]; migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const removedFrom: string[] = [];

    const mainPath = path.join(projectPath, CONFIG_FILENAME);
    const mainConfig = await readConfigFile<ProjectConfig>(mainPath);
    if (mainConfig.cursor?.rules && mainConfig.cursor.rules[alias]) {
        delete mainConfig.cursor.rules[alias];
        await fs.writeJson(mainPath, mainConfig, { spaces: 2 });
        removedFrom.push(CONFIG_FILENAME);
    }

    const localPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    const localConfig = await readConfigFile<ProjectConfig>(localPath);
    if (localConfig.cursor?.rules && localConfig.cursor.rules[alias]) {
        delete localConfig.cursor.rules[alias];
        await fs.writeJson(localPath, localConfig, { spaces: 2 });
        removedFrom.push(LOCAL_CONFIG_FILENAME);
    }

    return { removedFrom, migrated: migration.migrated };
}

export async function addCopilotDependency(projectPath: string, ruleName: string, repoUrl: string, alias?: string, isLocal: boolean = false): Promise<{ migrated: boolean }> {
    // If legacy exists, migrate first to avoid new-config shadowing legacy main rules.
    const migration = await migrateLegacyToNew(projectPath);
    const config = await readNewConfigForWrite(projectPath, isLocal);

    config.copilot ??= {};
    config.copilot.instructions ??= {};

    const targetName = alias || ruleName;
    config.copilot.instructions[targetName] =
        alias && alias !== ruleName
            ? { url: repoUrl, rule: ruleName }
            : repoUrl;

    await writeNewConfig(projectPath, isLocal, config);
    return migration;
}

export async function removeCopilotDependency(projectPath: string, alias: string): Promise<{ removedFrom: string[]; migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const removedFrom: string[] = [];

    const mainPath = path.join(projectPath, CONFIG_FILENAME);
    const mainConfig = await readConfigFile<ProjectConfig>(mainPath);
    if (mainConfig.copilot?.instructions && mainConfig.copilot.instructions[alias]) {
        delete mainConfig.copilot.instructions[alias];
        await fs.writeJson(mainPath, mainConfig, { spaces: 2 });
        removedFrom.push(CONFIG_FILENAME);
    }

    const localPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    const localConfig = await readConfigFile<ProjectConfig>(localPath);
    if (localConfig.copilot?.instructions && localConfig.copilot.instructions[alias]) {
        delete localConfig.copilot.instructions[alias];
        await fs.writeJson(localPath, localConfig, { spaces: 2 });
        removedFrom.push(LOCAL_CONFIG_FILENAME);
    }

    return { removedFrom, migrated: migration.migrated };
}

// ============ Plans support ============

export async function addPlanDependency(projectPath: string, planName: string, repoUrl: string, alias?: string, isLocal: boolean = false): Promise<{ migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const config = await readNewConfigForWrite(projectPath, isLocal);

    config.cursor ??= {};
    config.cursor.plans ??= {};

    const targetName = alias || planName;
    config.cursor.plans[targetName] =
        alias && alias !== planName
            ? { url: repoUrl, rule: planName }
            : repoUrl;

    await writeNewConfig(projectPath, isLocal, config);
    return migration;
}

export async function removePlanDependency(projectPath: string, alias: string): Promise<{ removedFrom: string[]; migrated: boolean }> {
    const migration = await migrateLegacyToNew(projectPath);
    const removedFrom: string[] = [];

    const mainPath = path.join(projectPath, CONFIG_FILENAME);
    const mainConfig = await readConfigFile<ProjectConfig>(mainPath);
    if (mainConfig.cursor?.plans && mainConfig.cursor.plans[alias]) {
        delete mainConfig.cursor.plans[alias];
        await fs.writeJson(mainPath, mainConfig, { spaces: 2 });
        removedFrom.push(CONFIG_FILENAME);
    }

    const localPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    const localConfig = await readConfigFile<ProjectConfig>(localPath);
    if (localConfig.cursor?.plans && localConfig.cursor.plans[alias]) {
        delete localConfig.cursor.plans[alias];
        await fs.writeJson(localPath, localConfig, { spaces: 2 });
        removedFrom.push(LOCAL_CONFIG_FILENAME);
    }

    return { removedFrom, migrated: migration.migrated };
}

// Backwards-compatible exports for existing code paths (Cursor only). These will be removed once CLI is migrated.
export async function addDependency(projectPath: string, ruleName: string, repoUrl: string, alias?: string, isLocal: boolean = false) {
    return addCursorDependency(projectPath, ruleName, repoUrl, alias, isLocal);
}

export async function removeDependency(projectPath: string, alias: string): Promise<string[]> {
    const { removedFrom } = await removeCursorDependency(projectPath, alias);
    return removedFrom;
}
