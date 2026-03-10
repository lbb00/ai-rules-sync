import { describe } from 'vitest';
import { claudeCommandsAdapter } from '../adapters/claude-commands.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('claude-commands adapter', () => {
  runStandardAdapterContract({
    adapter: claudeCommandsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'claude-commands',
      tool: 'claude',
      subtype: 'commands',
      defaultSourceDir: '.claude/commands',
      targetDir: '.claude/commands',
      mode: 'file',
      configPath: ['claude', 'commands'],
      fileSuffixes: ['.md']
    }
  });
});
