import { describe } from 'vitest';
import { warpSkillsAdapter } from '../adapters/warp-skills.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('warp-skills adapter', () => {
  runStandardAdapterContract({
    adapter: warpSkillsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'warp-skills',
      tool: 'warp',
      subtype: 'skills',
      defaultSourceDir: '.agents/skills',
      targetDir: '.agents/skills',
      mode: 'directory',
      configPath: ['warp', 'skills']
    }
  });
});
