import { describe, it, expect } from 'vitest';
import { geminiMdAdapter } from '../adapters/gemini-md.js';
import { adapterRegistry } from '../adapters/index.js';

describe('gemini-md adapter', () => {
  it('should have correct basic properties', () => {
    expect(geminiMdAdapter.name).toBe('gemini-md');
    expect(geminiMdAdapter.tool).toBe('gemini');
    expect(geminiMdAdapter.subtype).toBe('md');
    expect(geminiMdAdapter.defaultSourceDir).toBe('.gemini');
    expect(geminiMdAdapter.targetDir).toBe('.gemini');
    expect(geminiMdAdapter.mode).toBe('file');
    expect(geminiMdAdapter.fileSuffixes).toEqual(['.md']);
  });

  it('should have correct config path', () => {
    expect(geminiMdAdapter.configPath).toEqual(['gemini', 'md']);
  });

  it('should not have userTargetDir (user path is same as project path base)', () => {
    // gemini-md uses ~/.gemini/GEMINI.md in user mode — the home dir is the project path
    expect(geminiMdAdapter.userTargetDir).toBeUndefined();
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('gemini-md');
    expect(retrieved).toBe(geminiMdAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('gemini', 'md');
    expect(retrieved).toBe(geminiMdAdapter);
  });

  it('should have required adapter methods', () => {
    expect(geminiMdAdapter.addDependency).toBeDefined();
    expect(geminiMdAdapter.removeDependency).toBeDefined();
    expect(geminiMdAdapter.link).toBeDefined();
    expect(geminiMdAdapter.unlink).toBeDefined();
  });

  it('should have resolveSource and resolveTargetName hooks', () => {
    expect(geminiMdAdapter.resolveSource).toBeDefined();
    expect(geminiMdAdapter.resolveTargetName).toBeDefined();
  });

  it('should include gemini-md in gemini tool adapters', () => {
    const geminiAdapters = adapterRegistry.getForTool('gemini');
    expect(geminiAdapters.map(a => a.name)).toContain('gemini-md');
  });
});
