import { SyncAdapter, AdapterRegistry } from './types.js';
import { cursorRulesAdapter } from './cursor-rules.js';
import { cursorCommandsAdapter } from './cursor-commands.js';
import { copilotInstructionsAdapter } from './copilot-instructions.js';
import { copilotSkillsAdapter } from './copilot-skills.js';
import { claudeSkillsAdapter } from './claude-skills.js';
import { claudeAgentsAdapter } from './claude-agents.js';
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
        this.register(claudeSkillsAdapter);
        this.register(claudeAgentsAdapter);
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
    if (cfg.cursor?.rules?.[alias]) {
        return { adapter: cursorRulesAdapter, section: 'cursor.rules' };
    }
    if (cfg.cursor?.commands?.[alias]) {
        return { adapter: cursorCommandsAdapter, section: 'cursor.commands' };
    }
    if (cfg.cursor?.skills?.[alias]) {
        return { adapter: cursorSkillsAdapter, section: 'cursor.skills' };
    }
    if (cfg.cursor?.agents?.[alias]) {
        return { adapter: cursorAgentsAdapter, section: 'cursor.agents' };
    }
    if (cfg.copilot?.instructions?.[alias]) {
        return { adapter: copilotInstructionsAdapter, section: 'copilot.instructions' };
    }
    if (cfg.copilot?.skills?.[alias]) {
        return { adapter: copilotSkillsAdapter, section: 'copilot.skills' };
    }
    if (cfg.claude?.skills?.[alias]) {
        return { adapter: claudeSkillsAdapter, section: 'claude.skills' };
    }
    if (cfg.claude?.agents?.[alias]) {
        return { adapter: claudeAgentsAdapter, section: 'claude.agents' };
    }
    if (cfg.trae?.rules?.[alias]) {
        return { adapter: traeRulesAdapter, section: 'trae.rules' };
    }
    if (cfg.trae?.skills?.[alias]) {
        return { adapter: traeSkillsAdapter, section: 'trae.skills' };
    }
    if (cfg.opencode?.agents?.[alias]) {
        return { adapter: opencodeAgentsAdapter, section: 'opencode.agents' };
    }
    if (cfg.opencode?.skills?.[alias]) {
        return { adapter: opencodeSkillsAdapter, section: 'opencode.skills' };
    }
    if (cfg.opencode?.commands?.[alias]) {
        return { adapter: opencodeCommandsAdapter, section: 'opencode.commands' };
    }
    if (cfg.opencode?.tools?.[alias]) {
        return { adapter: opencodeToolsAdapter, section: 'opencode.tools' };
    }
    if (cfg.agentsMd?.[alias]) {
        return { adapter: agentsMdAdapter, section: 'agentsMd' };
    }
    if (cfg.codex?.rules?.[alias]) {
        return { adapter: codexRulesAdapter, section: 'codex.rules' };
    }
    if (cfg.codex?.skills?.[alias]) {
        return { adapter: codexSkillsAdapter, section: 'codex.skills' };
    }
    if (cfg.gemini?.commands?.[alias]) {
        return { adapter: geminiCommandsAdapter, section: 'gemini.commands' };
    }
    if (cfg.gemini?.skills?.[alias]) {
        return { adapter: geminiSkillsAdapter, section: 'gemini.skills' };
    }
    if (cfg.gemini?.agents?.[alias]) {
        return { adapter: geminiAgentsAdapter, section: 'gemini.agents' };
    }
    return null;
}
