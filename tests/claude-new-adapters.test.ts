import { describe, it, expect } from 'vitest';
import { claudeOutputStylesAdapter } from '../src/adapters/claude-output-styles.js';
import { claudeStatusLinesAdapter } from '../src/adapters/claude-status-lines.js';
import { claudeAgentMemoryAdapter } from '../src/adapters/claude-agent-memory.js';
import { claudeSettingsAdapter } from '../src/adapters/claude-settings.js';
import { adapterRegistry } from '../src/adapters/index.js';

describe('Claude New Adapters (AGT-9)', () => {
  describe('claudeOutputStylesAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudeOutputStylesAdapter.name).toBe('claude-output-styles');
      expect(claudeOutputStylesAdapter.tool).toBe('claude');
      expect(claudeOutputStylesAdapter.subtype).toBe('output-styles');
      expect(claudeOutputStylesAdapter.configPath).toEqual(['claude', 'output-styles']);
      expect(claudeOutputStylesAdapter.defaultSourceDir).toBe('.claude/output-styles');
      expect(claudeOutputStylesAdapter.targetDir).toBe('.claude/output-styles');
      expect(claudeOutputStylesAdapter.mode).toBe('directory');
    });

    it('should be registered in the adapter registry', () => {
      const adapter = adapterRegistry.get('claude', 'output-styles');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('claude-output-styles');
    });

    it('should be discoverable by tool lookup', () => {
      const claudeAdapters = adapterRegistry.getForTool('claude');
      const names = claudeAdapters.map(a => a.name);
      expect(names).toContain('claude-output-styles');
    });

    it('should have forProject method', () => {
      expect(typeof claudeOutputStylesAdapter.forProject).toBe('function');
    });

    it('should have addDependency method', () => {
      expect(typeof claudeOutputStylesAdapter.addDependency).toBe('function');
    });

    it('should have removeDependency method', () => {
      expect(typeof claudeOutputStylesAdapter.removeDependency).toBe('function');
    });

    it('should have link method', () => {
      expect(typeof claudeOutputStylesAdapter.link).toBe('function');
    });

    it('should have unlink method', () => {
      expect(typeof claudeOutputStylesAdapter.unlink).toBe('function');
    });
  });

  describe('claudeStatusLinesAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudeStatusLinesAdapter.name).toBe('claude-status-lines');
      expect(claudeStatusLinesAdapter.tool).toBe('claude');
      expect(claudeStatusLinesAdapter.subtype).toBe('status-lines');
      expect(claudeStatusLinesAdapter.configPath).toEqual(['claude', 'status-lines']);
      expect(claudeStatusLinesAdapter.defaultSourceDir).toBe('.claude/status-lines');
      expect(claudeStatusLinesAdapter.targetDir).toBe('.claude/status-lines');
      expect(claudeStatusLinesAdapter.mode).toBe('directory');
    });

    it('should be registered in the adapter registry', () => {
      const adapter = adapterRegistry.get('claude', 'status-lines');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('claude-status-lines');
    });

    it('should be discoverable by tool lookup', () => {
      const claudeAdapters = adapterRegistry.getForTool('claude');
      const names = claudeAdapters.map(a => a.name);
      expect(names).toContain('claude-status-lines');
    });

    it('should have forProject method', () => {
      expect(typeof claudeStatusLinesAdapter.forProject).toBe('function');
    });

    it('should have addDependency method', () => {
      expect(typeof claudeStatusLinesAdapter.addDependency).toBe('function');
    });

    it('should have removeDependency method', () => {
      expect(typeof claudeStatusLinesAdapter.removeDependency).toBe('function');
    });

    it('should have link method', () => {
      expect(typeof claudeStatusLinesAdapter.link).toBe('function');
    });

    it('should have unlink method', () => {
      expect(typeof claudeStatusLinesAdapter.unlink).toBe('function');
    });
  });

  describe('claudeAgentMemoryAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudeAgentMemoryAdapter.name).toBe('claude-agent-memory');
      expect(claudeAgentMemoryAdapter.tool).toBe('claude');
      expect(claudeAgentMemoryAdapter.subtype).toBe('agent-memory');
      expect(claudeAgentMemoryAdapter.configPath).toEqual(['claude', 'agent-memory']);
      expect(claudeAgentMemoryAdapter.defaultSourceDir).toBe('.claude/agent-memory');
      expect(claudeAgentMemoryAdapter.targetDir).toBe('.claude/agent-memory');
      expect(claudeAgentMemoryAdapter.mode).toBe('directory');
    });

    it('should be registered in the adapter registry', () => {
      const adapter = adapterRegistry.get('claude', 'agent-memory');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('claude-agent-memory');
    });

    it('should be discoverable by tool lookup', () => {
      const claudeAdapters = adapterRegistry.getForTool('claude');
      const names = claudeAdapters.map(a => a.name);
      expect(names).toContain('claude-agent-memory');
    });

    it('should have forProject method', () => {
      expect(typeof claudeAgentMemoryAdapter.forProject).toBe('function');
    });

    it('should have addDependency method', () => {
      expect(typeof claudeAgentMemoryAdapter.addDependency).toBe('function');
    });

    it('should have removeDependency method', () => {
      expect(typeof claudeAgentMemoryAdapter.removeDependency).toBe('function');
    });

    it('should have link method', () => {
      expect(typeof claudeAgentMemoryAdapter.link).toBe('function');
    });

    it('should have unlink method', () => {
      expect(typeof claudeAgentMemoryAdapter.unlink).toBe('function');
    });
  });

  describe('claudeSettingsAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudeSettingsAdapter.name).toBe('claude-settings');
      expect(claudeSettingsAdapter.tool).toBe('claude');
      expect(claudeSettingsAdapter.subtype).toBe('settings');
      expect(claudeSettingsAdapter.configPath).toEqual(['claude', 'settings']);
      expect(claudeSettingsAdapter.defaultSourceDir).toBe('.claude');
      expect(claudeSettingsAdapter.targetDir).toBe('.claude');
      expect(claudeSettingsAdapter.mode).toBe('file');
    });

    it('should have file suffixes for .json files', () => {
      expect(claudeSettingsAdapter.fileSuffixes).toEqual(['.json']);
    });

    it('should have resolveSource for suffix resolution', () => {
      expect(typeof claudeSettingsAdapter.resolveSource).toBe('function');
    });

    it('should have resolveTargetName for suffix-aware naming', () => {
      expect(typeof claudeSettingsAdapter.resolveTargetName).toBe('function');
    });

    it('should have userTargetDir for --user support', () => {
      expect(claudeSettingsAdapter.userTargetDir).toBe('.claude');
    });

    it('should be registered in the adapter registry', () => {
      const adapter = adapterRegistry.get('claude', 'settings');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('claude-settings');
    });

    it('should be discoverable by tool lookup', () => {
      const claudeAdapters = adapterRegistry.getForTool('claude');
      const names = claudeAdapters.map(a => a.name);
      expect(names).toContain('claude-settings');
    });

    it('should have forProject method', () => {
      expect(typeof claudeSettingsAdapter.forProject).toBe('function');
    });

    it('should have addDependency method', () => {
      expect(typeof claudeSettingsAdapter.addDependency).toBe('function');
    });

    it('should have removeDependency method', () => {
      expect(typeof claudeSettingsAdapter.removeDependency).toBe('function');
    });

    it('should have link method', () => {
      expect(typeof claudeSettingsAdapter.link).toBe('function');
    });

    it('should have unlink method', () => {
      expect(typeof claudeSettingsAdapter.unlink).toBe('function');
    });
  });

  describe('adapter registry integration', () => {
    it('should include all new adapters in claude tool list', () => {
      const claudeAdapters = adapterRegistry.getForTool('claude');
      const names = claudeAdapters.map(a => a.name);
      expect(names).toContain('claude-output-styles');
      expect(names).toContain('claude-status-lines');
      expect(names).toContain('claude-agent-memory');
      expect(names).toContain('claude-settings');
    });

    it('should find adapters by name', () => {
      expect(adapterRegistry.getByName('claude-output-styles')).toBeDefined();
      expect(adapterRegistry.getByName('claude-status-lines')).toBeDefined();
      expect(adapterRegistry.getByName('claude-agent-memory')).toBeDefined();
      expect(adapterRegistry.getByName('claude-settings')).toBeDefined();
    });

    it('should preserve existing claude adapters', () => {
      const claudeAdapters = adapterRegistry.getForTool('claude');
      const names = claudeAdapters.map(a => a.name);
      expect(names).toContain('claude-skills');
      expect(names).toContain('claude-agents');
      expect(names).toContain('claude-commands');
      expect(names).toContain('claude-rules');
      expect(names).toContain('claude-md');
    });
  });
});
