import fs from 'fs-extra';
import path from 'path';
import { getUserConfigPath, getUserProjectConfig, saveUserProjectConfig } from './config.js';

const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

// Legacy (temporary) compatibility. Intentionally centralized so it can be removed in a future version.
const LEGACY_CONFIG_FILENAME = 'cursor-rules.json';
const LEGACY_LOCAL_CONFIG_FILENAME = 'cursor-rules.local.json';

/**
 * Extended rule entry with optional targetDir
 */
export type RuleEntry = string | {
    url: string;
    rule?: string;
    targetDir?: string;  // Entry-level custom target directory
};

/**
 * Source directory configuration (for rules repositories)
 * Defines where source files are located in a rules repo
 */
export interface SourceDirConfig {
    cursor?: {
        // Source directory for cursor rules, default: ".cursor/rules"
        rules?: string;
        // Source directory for cursor commands, default: ".cursor/commands"
        commands?: string;
        // Source directory for cursor skills, default: ".cursor/skills"
        skills?: string;
        // Source directory for cursor agents, default: ".cursor/agents"
        agents?: string;
    };
    copilot?: {
        // Source directory for copilot instructions, default: ".github/instructions"
        instructions?: string;
        // Source directory for copilot skills, default: ".github/skills"
        skills?: string;
        // Source directory for copilot prompts, default: ".github/prompts"
        prompts?: string;
        // Source directory for copilot agents, default: ".github/agents"
        agents?: string;
    };
    claude?: {
        // Source directory for claude skills, default: ".claude/skills"
        skills?: string;
        // Source directory for claude agents, default: ".claude/agents"
        agents?: string;
        // Source directory for claude rules, default: ".claude/rules"
        rules?: string;
        // Source directory for claude md files (CLAUDE.md), default: ".claude"
        md?: string;
    };
    trae?: {
        // Source directory for trae rules, default: ".trae/rules"
        rules?: string;
        // Source directory for trae skills, default: ".trae/skills"
        skills?: string;
    };
    opencode?: {
        // Source directory for opencode agents, default: ".opencode/agents"
        agents?: string;
        // Source directory for opencode skills, default: ".opencode/skills"
        skills?: string;
        // Source directory for opencode commands, default: ".opencode/commands"
        commands?: string;
        // Source directory for opencode tools, default: ".opencode/tools"
        tools?: string;
    };
    codex?: {
        // Source directory for codex rules, default: ".codex/rules"
        rules?: string;
        // Source directory for codex skills, default: ".agents/skills"
        skills?: string;
    };
    gemini?: {
        // Source directory for gemini commands, default: ".gemini/commands"
        commands?: string;
        // Source directory for gemini skills, default: ".gemini/skills"
        skills?: string;
        // Source directory for gemini agents, default: ".gemini/agents"
        agents?: string;
    };
    warp?: {
        // Source directory for warp skills, default: ".agents/skills"
        skills?: string;
    };
    agentsMd?: {
        // Source directory for AGENTS.md files, default: "." (repository root)
        file?: string;
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
        commands?: Record<string, RuleEntry>;
        skills?: Record<string, RuleEntry>;
        agents?: Record<string, RuleEntry>;
    };
    copilot?: {
        // key is the local alias (target name), value is repo url OR object with url and original rule name
        instructions?: Record<string, RuleEntry>;
        skills?: Record<string, RuleEntry>;
        prompts?: Record<string, RuleEntry>;
        agents?: Record<string, RuleEntry>;
    };
    claude?: {
        // key is the local alias (target name), value is repo url OR object with url and original rule name
        skills?: Record<string, RuleEntry>;
        agents?: Record<string, RuleEntry>;
        rules?: Record<string, RuleEntry>;
        md?: Record<string, RuleEntry>;
    };
    trae?: {
        rules?: Record<string, RuleEntry>;
        skills?: Record<string, RuleEntry>;
    };
    opencode?: {
        // key is the local alias (target name), value is repo url OR object with url and original rule name
        agents?: Record<string, RuleEntry>;
        skills?: Record<string, RuleEntry>;
        commands?: Record<string, RuleEntry>;
        tools?: Record<string, RuleEntry>;
    };
    codex?: {
        rules?: Record<string, RuleEntry>;
        skills?: Record<string, RuleEntry>;
    };
    gemini?: {
        commands?: Record<string, RuleEntry>;
        skills?: Record<string, RuleEntry>;
        agents?: Record<string, RuleEntry>;
    };
    warp?: {
        skills?: Record<string, RuleEntry>;
    };
    // Universal AGENTS.md support (tool-agnostic)
    agentsMd?: Record<string, RuleEntry>;
}

/**
 * @deprecated Use ProjectConfig with sourceDir instead
 * Kept for backward compatibility during transition
 */
export interface RepoSourceConfig {
    rootPath?: string;
    cursor?: {
        rules?: string;
        skills?: string;
        commands?: string;
        agents?: string;
    };
    copilot?: {
        instructions?: string;
        skills?: string;
        prompts?: string;
        agents?: string;
    };
    claude?: {
        skills?: string;
        agents?: string;
        rules?: string;
        md?: string;
    };
    trae?: {
        rules?: string;
        skills?: string;
    };
    opencode?: {
        agents?: string;
        skills?: string;
        commands?: string;
        tools?: string;
    };
    codex?: {
        rules?: string;
        skills?: string;
    };
    agentsMd?: {
        file?: string;
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
            commands: { ...(main.cursor?.commands || {}), ...(local.cursor?.commands || {}) },
            skills: { ...(main.cursor?.skills || {}), ...(local.cursor?.skills || {}) },
            agents: { ...(main.cursor?.agents || {}), ...(local.cursor?.agents || {}) }
        },
        copilot: {
            instructions: { ...(main.copilot?.instructions || {}), ...(local.copilot?.instructions || {}) },
            skills: { ...(main.copilot?.skills || {}), ...(local.copilot?.skills || {}) },
            prompts: { ...(main.copilot?.prompts || {}), ...(local.copilot?.prompts || {}) },
            agents: { ...(main.copilot?.agents || {}), ...(local.copilot?.agents || {}) }
        },
        claude: {
            skills: { ...(main.claude?.skills || {}), ...(local.claude?.skills || {}) },
            agents: { ...(main.claude?.agents || {}), ...(local.claude?.agents || {}) },
            rules: { ...(main.claude?.rules || {}), ...(local.claude?.rules || {}) },
            md: { ...(main.claude?.md || {}), ...(local.claude?.md || {}) }
        },
        trae: {
            rules: { ...(main.trae?.rules || {}), ...(local.trae?.rules || {}) },
            skills: { ...(main.trae?.skills || {}), ...(local.trae?.skills || {}) }
        },
        opencode: {
            agents: { ...(main.opencode?.agents || {}), ...(local.opencode?.agents || {}) },
            skills: { ...(main.opencode?.skills || {}), ...(local.opencode?.skills || {}) },
            commands: { ...(main.opencode?.commands || {}), ...(local.opencode?.commands || {}) },
            tools: { ...(main.opencode?.tools || {}), ...(local.opencode?.tools || {}) }
        },
        codex: {
            rules: { ...(main.codex?.rules || {}), ...(local.codex?.rules || {}) },
            skills: { ...(main.codex?.skills || {}), ...(local.codex?.skills || {}) }
        },
        warp: {
            skills: { ...(main.warp?.skills || {}), ...(local.warp?.skills || {}) }
        },
        agentsMd: { ...(main.agentsMd || {}), ...(local.agentsMd || {}) }
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
                copilot: config.sourceDir.copilot,
                claude: config.sourceDir.claude,
                trae: config.sourceDir.trae,
                opencode: config.sourceDir.opencode,
                codex: config.sourceDir.codex,
                agentsMd: config.sourceDir.agentsMd
            };
        }

        // Legacy format: cursor.rules/commands/instructions are strings (source dirs)
        // We need to detect if this is a rules repo config (string values) vs project config (object values)
        // Check if cursor.rules is a string (rules repo) or object (project dependencies)
        const cursorRules = config.cursor?.rules;
        const cursorCommands = config.cursor?.commands;
        const cursorSkills = config.cursor?.skills;
        const cursorAgents = config.cursor?.agents;
        const copilotInstructions = config.copilot?.instructions;
        const copilotSkills = config.copilot?.skills;
        const copilotPrompts = (config.copilot as any)?.prompts;
        const copilotAgents = (config.copilot as any)?.agents;

        const isCursorRulesString = typeof cursorRules === 'string';
        const isCursorCommandsString = typeof cursorCommands === 'string';
        const isCursorSkillsString = typeof cursorSkills === 'string';
        const isCursorAgentsString = typeof cursorAgents === 'string';
        const isCopilotInstructionsString = typeof copilotInstructions === 'string';
        const isCopilotSkillsString = typeof copilotSkills === 'string';
        const isCopilotPromptsString = typeof copilotPrompts === 'string';
        const isCopilotAgentsString = typeof copilotAgents === 'string';
        const claudeSkills = config.claude?.skills;
        const claudeAgents = config.claude?.agents;
        const claudeRules = config.claude?.rules;
        const claudeMd = (config.claude as any)?.md;
        const isClaudeSkillsString = typeof claudeSkills === 'string';
        const isClaudeAgentsString = typeof claudeAgents === 'string';
        const isClaudeRulesString = typeof claudeRules === 'string';
        const isClaudeMdString = typeof claudeMd === 'string';
        const traeRules = config.trae?.rules;
        const traeSkills = config.trae?.skills;
        const isTraeRulesString = typeof traeRules === 'string';
        const isTraeSkillsString = typeof traeSkills === 'string';
        const opencodeAgents = config.opencode?.agents;
        const opencodeSkills = config.opencode?.skills;
        const opencodeCommands = config.opencode?.commands;
        const opencodeTools = config.opencode?.tools;
        const isOpencodeAgentsString = typeof opencodeAgents === 'string';
        const isOpencodeSkillsString = typeof opencodeSkills === 'string';
        const isOpencodeCommandsString = typeof opencodeCommands === 'string';
        const isOpencodeToolsString = typeof opencodeTools === 'string';
        const codexRules = config.codex?.rules;
        const codexSkills = config.codex?.skills;
        const isCodexRulesString = typeof codexRules === 'string';
        const isCodexSkillsString = typeof codexSkills === 'string';
        const agentsMdFile = config.agentsMd?.file;
        const isAgentsMdFileString = typeof agentsMdFile === 'string';

        // If any of these are strings, treat as legacy rules repo config
        if (isCursorRulesString || isCursorCommandsString || isCursorSkillsString || isCursorAgentsString || isCopilotInstructionsString || isCopilotSkillsString || isCopilotPromptsString || isCopilotAgentsString || isClaudeSkillsString || isClaudeAgentsString || isClaudeRulesString || isClaudeMdString || isTraeRulesString || isTraeSkillsString || isOpencodeAgentsString || isOpencodeSkillsString || isOpencodeCommandsString || isOpencodeToolsString || isCodexRulesString || isCodexSkillsString || isAgentsMdFileString) {
            return {
                rootPath: config.rootPath,
                cursor: {
                    rules: isCursorRulesString ? cursorRules : undefined,
                    commands: isCursorCommandsString ? cursorCommands : undefined,
                    skills: isCursorSkillsString ? cursorSkills : undefined,
                    agents: isCursorAgentsString ? cursorAgents : undefined
                },
                copilot: {
                    instructions: isCopilotInstructionsString ? copilotInstructions : undefined,
                    skills: isCopilotSkillsString ? copilotSkills : undefined,
                    prompts: isCopilotPromptsString ? copilotPrompts : undefined,
                    agents: isCopilotAgentsString ? copilotAgents : undefined
                },
                claude: {
                    skills: isClaudeSkillsString ? claudeSkills : undefined,
                    agents: isClaudeAgentsString ? claudeAgents : undefined,
                    rules: isClaudeRulesString ? claudeRules : undefined,
                    md: isClaudeMdString ? claudeMd : undefined
                },
                trae: {
                    rules: isTraeRulesString ? traeRules : undefined,
                    skills: isTraeSkillsString ? traeSkills : undefined
                },
                opencode: {
                    agents: isOpencodeAgentsString ? opencodeAgents : undefined,
                    skills: isOpencodeSkillsString ? opencodeSkills : undefined,
                    commands: isOpencodeCommandsString ? opencodeCommands : undefined,
                    tools: isOpencodeToolsString ? opencodeTools : undefined
                },
                codex: {
                    rules: isCodexRulesString ? codexRules : undefined,
                    skills: isCodexSkillsString ? codexSkills : undefined
                },
                agentsMd: {
                    file: isAgentsMdFileString ? agentsMdFile : undefined
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
 * @param tool - Tool name: 'cursor', 'copilot', or 'claude'
 * @param subtype - Subtype: 'rules', 'plans', 'instructions', 'skills', 'agents', or 'plugins'
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
    let toolDir: string | undefined;

    // 1. Check globalOverride first (CLI or global config - highest priority)
    if (globalOverride) {
        const toolConfig = (globalOverride as any)[tool];
        if (toolConfig && toolConfig[subtype]) {
            // globalOverride paths are relative to repo root, so no rootPath prefix
            return toolConfig[subtype];
        }
    }

    // 2. Check repoConfig (from repo's ai-rules-sync.json)
    if (tool === 'cursor') {
        if (subtype === 'rules') {
            toolDir = repoConfig.cursor?.rules;
        } else if (subtype === 'commands') {
            toolDir = repoConfig.cursor?.commands;
        } else if (subtype === 'skills') {
            toolDir = repoConfig.cursor?.skills;
        } else if (subtype === 'agents') {
            toolDir = repoConfig.cursor?.agents;
        }
    } else if (tool === 'copilot') {
        if (subtype === 'instructions') {
            toolDir = repoConfig.copilot?.instructions;
        } else if (subtype === 'skills') {
            toolDir = repoConfig.copilot?.skills;
        } else if (subtype === 'prompts') {
            toolDir = (repoConfig.copilot as any)?.prompts;
        } else if (subtype === 'agents') {
            toolDir = (repoConfig.copilot as any)?.agents;
        }
    } else if (tool === 'claude') {
        if (subtype === 'skills') {
            toolDir = repoConfig.claude?.skills;
        } else if (subtype === 'agents') {
            toolDir = repoConfig.claude?.agents;
        } else if (subtype === 'rules') {
            toolDir = repoConfig.claude?.rules;
        } else if (subtype === 'md') {
            toolDir = (repoConfig.claude as any)?.md;
        }
    } else if (tool === 'trae') {
        if (subtype === 'rules') {
            toolDir = repoConfig.trae?.rules;
        } else if (subtype === 'skills') {
            toolDir = repoConfig.trae?.skills;
        }
    } else if (tool === 'opencode') {
        if (subtype === 'agents') {
            toolDir = repoConfig.opencode?.agents;
        } else if (subtype === 'skills') {
            toolDir = repoConfig.opencode?.skills;
        } else if (subtype === 'commands') {
            toolDir = repoConfig.opencode?.commands;
        } else if (subtype === 'tools') {
            toolDir = repoConfig.opencode?.tools;
        }
    } else if (tool === 'codex') {
        if (subtype === 'rules') {
            toolDir = repoConfig.codex?.rules;
        } else if (subtype === 'skills') {
            toolDir = repoConfig.codex?.skills;
        }
    } else if (tool === 'warp') {
        if (subtype === 'skills') {
            toolDir = (repoConfig as any).warp?.skills;
        }
    } else if (tool === 'agents-md') {
        if (subtype === 'file') {
            toolDir = repoConfig.agentsMd?.file;
        }
    }

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
 * @param projectPath - Path to the project
 * @param configPath - Config path like ['cursor', 'rules'] or ['copilot', 'instructions']
 * @param name - Original name of the dependency
 * @param repoUrl - Repository URL
 * @param alias - Optional alias for the dependency
 * @param isLocal - Whether to store in local config
 * @param targetDir - Optional custom target directory for this entry
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
 * This function works with any adapter by using the configPath
 * @param projectPath - Path to the project
 * @param configPath - Config path like ['cursor', 'rules'] or ['copilot', 'instructions']
 * @param alias - Alias of the dependency to remove
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
