import { describe } from 'vitest';
import { windsurfSkillsAdapter } from '../adapters/windsurf-skills.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('windsurf-skills adapter', () => {
  runStandardAdapterContract({
    adapter: windsurfSkillsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'windsurf-skills',
      tool: 'windsurf',
      subtype: 'skills',
      defaultSourceDir: '.windsurf/skills',
      targetDir: '.windsurf/skills',
      mode: 'directory',
      configPath: ['windsurf', 'skills']
    }
  });
});
