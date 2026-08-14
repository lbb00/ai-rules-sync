import { SyncAdapter, AdapterRegistry } from './types.js';
import { cursorRulesAdapter } from './cursor-rules.js';
import { cursorCommandsAdapter } from './cursor-commands.js';
import { copilotInstructionsAdapter } from './copilot-instructions.js';
import { copilotSkillsAdapter } from './copilot-skills.js';
import { copilotPromptsAdapter } from './copilot-prompts.js';
import { copilotAgentsAdapter } from './copilot-agents.js';
import { claudeSkillsAdapter } from './claude-skills.js';
import { claudeAgentsAdapter } from './claude-agents.js';
import { claudeRulesAdapter } from './claude-rules.js';
import { claudeMdAdapter } from './claude-md.js';
import { cursorSkillsAdapter } from './cursor-skills.js';
import { cursorAgentsAdapter } from './cursor-agents.js';
import { traeRulesAdapter } from './trae-rules.js';
import { traeSkillsAdapter } from './trae-skills.js';
import { opencodeAgentsAdapter } from './opencode-agents.js';
import { opencodeSkillsAdapter } from './opencode-skills.js';
import { opencodeCommandsAdapter } from './opencode-commands.js';
import { opencodeToolsAdapter } from './opencode-tools.js';
import { agentsMdAdapter } from './agents-md.js';
import { codexRulesAdapter } from './codex-rules.js';
import { codexSkillsAdapter } from './codex-skills.js';
import { geminiCommandsAdapter } from './gemini-commands.js';
import { geminiSkillsAdapter } from './gemini-skills.js';
import { geminiAgentsAdapter } from './gemini-agents.js';
import { geminiMdAdapter } from './gemini-md.js';
import { codexMdAdapter } from './codex-md.js';
import { warpSkillsAdapter } from './warp-skills.js';
import { windsurfRulesAdapter } from './windsurf-rules.js';
import { clineRulesAdapter } from './cline-rules.js';
import { windsurfSkillsAdapter } from './windsurf-skills.js';
import { clineSkillsAdapter } from './cline-skills.js';
import { codebuddyRulesAdapter } from './codebuddy-rules.js';
import { codebuddySkillsAdapter } from './codebuddy-skills.js';
import { codebuddyCommandsAdapter } from './codebuddy-commands.js';
import { codebuddyMdAdapter } from './codebuddy-md.js';
import { piSkillsAdapter } from './pi-skills.js';
import { piPromptsAdapter } from './pi-prompts.js';
import { antigravitySkillsAdapter } from './antigravity-cli-skills.js';
import { antigravityWorkflowsAdapter } from './antigravity-cli-workflows.js';
import { workbuddySkillsAdapter } from './workbuddy-skills.js';
import { deepseekSkillsAdapter } from './deepseek-skills.js';
import { factorydroidSkillsAdapter } from './factorydroid-skills.js';
import { kimiSkillsAdapter } from './kimi-skills.js';
import { kiloSkillsAdapter } from './kilo-skills.js';
import { hermesSkillsAdapter } from './hermes-skills.js';
import { factorydroidCommandsAdapter } from './factorydroid-commands.js';
import { factorydroidAgentsAdapter } from './factorydroid-agents.js';
import { kiloCommandsAdapter } from './kilo-commands.js';
import { kiloAgentsAdapter } from './kilo-agents.js';
import { kimiAgentsAdapter } from './kimi-agents.js';
import { junieSkillsAdapter } from './junie-skills.js';
import { junieAgentsAdapter } from './junie-agents.js';
import { junieCommandsAdapter } from './junie-commands.js';
import { junieRulesAdapter } from './junie-rules.js';
import { kiroSkillsAdapter } from './kiro-skills.js';
import { kiroAgentsAdapter } from './kiro-agents.js';
import { kiroRulesAdapter } from './kiro-rules.js';
import { qwenSkillsAdapter } from './qwen-skills.js';
import { qwenAgentsAdapter } from './qwen-agents.js';
import { qwenCommandsAdapter } from './qwen-commands.js';
import { qwenRulesAdapter } from './qwen-rules.js';
import { augmentSkillsAdapter } from './augment-skills.js';
import { augmentAgentsAdapter } from './augment-agents.js';
import { augmentCommandsAdapter } from './augment-commands.js';
import { augmentRulesAdapter } from './augment-rules.js';
import { deepagentsSkillsAdapter } from './deepagents-skills.js';
import { deepagentsAgentsAdapter } from './deepagents-agents.js';
import { continueSkillsAdapter } from './continue-skills.js';
import { continueRulesAdapter } from './continue-rules.js';
import { continuePromptsAdapter } from './continue-prompts.js';
import { aiderSkillsAdapter } from './aider-skills.js';
import { zedSkillsAdapter } from './zed-skills.js';
import { gooseSkillsAdapter } from './goose-skills.js';
import { traeAgentsAdapter } from './trae-agents.js';
import { traeCommandsAdapter } from './trae-commands.js';
import { clineCommandsAdapter } from './cline-commands.js';
import { windsurfCommandsAdapter } from './windsurf-commands.js';
import { opencodeRulesAdapter } from './opencode-rules.js';
import { ampSkillsAdapter } from './amp-skills.js';
import { codexAgentsAdapter } from './codex-agents.js';
import { clineAgentsAdapter } from './cline-agents.js';
import { ProjectConfig, getConfigSectionWithFallback } from '../project-config.js';

// Re-export types and utilities
export * from './types.js';
export { stripCopilotSuffix, hasCopilotSuffix } from './copilot-instructions.js';
export { createBaseAdapter } from './base.js';

/**
 * Default adapter registry with all built-in adapters
 */
class DefaultAdapterRegistry implements AdapterRegistry {
    private adapters: Map<string, SyncAdapter> = new Map();
    private toolMap: Map<string, SyncAdapter[]> = new Map();

    constructor() {
        // Register built-in adapters
        this.register(cursorRulesAdapter);
        this.register(cursorCommandsAdapter);
        this.register(cursorSkillsAdapter);
        this.register(cursorAgentsAdapter);
        this.register(copilotInstructionsAdapter);
        this.register(copilotSkillsAdapter);
        this.register(copilotPromptsAdapter);
        this.register(copilotAgentsAdapter);
        this.register(claudeSkillsAdapter);
        this.register(claudeAgentsAdapter);
        this.register(claudeRulesAdapter);
        this.register(claudeMdAdapter);
        this.register(traeRulesAdapter);
        this.register(traeSkillsAdapter);
        this.register(opencodeAgentsAdapter);
        this.register(opencodeSkillsAdapter);
        this.register(opencodeCommandsAdapter);
        this.register(opencodeToolsAdapter);
        this.register(agentsMdAdapter);
        this.register(codexRulesAdapter);
        this.register(codexSkillsAdapter);
        this.register(geminiCommandsAdapter);
        this.register(geminiSkillsAdapter);
        this.register(geminiAgentsAdapter);
        this.register(geminiMdAdapter);
        this.register(codexMdAdapter);
        this.register(warpSkillsAdapter);
        this.register(windsurfRulesAdapter);
        this.register(windsurfSkillsAdapter);
        this.register(clineRulesAdapter);
        this.register(clineSkillsAdapter);
        this.register(codebuddyRulesAdapter);
        this.register(codebuddySkillsAdapter);
        this.register(codebuddyCommandsAdapter);
        this.register(codebuddyMdAdapter);
        this.register(piSkillsAdapter);
        this.register(piPromptsAdapter);
        this.register(antigravitySkillsAdapter);
        this.register(antigravityWorkflowsAdapter);
        this.register(workbuddySkillsAdapter);
        this.register(deepseekSkillsAdapter);
        this.register(factorydroidSkillsAdapter);
        this.register(kimiSkillsAdapter);
        this.register(kiloSkillsAdapter);
        this.register(hermesSkillsAdapter);
        this.register(factorydroidCommandsAdapter);
        this.register(factorydroidAgentsAdapter);
        this.register(kiloCommandsAdapter);
        this.register(kiloAgentsAdapter);
        this.register(kimiAgentsAdapter);
        this.register(junieSkillsAdapter);
        this.register(junieAgentsAdapter);
        this.register(junieCommandsAdapter);
        this.register(junieRulesAdapter);
        this.register(kiroSkillsAdapter);
        this.register(kiroAgentsAdapter);
        this.register(kiroRulesAdapter);
        this.register(qwenSkillsAdapter);
        this.register(qwenAgentsAdapter);
        this.register(qwenCommandsAdapter);
        this.register(qwenRulesAdapter);
        this.register(augmentSkillsAdapter);
        this.register(augmentAgentsAdapter);
        this.register(augmentCommandsAdapter);
        this.register(augmentRulesAdapter);
        this.register(deepagentsSkillsAdapter);
        this.register(deepagentsAgentsAdapter);
        this.register(continueSkillsAdapter);
        this.register(continueRulesAdapter);
        this.register(continuePromptsAdapter);
        this.register(aiderSkillsAdapter);
        this.register(zedSkillsAdapter);
        this.register(gooseSkillsAdapter);
        this.register(traeAgentsAdapter);
        this.register(traeCommandsAdapter);
        this.register(clineCommandsAdapter);
        this.register(windsurfCommandsAdapter);
        this.register(opencodeRulesAdapter);
        this.register(ampSkillsAdapter);
        this.register(codexAgentsAdapter);
        this.register(clineAgentsAdapter);
    }

    register(adapter: SyncAdapter): void {
        this.adapters.set(adapter.name, adapter);

        const toolAdapters = this.toolMap.get(adapter.tool) || [];
        toolAdapters.push(adapter);
        this.toolMap.set(adapter.tool, toolAdapters);
    }

    get(tool: string, subtype: string): SyncAdapter | undefined {
        return this.adapters.get(`${tool}-${subtype}`);
    }

    getByName(name: string): SyncAdapter | undefined {
        return this.adapters.get(name);
    }

    getForTool(tool: string): SyncAdapter[] {
        return this.toolMap.get(tool) || [];
    }

    getDefaultForTool(tool: string): SyncAdapter | undefined {
        const toolAdapters = this.toolMap.get(tool);
        return toolAdapters?.[0];
    }

    all(): SyncAdapter[] {
        return Array.from(this.adapters.values());
    }
}

/**
 * Global adapter registry instance
 */
export const adapterRegistry = new DefaultAdapterRegistry();

/**
 * Get an adapter by tool and subtype
 */
export function getAdapter(tool: string, subtype: string): SyncAdapter {
    const adapter = adapterRegistry.get(tool, subtype);
    if (!adapter) {
        throw new Error(`No adapter found for ${tool}/${subtype}`);
    }
    return adapter;
}

/**
 * Get the default adapter for a tool
 */
export function getDefaultAdapter(tool: string): SyncAdapter {
    const adapter = adapterRegistry.getDefaultForTool(tool);
    if (!adapter) {
        throw new Error(`No adapters found for tool "${tool}"`);
    }
    return adapter;
}

/**
 * Get all adapters for a tool
 */
export function getToolAdapters(tool: string): SyncAdapter[] {
    return adapterRegistry.getForTool(tool);
}
/**
 * Find adapter by checking which config section contains the alias
 */
export function findAdapterForAlias(
    cfg: ProjectConfig,
    alias: string
): { adapter: SyncAdapter; section: string } | null {
    for (const adapter of adapterRegistry.all()) {
        const sectionConfig = getAliasSectionConfig(cfg, adapter);
        if (sectionConfig && Object.prototype.hasOwnProperty.call(sectionConfig, alias)) {
            return { adapter, section: getSectionName(adapter) };
        }
    }
    return null;
}

function getAliasSectionConfig(cfg: ProjectConfig, adapter: SyncAdapter): Record<string, unknown> {
    const [topLevel, subLevel] = adapter.configPath;
    const section = getConfigSectionWithFallback(cfg, topLevel, subLevel);
    return section as Record<string, unknown>;
}

function getSectionName(adapter: SyncAdapter): string {
    const [topLevel, subLevel] = adapter.configPath;
    return `${topLevel}.${subLevel}`;
}
