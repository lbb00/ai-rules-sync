import { describe } from 'vitest';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

import { cursorRulesAdapter } from '../adapters/cursor-rules.js';
import { cursorCommandsAdapter } from '../adapters/cursor-commands.js';
import { cursorSkillsAdapter } from '../adapters/cursor-skills.js';
import { cursorAgentsAdapter } from '../adapters/cursor-agents.js';
import { claudeSkillsAdapter } from '../adapters/claude-skills.js';
import { claudeAgentsAdapter } from '../adapters/claude-agents.js';
import { claudeAgentMemoryAdapter } from '../adapters/claude-agent-memory.js';
import { copilotInstructionsAdapter } from '../adapters/copilot-instructions.js';
import { codexRulesAdapter } from '../adapters/codex-rules.js';
import { codexSkillsAdapter } from '../adapters/codex-skills.js';
import { opencodeAgentsAdapter } from '../adapters/opencode-agents.js';
import { opencodeCommandsAdapter } from '../adapters/opencode-commands.js';
import { opencodeSkillsAdapter } from '../adapters/opencode-skills.js';
import { opencodeToolsAdapter } from '../adapters/opencode-tools.js';
import { traeRulesAdapter } from '../adapters/trae-rules.js';
import { traeSkillsAdapter } from '../adapters/trae-skills.js';

const adapterConfigs = [
  {
    adapter: cursorRulesAdapter,
    expected: {
      name: 'cursor-rules',
      tool: 'cursor',
      subtype: 'rules',
      defaultSourceDir: '.cursor/rules',
      targetDir: '.cursor/rules',
      mode: 'hybrid' as const,
      configPath: ['cursor', 'rules'],
      hybridFileSuffixes: ['.mdc', '.md'],
    },
  },
  {
    adapter: cursorCommandsAdapter,
    expected: {
      name: 'cursor-commands',
      tool: 'cursor',
      subtype: 'commands',
      defaultSourceDir: '.cursor/commands',
      targetDir: '.cursor/commands',
      mode: 'file' as const,
      configPath: ['cursor', 'commands'],
      fileSuffixes: ['.md'],
    },
  },
  {
    adapter: cursorSkillsAdapter,
    expected: {
      name: 'cursor-skills',
      tool: 'cursor',
      subtype: 'skills',
      defaultSourceDir: '.cursor/skills',
      targetDir: '.cursor/skills',
      mode: 'directory' as const,
      configPath: ['cursor', 'skills'],
    },
  },
  {
    adapter: cursorAgentsAdapter,
    expected: {
      name: 'cursor-agents',
      tool: 'cursor',
      subtype: 'agents',
      defaultSourceDir: '.cursor/agents',
      targetDir: '.cursor/agents',
      mode: 'directory' as const,
      configPath: ['cursor', 'agents'],
    },
  },
  {
    adapter: claudeSkillsAdapter,
    expected: {
      name: 'claude-skills',
      tool: 'claude',
      subtype: 'skills',
      defaultSourceDir: '.claude/skills',
      targetDir: '.claude/skills',
      mode: 'directory' as const,
      configPath: ['claude', 'skills'],
    },
  },
  {
    adapter: claudeAgentsAdapter,
    expected: {
      name: 'claude-agents',
      tool: 'claude',
      subtype: 'agents',
      defaultSourceDir: '.claude/agents',
      targetDir: '.claude/agents',
      mode: 'hybrid' as const,
      configPath: ['claude', 'agents'],
      hybridFileSuffixes: ['.md'],
    },
  },
  {
    adapter: claudeAgentMemoryAdapter,
    expected: {
      name: 'claude-agent-memory',
      tool: 'claude',
      subtype: 'agent-memory',
      defaultSourceDir: '.claude/agent-memory',
      targetDir: '.claude/agent-memory',
      mode: 'directory' as const,
      configPath: ['claude', 'agent-memory'],
    },
  },
  {
    adapter: copilotInstructionsAdapter,
    expected: {
      name: 'copilot-instructions',
      tool: 'copilot',
      subtype: 'instructions',
      defaultSourceDir: '.github/instructions',
      targetDir: '.github/instructions',
      mode: 'file' as const,
      configPath: ['copilot', 'instructions'],
      fileSuffixes: ['.instructions.md', '.md'],
    },
  },
  {
    adapter: codexRulesAdapter,
    expected: {
      name: 'codex-rules',
      tool: 'codex',
      subtype: 'rules',
      defaultSourceDir: '.codex/rules',
      targetDir: '.codex/rules',
      mode: 'file' as const,
      configPath: ['codex', 'rules'],
      fileSuffixes: ['.rules'],
    },
  },
  {
    adapter: codexSkillsAdapter,
    expected: {
      name: 'codex-skills',
      tool: 'codex',
      subtype: 'skills',
      defaultSourceDir: '.agents/skills',
      targetDir: '.agents/skills',
      mode: 'directory' as const,
      configPath: ['codex', 'skills'],
    },
  },
  {
    adapter: opencodeAgentsAdapter,
    expected: {
      name: 'opencode-agents',
      tool: 'opencode',
      subtype: 'agents',
      defaultSourceDir: '.opencode/agents',
      targetDir: '.opencode/agents',
      mode: 'file' as const,
      configPath: ['opencode', 'agents'],
      fileSuffixes: ['.md'],
    },
  },
  {
    adapter: opencodeCommandsAdapter,
    expected: {
      name: 'opencode-commands',
      tool: 'opencode',
      subtype: 'commands',
      defaultSourceDir: '.opencode/commands',
      targetDir: '.opencode/commands',
      mode: 'file' as const,
      configPath: ['opencode', 'commands'],
      fileSuffixes: ['.md'],
    },
  },
  {
    adapter: opencodeSkillsAdapter,
    expected: {
      name: 'opencode-skills',
      tool: 'opencode',
      subtype: 'skills',
      defaultSourceDir: '.opencode/skills',
      targetDir: '.opencode/skills',
      mode: 'directory' as const,
      configPath: ['opencode', 'skills'],
    },
  },
  {
    adapter: opencodeToolsAdapter,
    expected: {
      name: 'opencode-tools',
      tool: 'opencode',
      subtype: 'tools',
      defaultSourceDir: '.opencode/tools',
      targetDir: '.opencode/tools',
      mode: 'file' as const,
      configPath: ['opencode', 'tools'],
      fileSuffixes: ['.ts', '.js'],
    },
  },
  {
    adapter: traeRulesAdapter,
    expected: {
      name: 'trae-rules',
      tool: 'trae',
      subtype: 'rules',
      defaultSourceDir: '.trae/rules',
      targetDir: '.trae/rules',
      mode: 'file' as const,
      configPath: ['trae', 'rules'],
      fileSuffixes: ['.md'],
    },
  },
  {
    adapter: traeSkillsAdapter,
    expected: {
      name: 'trae-skills',
      tool: 'trae',
      subtype: 'skills',
      defaultSourceDir: '.trae/skills',
      targetDir: '.trae/skills',
      mode: 'directory' as const,
      configPath: ['trae', 'skills'],
    },
  },
];

describe('untested adapter contracts', () => {
  for (const config of adapterConfigs) {
    describe(`${config.expected.name} adapter`, () => {
      runStandardAdapterContract({
        adapter: config.adapter,
        registry: adapterRegistry,
        expected: config.expected,
      });
    });
  }
});
