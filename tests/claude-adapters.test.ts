import { describe, it, expect } from 'vitest';
import { cursorSkillsAdapter } from '../src/adapters/cursor-skills.js';
import { claudeSkillsAdapter } from '../src/adapters/claude-skills.js';
import { claudeAgentsAdapter } from '../src/adapters/claude-agents.js';
import { traeRulesAdapter } from '../src/adapters/trae-rules.js';
import { traeSkillsAdapter } from '../src/adapters/trae-skills.js';

describe('AI Tool Adapters', () => {
  describe('cursorSkillsAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(cursorSkillsAdapter.name).toBe('cursor-skills');
      expect(cursorSkillsAdapter.tool).toBe('cursor');
      expect(cursorSkillsAdapter.subtype).toBe('skills');
      expect(cursorSkillsAdapter.configPath).toEqual(['cursor', 'skills']);
      expect(cursorSkillsAdapter.defaultSourceDir).toBe('.cursor/skills');
      expect(cursorSkillsAdapter.targetDir).toBe('.cursor/skills');
      expect(cursorSkillsAdapter.mode).toBe('directory');
    });
  });

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

  describe('traeRulesAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(traeRulesAdapter.name).toBe('trae-rules');
      expect(traeRulesAdapter.tool).toBe('trae');
      expect(traeRulesAdapter.subtype).toBe('rules');
      expect(traeRulesAdapter.configPath).toEqual(['trae', 'rules']);
      expect(traeRulesAdapter.defaultSourceDir).toBe('.trae/rules');
      expect(traeRulesAdapter.targetDir).toBe('.trae/rules');
      expect(traeRulesAdapter.mode).toBe('file');
    });
  });

  describe('traeSkillsAdapter', () => {
    it('should have correct adapter properties', () => {
      expect(traeSkillsAdapter.name).toBe('trae-skills');
      expect(traeSkillsAdapter.tool).toBe('trae');
      expect(traeSkillsAdapter.subtype).toBe('skills');
      expect(traeSkillsAdapter.configPath).toEqual(['trae', 'skills']);
      expect(traeSkillsAdapter.defaultSourceDir).toBe('.trae/skills');
      expect(traeSkillsAdapter.targetDir).toBe('.trae/skills');
      expect(traeSkillsAdapter.mode).toBe('file');
    });
  });
});
