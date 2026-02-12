import { describe, it, expect } from 'vitest';
import { copilotPromptsAdapter } from '../adapters/copilot-prompts.js';
import { adapterRegistry } from '../adapters/index.js';

describe('copilot-prompts adapter', () => {
  it('should have correct basic properties', () => {
    expect(copilotPromptsAdapter.name).toBe('copilot-prompts');
    expect(copilotPromptsAdapter.tool).toBe('copilot');
    expect(copilotPromptsAdapter.subtype).toBe('prompts');
    expect(copilotPromptsAdapter.defaultSourceDir).toBe('.github/prompts');
    expect(copilotPromptsAdapter.targetDir).toBe('.github/prompts');
    expect(copilotPromptsAdapter.mode).toBe('file');
  });

  it('should have correct config path', () => {
    expect(copilotPromptsAdapter.configPath).toEqual(['copilot', 'prompts']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('copilot-prompts');
    expect(retrieved).toBe(copilotPromptsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('copilot', 'prompts');
    expect(retrieved).toBe(copilotPromptsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(copilotPromptsAdapter.addDependency).toBeDefined();
    expect(copilotPromptsAdapter.removeDependency).toBeDefined();
    expect(copilotPromptsAdapter.link).toBeDefined();
    expect(copilotPromptsAdapter.unlink).toBeDefined();
  });
});
