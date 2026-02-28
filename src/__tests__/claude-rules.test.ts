import { describe } from 'vitest';
import { claudeRulesAdapter } from '../adapters/claude-rules.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('claude-rules adapter', () => {
  runStandardAdapterContract({
    adapter: claudeRulesAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'claude-rules',
      tool: 'claude',
      subtype: 'rules',
      defaultSourceDir: '.claude/rules',
      targetDir: '.claude/rules',
      mode: 'file',
      configPath: ['claude', 'rules'],
      fileSuffixes: ['.md']
    }
  });
});
