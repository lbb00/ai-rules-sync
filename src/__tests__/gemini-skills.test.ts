import { describe, it, expect } from 'vitest';
import { geminiSkillsAdapter } from '../adapters/gemini-skills.js';
import { adapterRegistry } from '../adapters/index.js';

describe('gemini-skills adapter', () => {
  it('should have correct basic properties', () => {
    expect(geminiSkillsAdapter.name).toBe('gemini-skills');
    expect(geminiSkillsAdapter.tool).toBe('gemini');
    expect(geminiSkillsAdapter.subtype).toBe('skills');
    expect(geminiSkillsAdapter.defaultSourceDir).toBe('.gemini/skills');
    expect(geminiSkillsAdapter.targetDir).toBe('.gemini/skills');
    expect(geminiSkillsAdapter.mode).toBe('directory');
  });

  it('should have correct config path', () => {
    expect(geminiSkillsAdapter.configPath).toEqual(['gemini', 'skills']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('gemini-skills');
    expect(retrieved).toBe(geminiSkillsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('gemini', 'skills');
    expect(retrieved).toBe(geminiSkillsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(geminiSkillsAdapter.addDependency).toBeDefined();
    expect(geminiSkillsAdapter.removeDependency).toBeDefined();
    expect(geminiSkillsAdapter.link).toBeDefined();
    expect(geminiSkillsAdapter.unlink).toBeDefined();
  });
});
