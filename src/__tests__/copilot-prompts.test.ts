import { describe } from 'vitest';
import { copilotPromptsAdapter } from '../adapters/copilot-prompts.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('copilot-prompts adapter', () => {
  runStandardAdapterContract({
    adapter: copilotPromptsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'copilot-prompts',
      tool: 'copilot',
      subtype: 'prompts',
      defaultSourceDir: '.github/prompts',
      targetDir: '.github/prompts',
      mode: 'file',
      configPath: ['copilot', 'prompts']
    }
  });
});
