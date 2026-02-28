import { describe } from 'vitest';
import { clineRulesAdapter } from '../adapters/cline-rules.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('cline-rules adapter', () => {
  runStandardAdapterContract({
    adapter: clineRulesAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'cline-rules',
      tool: 'cline',
      subtype: 'rules',
      defaultSourceDir: '.clinerules',
      targetDir: '.clinerules',
      mode: 'file',
      configPath: ['cline', 'rules'],
      fileSuffixes: ['.md', '.txt']
    }
  });
});
