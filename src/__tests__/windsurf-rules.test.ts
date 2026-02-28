import { describe } from 'vitest';
import { windsurfRulesAdapter } from '../adapters/windsurf-rules.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('windsurf-rules adapter', () => {
  runStandardAdapterContract({
    adapter: windsurfRulesAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'windsurf-rules',
      tool: 'windsurf',
      subtype: 'rules',
      defaultSourceDir: '.windsurf/rules',
      targetDir: '.windsurf/rules',
      mode: 'file',
      configPath: ['windsurf', 'rules'],
      fileSuffixes: ['.md']
    }
  });
});
