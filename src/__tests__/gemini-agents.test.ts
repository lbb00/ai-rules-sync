import { describe, it, expect } from 'vitest';
import { geminiAgentsAdapter } from '../adapters/gemini-agents.js';
import { adapterRegistry } from '../adapters/index.js';

describe('gemini-agents adapter', () => {
  it('should have correct basic properties', () => {
    expect(geminiAgentsAdapter.name).toBe('gemini-agents');
    expect(geminiAgentsAdapter.tool).toBe('gemini');
    expect(geminiAgentsAdapter.subtype).toBe('agents');
    expect(geminiAgentsAdapter.defaultSourceDir).toBe('.gemini/agents');
    expect(geminiAgentsAdapter.targetDir).toBe('.gemini/agents');
    expect(geminiAgentsAdapter.mode).toBe('file');
    expect(geminiAgentsAdapter.fileSuffixes).toEqual(['.md']);
  });

  it('should have correct config path', () => {
    expect(geminiAgentsAdapter.configPath).toEqual(['gemini', 'agents']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('gemini-agents');
    expect(retrieved).toBe(geminiAgentsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('gemini', 'agents');
    expect(retrieved).toBe(geminiAgentsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(geminiAgentsAdapter.addDependency).toBeDefined();
    expect(geminiAgentsAdapter.removeDependency).toBeDefined();
    expect(geminiAgentsAdapter.link).toBeDefined();
    expect(geminiAgentsAdapter.unlink).toBeDefined();
  });
});
