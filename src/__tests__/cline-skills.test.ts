import { describe, it, expect } from 'vitest';
import { clineSkillsAdapter } from '../adapters/cline-skills.js';
import { adapterRegistry } from '../adapters/index.js';

describe('cline-skills adapter', () => {
  it('should have correct basic properties', () => {
    expect(clineSkillsAdapter.name).toBe('cline-skills');
    expect(clineSkillsAdapter.tool).toBe('cline');
    expect(clineSkillsAdapter.subtype).toBe('skills');
    expect(clineSkillsAdapter.defaultSourceDir).toBe('.cline/skills');
    expect(clineSkillsAdapter.targetDir).toBe('.cline/skills');
    expect(clineSkillsAdapter.mode).toBe('directory');
  });

  it('should have correct config path', () => {
    expect(clineSkillsAdapter.configPath).toEqual(['cline', 'skills']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('cline-skills');
    expect(retrieved).toBe(clineSkillsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('cline', 'skills');
    expect(retrieved).toBe(clineSkillsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(clineSkillsAdapter.addDependency).toBeDefined();
    expect(clineSkillsAdapter.removeDependency).toBeDefined();
    expect(clineSkillsAdapter.link).toBeDefined();
    expect(clineSkillsAdapter.unlink).toBeDefined();
  });
});
