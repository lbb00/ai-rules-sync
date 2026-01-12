import { describe, it, expect } from 'vitest';
import { claudeSkillsAdapter } from '../src/adapters/claude-skills.js';
import { claudeAgentsAdapter } from '../src/adapters/claude-agents.js';
import { claudePluginsAdapter } from '../src/adapters/claude-plugins.js';

describe('Claude Adapters', () => {
  describe('claudeSkillsAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudeSkillsAdapter.name).toBe('claude-skills');
      expect(claudeSkillsAdapter.tool).toBe('claude');
      expect(claudeSkillsAdapter.subtype).toBe('skills');
      expect(claudeSkillsAdapter.configPath).toEqual(['claude', 'skills']);
      expect(claudeSkillsAdapter.defaultSourceDir).toBe('.claude/skills');
      expect(claudeSkillsAdapter.targetDir).toBe('.claude/skills');
      expect(claudeSkillsAdapter.mode).toBe('directory');
    });
  });

  describe('claudeAgentsAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudeAgentsAdapter.name).toBe('claude-agents');
      expect(claudeAgentsAdapter.tool).toBe('claude');
      expect(claudeAgentsAdapter.subtype).toBe('agents');
      expect(claudeAgentsAdapter.configPath).toEqual(['claude', 'agents']);
      expect(claudeAgentsAdapter.defaultSourceDir).toBe('.claude/agents');
      expect(claudeAgentsAdapter.targetDir).toBe('.claude/agents');
      expect(claudeAgentsAdapter.mode).toBe('directory');
    });
  });

  describe('claudePluginsAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(claudePluginsAdapter.name).toBe('claude-plugins');
      expect(claudePluginsAdapter.tool).toBe('claude');
      expect(claudePluginsAdapter.subtype).toBe('plugins');
      expect(claudePluginsAdapter.configPath).toEqual(['claude', 'plugins']);
      expect(claudePluginsAdapter.defaultSourceDir).toBe('plugins');
      expect(claudePluginsAdapter.targetDir).toBe('plugins');
      expect(claudePluginsAdapter.mode).toBe('directory');
    });
  });
});
