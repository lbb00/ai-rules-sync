import { describe, it, expect } from 'vitest';
import { copilotSkillsAdapter } from '../adapters/copilot-skills.js';
import { adapterRegistry } from '../adapters/index.js';

describe('copilot-skills adapter', () => {
  it('should have correct basic properties', () => {
    expect(copilotSkillsAdapter.name).toBe('copilot-skills');
    expect(copilotSkillsAdapter.tool).toBe('copilot');
    expect(copilotSkillsAdapter.subtype).toBe('skills');
    expect(copilotSkillsAdapter.defaultSourceDir).toBe('.github/skills');
    expect(copilotSkillsAdapter.targetDir).toBe('.github/skills');
    expect(copilotSkillsAdapter.mode).toBe('directory');
  });

  it('should have correct config path', () => {
    expect(copilotSkillsAdapter.configPath).toEqual(['copilot', 'skills']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('copilot-skills');
    expect(retrieved).toBe(copilotSkillsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('copilot', 'skills');
    expect(retrieved).toBe(copilotSkillsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(copilotSkillsAdapter.addDependency).toBeDefined();
    expect(copilotSkillsAdapter.removeDependency).toBeDefined();
    expect(copilotSkillsAdapter.link).toBeDefined();
    expect(copilotSkillsAdapter.unlink).toBeDefined();
  });
});
