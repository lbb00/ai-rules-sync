import { describe } from 'vitest';
import { geminiCommandsAdapter } from '../adapters/gemini-commands.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('gemini-commands adapter', () => {
  runStandardAdapterContract({
    adapter: geminiCommandsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'gemini-commands',
      tool: 'gemini',
      subtype: 'commands',
      defaultSourceDir: '.gemini/commands',
      targetDir: '.gemini/commands',
      mode: 'file',
      configPath: ['gemini', 'commands'],
      fileSuffixes: ['.toml']
    }
  });
});
