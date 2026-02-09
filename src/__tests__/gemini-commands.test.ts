import { describe, it, expect } from 'vitest';
import { geminiCommandsAdapter } from '../adapters/gemini-commands.js';
import { adapterRegistry } from '../adapters/index.js';

describe('gemini-commands adapter', () => {
  it('should have correct basic properties', () => {
    expect(geminiCommandsAdapter.name).toBe('gemini-commands');
    expect(geminiCommandsAdapter.tool).toBe('gemini');
    expect(geminiCommandsAdapter.subtype).toBe('commands');
    expect(geminiCommandsAdapter.defaultSourceDir).toBe('.gemini/commands');
    expect(geminiCommandsAdapter.targetDir).toBe('.gemini/commands');
    expect(geminiCommandsAdapter.mode).toBe('file');
    expect(geminiCommandsAdapter.fileSuffixes).toEqual(['.toml']);
  });

  it('should have correct config path', () => {
    expect(geminiCommandsAdapter.configPath).toEqual(['gemini', 'commands']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('gemini-commands');
    expect(retrieved).toBe(geminiCommandsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('gemini', 'commands');
    expect(retrieved).toBe(geminiCommandsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(geminiCommandsAdapter.addDependency).toBeDefined();
    expect(geminiCommandsAdapter.removeDependency).toBeDefined();
    expect(geminiCommandsAdapter.link).toBeDefined();
    expect(geminiCommandsAdapter.unlink).toBeDefined();
  });
});
