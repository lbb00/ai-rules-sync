import { describe } from 'vitest';
import { copilotSkillsAdapter } from '../adapters/copilot-skills.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('copilot-skills adapter', () => {
  runStandardAdapterContract({
    adapter: copilotSkillsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'copilot-skills',
      tool: 'copilot',
      subtype: 'skills',
      defaultSourceDir: '.github/skills',
      targetDir: '.github/skills',
      mode: 'directory',
      configPath: ['copilot', 'skills']
    }
  });
});
