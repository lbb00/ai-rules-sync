import { describe } from 'vitest';
import { geminiAgentsAdapter } from '../adapters/gemini-agents.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('gemini-agents adapter', () => {
  runStandardAdapterContract({
    adapter: geminiAgentsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'gemini-agents',
      tool: 'gemini',
      subtype: 'agents',
      defaultSourceDir: '.gemini/agents',
      targetDir: '.gemini/agents',
      mode: 'file',
      configPath: ['gemini', 'agents'],
      fileSuffixes: ['.md']
    }
  });
});
