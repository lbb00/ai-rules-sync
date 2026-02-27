import { describe, it, expect } from 'vitest';
import { windsurfSkillsAdapter } from '../adapters/windsurf-skills.js';
import { adapterRegistry } from '../adapters/index.js';

describe('windsurf-skills adapter', () => {
  it('should have correct basic properties', () => {
    expect(windsurfSkillsAdapter.name).toBe('windsurf-skills');
    expect(windsurfSkillsAdapter.tool).toBe('windsurf');
    expect(windsurfSkillsAdapter.subtype).toBe('skills');
    expect(windsurfSkillsAdapter.defaultSourceDir).toBe('.windsurf/skills');
    expect(windsurfSkillsAdapter.targetDir).toBe('.windsurf/skills');
    expect(windsurfSkillsAdapter.mode).toBe('directory');
  });

  it('should have correct config path', () => {
    expect(windsurfSkillsAdapter.configPath).toEqual(['windsurf', 'skills']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('windsurf-skills');
    expect(retrieved).toBe(windsurfSkillsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('windsurf', 'skills');
    expect(retrieved).toBe(windsurfSkillsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(windsurfSkillsAdapter.addDependency).toBeDefined();
    expect(windsurfSkillsAdapter.removeDependency).toBeDefined();
    expect(windsurfSkillsAdapter.link).toBeDefined();
    expect(windsurfSkillsAdapter.unlink).toBeDefined();
  });
});
