import { describe } from 'vitest';
import { clineSkillsAdapter } from '../adapters/cline-skills.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('cline-skills adapter', () => {
  runStandardAdapterContract({
    adapter: clineSkillsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'cline-skills',
      tool: 'cline',
      subtype: 'skills',
      defaultSourceDir: '.cline/skills',
      targetDir: '.cline/skills',
      mode: 'directory',
      configPath: ['cline', 'skills']
    }
  });
});
