import { describe } from 'vitest';
import { geminiSkillsAdapter } from '../adapters/gemini-skills.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('gemini-skills adapter', () => {
  runStandardAdapterContract({
    adapter: geminiSkillsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'gemini-skills',
      tool: 'gemini',
      subtype: 'skills',
      defaultSourceDir: '.gemini/skills',
      targetDir: '.gemini/skills',
      mode: 'directory',
      configPath: ['gemini', 'skills']
    }
  });
});
