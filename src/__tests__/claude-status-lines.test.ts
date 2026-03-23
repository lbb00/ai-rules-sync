import { describe, it, expect } from 'vitest';
import { claudeStatusLinesAdapter } from '../adapters/claude-status-lines.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('claude-status-lines adapter', () => {
  runStandardAdapterContract({
    adapter: claudeStatusLinesAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'claude-status-lines',
      tool: 'claude',
      subtype: 'status-lines',
      defaultSourceDir: '.claude/status-lines',
      targetDir: '.claude/status-lines',
      mode: 'directory',
      configPath: ['claude', 'status-lines'],
    }
  });

  it('should have userDefaultSourceDir set to .claude/user/status-lines', () => {
    expect(claudeStatusLinesAdapter.userDefaultSourceDir).toBe('.claude/user/status-lines');
  });

  it('should have userTargetDir set to .claude/status_lines', () => {
    expect(claudeStatusLinesAdapter.userTargetDir).toBe('.claude/status_lines');
  });
});
