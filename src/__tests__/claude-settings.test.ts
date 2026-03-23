import { describe, it, expect } from 'vitest';
import { claudeSettingsAdapter } from '../adapters/claude-settings.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('claude-settings adapter', () => {
  runStandardAdapterContract({
    adapter: claudeSettingsAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'claude-settings',
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
      mode: 'file',
      configPath: ['claude', 'settings'],
      fileSuffixes: ['.json'],
    }
  });

  it('should have userDefaultSourceDir set to .claude/user', () => {
    expect(claudeSettingsAdapter.userDefaultSourceDir).toBe('.claude/user');
  });

  it('should have userTargetDir set to .claude', () => {
    expect(claudeSettingsAdapter.userTargetDir).toBe('.claude');
  });
});
