import { describe, it, expect } from 'vitest';
import { warpSkillsAdapter } from '../adapters/warp-skills.js';
import { adapterRegistry } from '../adapters/index.js';

describe('warp-skills adapter', () => {
  it('should have correct basic properties', () => {
    expect(warpSkillsAdapter.name).toBe('warp-skills');
    expect(warpSkillsAdapter.tool).toBe('warp');
    expect(warpSkillsAdapter.subtype).toBe('skills');
    expect(warpSkillsAdapter.defaultSourceDir).toBe('.agents/skills');
    expect(warpSkillsAdapter.targetDir).toBe('.agents/skills');
    expect(warpSkillsAdapter.mode).toBe('directory');
  });

  it('should have correct config path', () => {
    expect(warpSkillsAdapter.configPath).toEqual(['warp', 'skills']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('warp-skills');
    expect(retrieved).toBe(warpSkillsAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('warp', 'skills');
    expect(retrieved).toBe(warpSkillsAdapter);
  });

  it('should have required adapter methods', () => {
    expect(warpSkillsAdapter.addDependency).toBeDefined();
    expect(warpSkillsAdapter.removeDependency).toBeDefined();
    expect(warpSkillsAdapter.link).toBeDefined();
    expect(warpSkillsAdapter.unlink).toBeDefined();
  });
});
