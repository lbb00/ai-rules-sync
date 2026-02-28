import { describe, it, expect } from 'vitest';
import { opencodeCommandsAdapter } from '../src/adapters/opencode-commands.js';
import { opencodeAgentsAdapter } from '../src/adapters/opencode-agents.js';
import { opencodeSkillsAdapter } from '../src/adapters/opencode-skills.js';
import { opencodeToolsAdapter } from '../src/adapters/opencode-tools.js';
import { adapterRegistry } from '../src/adapters/index.js';

describe('OpenCode Adapters', () => {
  describe('opencodeCommandsAdapter', () => {
    it('should have correct properties', () => {
      expect(opencodeCommandsAdapter.name).toBe('opencode-commands');
      expect(opencodeCommandsAdapter.tool).toBe('opencode');
      expect(opencodeCommandsAdapter.subtype).toBe('commands');
      expect(opencodeCommandsAdapter.defaultSourceDir).toBe('.opencode/commands');
      expect(opencodeCommandsAdapter.targetDir).toBe('.opencode/commands');
      expect(opencodeCommandsAdapter.mode).toBe('file');
    });

    it('should have correct userTargetDir for XDG path', () => {
      expect(opencodeCommandsAdapter.userTargetDir).toBe('.config/opencode/commands');
    });

    it('should have correct config path', () => {
      expect(opencodeCommandsAdapter.configPath).toEqual(['opencode', 'commands']);
    });
  });

  describe('opencodeAgentsAdapter', () => {
    it('should have correct properties', () => {
      expect(opencodeAgentsAdapter.name).toBe('opencode-agents');
      expect(opencodeAgentsAdapter.tool).toBe('opencode');
      expect(opencodeAgentsAdapter.subtype).toBe('agents');
      expect(opencodeAgentsAdapter.defaultSourceDir).toBe('.opencode/agents');
      expect(opencodeAgentsAdapter.targetDir).toBe('.opencode/agents');
      expect(opencodeAgentsAdapter.mode).toBe('file');
    });

    it('should have correct userTargetDir for XDG path', () => {
      expect(opencodeAgentsAdapter.userTargetDir).toBe('.config/opencode/agents');
    });

    it('should have correct config path', () => {
      expect(opencodeAgentsAdapter.configPath).toEqual(['opencode', 'agents']);
    });
  });

  describe('opencodeSkillsAdapter', () => {
    it('should have correct properties', () => {
      expect(opencodeSkillsAdapter.name).toBe('opencode-skills');
      expect(opencodeSkillsAdapter.tool).toBe('opencode');
      expect(opencodeSkillsAdapter.subtype).toBe('skills');
      expect(opencodeSkillsAdapter.defaultSourceDir).toBe('.opencode/skills');
      expect(opencodeSkillsAdapter.targetDir).toBe('.opencode/skills');
      expect(opencodeSkillsAdapter.mode).toBe('directory');
    });

    it('should have correct userTargetDir for XDG path', () => {
      expect(opencodeSkillsAdapter.userTargetDir).toBe('.config/opencode/skills');
    });

    it('should have correct config path', () => {
      expect(opencodeSkillsAdapter.configPath).toEqual(['opencode', 'skills']);
    });
  });

  describe('opencodeToolsAdapter', () => {
    it('should have correct properties', () => {
      expect(opencodeToolsAdapter.name).toBe('opencode-tools');
      expect(opencodeToolsAdapter.tool).toBe('opencode');
      expect(opencodeToolsAdapter.subtype).toBe('tools');
      expect(opencodeToolsAdapter.defaultSourceDir).toBe('.opencode/tools');
      expect(opencodeToolsAdapter.targetDir).toBe('.opencode/tools');
      expect(opencodeToolsAdapter.mode).toBe('file');
    });

    it('should have correct userTargetDir for XDG path', () => {
      expect(opencodeToolsAdapter.userTargetDir).toBe('.config/opencode/tools');
    });

    it('should have correct config path', () => {
      expect(opencodeToolsAdapter.configPath).toEqual(['opencode', 'tools']);
    });
  });

  describe('Adapter Registry Integration', () => {
    it('should register all opencode adapters', () => {
      expect(adapterRegistry.get('opencode', 'commands')).toBeDefined();
      expect(adapterRegistry.get('opencode', 'agents')).toBeDefined();
      expect(adapterRegistry.get('opencode', 'skills')).toBeDefined();
      expect(adapterRegistry.get('opencode', 'tools')).toBeDefined();
    });

    it('all opencode adapters should have userTargetDir pointing to XDG config path', () => {
      const adapters = adapterRegistry.getForTool('opencode');
      for (const adapter of adapters) {
        expect(adapter.userTargetDir).toMatch(/^\.config\/opencode\//);
      }
    });
  });
});
