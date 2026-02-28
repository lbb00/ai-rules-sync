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
import { ProjectConfig } from '../project-config.js';

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

function getAliasSectionConfig(cfg: ProjectConfig, adapter: SyncAdapter): Record<string, unknown> | undefined {
    const [topLevel, subLevel] = adapter.configPath;
    const top = (cfg as Record<string, unknown>)[topLevel];
    if (!top || typeof top !== 'object') {
        return undefined;
    }

    // AGENTS.md dependencies are stored in flat `agentsMd` object for backward compatibility.
    if (topLevel === 'agentsMd') {
        return top as Record<string, unknown>;
    }

    const nested = (top as Record<string, unknown>)[subLevel];
    if (!nested || typeof nested !== 'object') {
        return undefined;
    }

    return nested as Record<string, unknown>;
}

function getSectionName(adapter: SyncAdapter): string {
    const [topLevel, subLevel] = adapter.configPath;
    if (topLevel === 'agentsMd') {
        return 'agentsMd';
    }
    return `${topLevel}.${subLevel}`;
}
