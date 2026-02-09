import { describe, it, expect } from 'vitest';
import { codexRulesAdapter } from '../src/adapters/codex-rules.js';
import { codexSkillsAdapter } from '../src/adapters/codex-skills.js';
import { adapterRegistry } from '../src/adapters/index.js';

describe('Codex Adapters', () => {
  describe('codexRulesAdapter', () => {
    it('should have correct properties', () => {
      expect(codexRulesAdapter.name).toBe('codex-rules');
      expect(codexRulesAdapter.tool).toBe('codex');
      expect(codexRulesAdapter.subtype).toBe('rules');
      expect(codexRulesAdapter.defaultSourceDir).toBe('.codex/rules');
      expect(codexRulesAdapter.targetDir).toBe('.codex/rules');
      expect(codexRulesAdapter.mode).toBe('file');
    });

    it('should have file suffixes', () => {
      expect(codexRulesAdapter.fileSuffixes).toEqual(['.rules']);
    });

    it('should have correct config path', () => {
      expect(codexRulesAdapter.configPath).toEqual(['codex', 'rules']);
    });
  });

  describe('codexSkillsAdapter', () => {
    it('should have correct properties', () => {
      expect(codexSkillsAdapter.name).toBe('codex-skills');
      expect(codexSkillsAdapter.tool).toBe('codex');
      expect(codexSkillsAdapter.subtype).toBe('skills');
      expect(codexSkillsAdapter.defaultSourceDir).toBe('.agents/skills');
      expect(codexSkillsAdapter.targetDir).toBe('.agents/skills');
      expect(codexSkillsAdapter.mode).toBe('directory');
    });

    it('should use non-standard directory path', () => {
      // Codex skills are in .agents/skills, not .codex/skills
      expect(codexSkillsAdapter.defaultSourceDir).toBe('.agents/skills');
      expect(codexSkillsAdapter.targetDir).toBe('.agents/skills');
    });

    it('should have correct config path', () => {
      expect(codexSkillsAdapter.configPath).toEqual(['codex', 'skills']);
    });
  });

  describe('Adapter Registry Integration', () => {
    it('should register codex rules adapter', () => {
      const adapter = adapterRegistry.get('codex', 'rules');
      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('codex-rules');
    });

    it('should register codex skills adapter', () => {
      const adapter = adapterRegistry.get('codex', 'skills');
      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('codex-skills');
    });

    it('should return codex adapters for tool', () => {
      const adapters = adapterRegistry.getForTool('codex');
      expect(adapters).toHaveLength(2);
      expect(adapters.map(a => a.name)).toContain('codex-rules');
      expect(adapters.map(a => a.name)).toContain('codex-skills');
    });
  });
});
