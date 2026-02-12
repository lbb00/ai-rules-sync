import { describe, it, expect } from 'vitest';
import { copilotAgentsAdapter } from '../adapters/copilot-agents.js';
import { adapterRegistry } from '../adapters/index.js';

describe('copilot-agents adapter', () => {
  it('should have correct basic properties', () => {
    expect(copilotAgentsAdapter.name).toBe('copilot-agents');
    expect(copilotAgentsAdapter.tool).toBe('copilot');
    expect(copilotAgentsAdapter.subtype).toBe('agents');
    expect(copilotAgentsAdapter.defaultSourceDir).toBe('.github/agents');
    expect(copilotAgentsAdapter.targetDir).toBe('.github/agents');
    expect(copilotAgentsAdapter.mode).toBe('file');
  });

  it('should have correct config path', () => {
    expect(copilotAgentsAdapter.configPath).toEqual(['copilot', 'agents']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('copilot-agents');
    expect(retrieved).toBe(copilotAgentsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('copilot', 'agents');
    expect(retrieved).toBe(copilotAgentsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(copilotAgentsAdapter.addDependency).toBeDefined();
    expect(copilotAgentsAdapter.removeDependency).toBeDefined();
    expect(copilotAgentsAdapter.link).toBeDefined();
    expect(copilotAgentsAdapter.unlink).toBeDefined();
  });
});
