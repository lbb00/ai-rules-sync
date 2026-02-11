import { describe, it, expect } from 'vitest';
import { claudeRulesAdapter } from '../adapters/claude-rules.js';
import { adapterRegistry } from '../adapters/index.js';

describe('claude-rules adapter', () => {
  it('should have correct basic properties', () => {
    expect(claudeRulesAdapter.name).toBe('claude-rules');
    expect(claudeRulesAdapter.tool).toBe('claude');
    expect(claudeRulesAdapter.subtype).toBe('rules');
    expect(claudeRulesAdapter.defaultSourceDir).toBe('.claude/rules');
    expect(claudeRulesAdapter.targetDir).toBe('.claude/rules');
    expect(claudeRulesAdapter.mode).toBe('file');
    expect(claudeRulesAdapter.fileSuffixes).toEqual(['.md']);
  });

  it('should have correct config path', () => {
    expect(claudeRulesAdapter.configPath).toEqual(['claude', 'rules']);
  });

  it('should be registered in adapterRegistry', () => {
    const retrieved = adapterRegistry.getByName('claude-rules');
    expect(retrieved).toBe(claudeRulesAdapter);
  });

  it('should be retrievable by tool and subtype', () => {
    const retrieved = adapterRegistry.get('claude', 'rules');
    expect(retrieved).toBe(claudeRulesAdapter);
  });

  it('should have required adapter methods', () => {
    expect(claudeRulesAdapter.addDependency).toBeDefined();
    expect(claudeRulesAdapter.removeDependency).toBeDefined();
    expect(claudeRulesAdapter.link).toBeDefined();
    expect(claudeRulesAdapter.unlink).toBeDefined();
  });
});
