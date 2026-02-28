import { describe } from 'vitest';
import { copilotAgentsAdapter } from '../adapters/copilot-agents.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('copilot-agents adapter', () => {
  runStandardAdapterContract({
    adapter: copilotAgentsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'copilot-agents',
      tool: 'copilot',
      subtype: 'agents',
      defaultSourceDir: '.github/agents',
      targetDir: '.github/agents',
      mode: 'file',
      configPath: ['copilot', 'agents']
    }
  });
});
