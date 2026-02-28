import { describe, it, expect } from 'vitest';
import { windsurfRulesAdapter } from '../adapters/windsurf-rules.js';
import { adapterRegistry } from '../adapters/index.js';

describe('windsurf-rules adapter', () => {
  it('should have correct basic properties', () => {
    expect(windsurfRulesAdapter.name).toBe('windsurf-rules');
    expect(windsurfRulesAdapter.tool).toBe('windsurf');
    expect(windsurfRulesAdapter.subtype).toBe('rules');
    expect(windsurfRulesAdapter.defaultSourceDir).toBe('.windsurf/rules');
    expect(windsurfRulesAdapter.targetDir).toBe('.windsurf/rules');
    expect(windsurfRulesAdapter.mode).toBe('file');
    expect(windsurfRulesAdapter.fileSuffixes).toEqual(['.md']);
  });

  it('should have correct config path', () => {
    expect(windsurfRulesAdapter.configPath).toEqual(['windsurf', 'rules']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('windsurf-rules');
    expect(retrieved).toBe(windsurfRulesAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('windsurf', 'rules');
    expect(retrieved).toBe(windsurfRulesAdapter);
  });

  it('should have required adapter methods', () => {
    expect(windsurfRulesAdapter.addDependency).toBeDefined();
    expect(windsurfRulesAdapter.removeDependency).toBeDefined();
    expect(windsurfRulesAdapter.link).toBeDefined();
    expect(windsurfRulesAdapter.unlink).toBeDefined();
  });
});
