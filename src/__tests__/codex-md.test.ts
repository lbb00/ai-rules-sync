import { describe, it, expect } from 'vitest';
import { codexMdAdapter } from '../adapters/codex-md.js';
import { adapterRegistry } from '../adapters/index.js';

describe('codex-md adapter', () => {
  it('should have correct basic properties', () => {
    expect(codexMdAdapter.name).toBe('codex-md');
    expect(codexMdAdapter.tool).toBe('codex');
    expect(codexMdAdapter.subtype).toBe('md');
    expect(codexMdAdapter.defaultSourceDir).toBe('.codex');
    expect(codexMdAdapter.targetDir).toBe('.codex');
    expect(codexMdAdapter.mode).toBe('file');
    expect(codexMdAdapter.fileSuffixes).toEqual(['.md']);
  });

  it('should have correct config path', () => {
    expect(codexMdAdapter.configPath).toEqual(['codex', 'md']);
  });

  it('should not have userTargetDir (user path is same as project path base)', () => {
    // codex-md uses ~/.codex/AGENTS.md in user mode — the home dir is the project path
    expect(codexMdAdapter.userTargetDir).toBeUndefined();
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('codex-md');
    expect(retrieved).toBe(codexMdAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('codex', 'md');
    expect(retrieved).toBe(codexMdAdapter);
  });

  it('should have required adapter methods', () => {
    expect(codexMdAdapter.addDependency).toBeDefined();
    expect(codexMdAdapter.removeDependency).toBeDefined();
    expect(codexMdAdapter.link).toBeDefined();
    expect(codexMdAdapter.unlink).toBeDefined();
  });

  it('should have resolveSource and resolveTargetName hooks', () => {
    expect(codexMdAdapter.resolveSource).toBeDefined();
    expect(codexMdAdapter.resolveTargetName).toBeDefined();
  });

  it('should include codex-md in codex tool adapters', () => {
    const codexAdapters = adapterRegistry.getForTool('codex');
    expect(codexAdapters.map(a => a.name)).toContain('codex-md');
  });
});
