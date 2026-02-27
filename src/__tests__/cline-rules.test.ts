import { describe, it, expect } from 'vitest';
import { clineRulesAdapter } from '../adapters/cline-rules.js';
import { adapterRegistry } from '../adapters/index.js';

describe('cline-rules adapter', () => {
  it('should have correct basic properties', () => {
    expect(clineRulesAdapter.name).toBe('cline-rules');
    expect(clineRulesAdapter.tool).toBe('cline');
    expect(clineRulesAdapter.subtype).toBe('rules');
    expect(clineRulesAdapter.defaultSourceDir).toBe('.clinerules');
    expect(clineRulesAdapter.targetDir).toBe('.clinerules');
    expect(clineRulesAdapter.mode).toBe('file');
    expect(clineRulesAdapter.fileSuffixes).toEqual(['.md', '.txt']);
  });

  it('should have correct config path', () => {
    expect(clineRulesAdapter.configPath).toEqual(['cline', 'rules']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('cline-rules');
    expect(retrieved).toBe(clineRulesAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('cline', 'rules');
    expect(retrieved).toBe(clineRulesAdapter);
  });

  it('should have required adapter methods', () => {
    expect(clineRulesAdapter.addDependency).toBeDefined();
    expect(clineRulesAdapter.removeDependency).toBeDefined();
    expect(clineRulesAdapter.link).toBeDefined();
    expect(clineRulesAdapter.unlink).toBeDefined();
  });
});
