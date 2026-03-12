import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config, git, project-config, and adapters before importing helpers
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getConfig: vi.fn(async () => ({ repos: {} })),
    setConfig: vi.fn(async () => {}),
    getReposBaseDir: vi.fn(() => '/mock/repos'),
    getCurrentRepo: vi.fn(async () => null),
  };
});

vi.mock('../git.js', () => ({
  cloneOrUpdateRepo: vi.fn(async () => {}),
}));

vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(async () => ({})),
  };
});

import {
  getTargetRepo,
  inferDefaultMode,
  requireExplicitMode,
  resolveCopilotAliasFromConfig,
  stripCommandSuffix,
  resolveCommandAliasFromConfig,
  parseConfigEntry,
} from '../commands/helpers.js';
import { getConfig, setConfig, getCurrentRepo } from '../config.js';
import { cloneOrUpdateRepo } from '../git.js';
import { getCombinedProjectConfig } from '../project-config.js';

describe('getTargetRepo', () => {
  it('should return repo by name when target matches existing repo name', async () => {
    const mockRepo = { name: 'my-repo', url: 'https://github.com/test/repo.git', path: '/mock/repos/my-repo' };
    vi.mocked(getConfig).mockResolvedValue({
      repos: { 'my-repo': mockRepo },
    });

    const result = await getTargetRepo({ target: 'my-repo' });
    expect(result).toEqual(mockRepo);
  });

  it('should return repo by URL when target is a known URL', async () => {
    const mockRepo = { name: 'my-repo', url: 'https://github.com/test/repo.git', path: '/mock/repos/my-repo' };
    vi.mocked(getConfig).mockResolvedValue({
      repos: { 'my-repo': mockRepo },
    });

    const result = await getTargetRepo({ target: 'https://github.com/test/repo.git' });
    expect(result).toEqual(mockRepo);
  });

  it('should auto-configure a new repo when target is an unknown URL', async () => {
    vi.mocked(getConfig).mockResolvedValue({ repos: {} });
    vi.mocked(setConfig).mockResolvedValue(undefined);
    vi.mocked(cloneOrUpdateRepo).mockResolvedValue(undefined as any);

    const result = await getTargetRepo({ target: 'https://github.com/new/rules.git' });
    expect(result.name).toBe('rules');
    expect(result.url).toBe('https://github.com/new/rules.git');
    expect(setConfig).toHaveBeenCalled();
    expect(cloneOrUpdateRepo).toHaveBeenCalled();
  });

  it('should handle URL ending with .git', async () => {
    vi.mocked(getConfig).mockResolvedValue({ repos: {} });
    vi.mocked(setConfig).mockResolvedValue(undefined);
    vi.mocked(cloneOrUpdateRepo).mockResolvedValue(undefined as any);

    const result = await getTargetRepo({ target: 'git@github.com:org/my-rules.git' });
    expect(result.url).toBe('git@github.com:org/my-rules.git');
    expect(result.name).toBe('my-rules');
  });

  it('should handle name collision when auto-configuring URL', async () => {
    vi.mocked(getConfig).mockResolvedValue({
      repos: {
        'rules': { name: 'rules', url: 'https://github.com/other/rules.git', path: '/mock/repos/rules' }
      },
    });
    vi.mocked(setConfig).mockResolvedValue(undefined);
    vi.mocked(cloneOrUpdateRepo).mockResolvedValue(undefined as any);

    const result = await getTargetRepo({ target: 'https://github.com/new/rules.git' });
    // Name should have a timestamp suffix
    expect(result.name).toMatch(/^rules-\d+$/);
  });

  it('should throw when target is an unknown name (not URL)', async () => {
    vi.mocked(getConfig).mockResolvedValue({ repos: {} });

    await expect(getTargetRepo({ target: 'nonexistent' })).rejects.toThrow(
      'Repository "nonexistent" not found in configuration.'
    );
  });

  it('should return currentRepo when no target specified', async () => {
    const mockRepo = { name: 'current', url: 'https://x.git', path: '/p' };
    vi.mocked(getConfig).mockResolvedValue({ repos: {} });
    vi.mocked(getCurrentRepo).mockResolvedValue(mockRepo);

    const result = await getTargetRepo({});
    expect(result).toEqual(mockRepo);
  });

  it('should throw when no target and no currentRepo', async () => {
    vi.mocked(getConfig).mockResolvedValue({ repos: {} });
    vi.mocked(getCurrentRepo).mockResolvedValue(null);

    await expect(getTargetRepo({})).rejects.toThrow('No repository configured');
  });
});

describe('inferDefaultMode', () => {
  it('should return "none" when no config entries exist', async () => {
    vi.mocked(getCombinedProjectConfig).mockResolvedValue({} as any);
    const result = await inferDefaultMode('/some/path');
    expect(result).toBe('none');
  });

  it('should return a single mode when only one tool has entries', async () => {
    vi.mocked(getCombinedProjectConfig).mockResolvedValue({
      cursor: { rules: { 'my-rule': 'https://repo.git' } },
    } as any);
    const result = await inferDefaultMode('/some/path');
    expect(result).toBe('cursor');
  });

  it('should return "ambiguous" when multiple tools have entries', async () => {
    vi.mocked(getCombinedProjectConfig).mockResolvedValue({
      cursor: { rules: { 'my-rule': 'https://repo.git' } },
      copilot: { instructions: { 'my-inst': 'https://repo.git' } },
    } as any);
    const result = await inferDefaultMode('/some/path');
    expect(result).toBe('ambiguous');
  });

  it('should handle agentsMd flat config', async () => {
    vi.mocked(getCombinedProjectConfig).mockResolvedValue({
      agentsMd: { 'root': 'https://repo.git' },
    } as any);
    const result = await inferDefaultMode('/some/path');
    expect(result).toBe('agents-md');
  });
});

describe('requireExplicitMode', () => {
  it('should throw with ambiguous message', () => {
    expect(() => requireExplicitMode('ambiguous')).toThrow('Multiple tool configs exist');
  });

  it('should throw with no default message for non-ambiguous mode', () => {
    expect(() => requireExplicitMode('none')).toThrow('No default mode could be inferred');
  });
});

describe('resolveCopilotAliasFromConfig', () => {
  it('should return input unchanged if it ends with .md', () => {
    expect(resolveCopilotAliasFromConfig('my-file.md', [])).toBe('my-file.md');
  });

  it('should return input unchanged if it ends with .instructions.md', () => {
    expect(resolveCopilotAliasFromConfig('my-file.instructions.md', [])).toBe('my-file.instructions.md');
  });

  it('should resolve a single match from keys', () => {
    const keys = ['react.instructions.md', 'vue.instructions.md'];
    expect(resolveCopilotAliasFromConfig('react', keys)).toBe('react.instructions.md');
  });

  it('should return input when no matches found', () => {
    const keys = ['react.instructions.md'];
    expect(resolveCopilotAliasFromConfig('angular', keys)).toBe('angular');
  });

  it('should throw when multiple matches found', () => {
    const keys = ['react.instructions.md', 'react.md'];
    expect(() => resolveCopilotAliasFromConfig('react', keys)).toThrow('matches multiple');
  });
});

describe('stripCommandSuffix', () => {
  it('should strip .md suffix', () => {
    expect(stripCommandSuffix('my-command.md')).toBe('my-command');
  });

  it('should return input unchanged if no .md suffix', () => {
    expect(stripCommandSuffix('my-command')).toBe('my-command');
  });
});

describe('resolveCommandAliasFromConfig', () => {
  it('should return input unchanged if it ends with .md', () => {
    expect(resolveCommandAliasFromConfig('my-cmd.md', [])).toBe('my-cmd.md');
  });

  it('should resolve a single match from keys', () => {
    const keys = ['build.md', 'deploy.md'];
    expect(resolveCommandAliasFromConfig('build', keys)).toBe('build.md');
  });

  it('should return input when no matches found', () => {
    expect(resolveCommandAliasFromConfig('test', ['build.md'])).toBe('test');
  });

  it('should throw when multiple matches found', () => {
    // This case requires two keys that both strip to the same base
    // stripCommandSuffix only strips .md, so we need two .md entries with same base
    // Actually this can't happen with unique keys. We need aliases that map to same name.
    // Let's test with keys that won't match but the function path:
    // Actually, keys like ['test.md'] would match 'test' once. We'd need duplicates.
    // Since keys are usually unique, let's just verify error path works by forcing it.
    const keys = ['test.md', 'test.md'];
    expect(() => resolveCommandAliasFromConfig('test', keys)).toThrow('matches multiple');
  });
});

describe('parseConfigEntry', () => {
  it('should handle string value', () => {
    const result = parseConfigEntry('my-rule', 'https://github.com/repo.git');
    expect(result).toEqual({
      repoUrl: 'https://github.com/repo.git',
      entryName: 'my-rule',
      alias: undefined,
    });
  });

  it('should handle object value with rule', () => {
    const result = parseConfigEntry('alias-name', { url: 'https://repo.git', rule: 'original-name' });
    expect(result).toEqual({
      repoUrl: 'https://repo.git',
      entryName: 'original-name',
      alias: 'alias-name',
    });
  });

  it('should handle object value without rule', () => {
    const result = parseConfigEntry('my-entry', { url: 'https://repo.git' });
    expect(result).toEqual({
      repoUrl: 'https://repo.git',
      entryName: 'my-entry',
      alias: 'my-entry',
    });
  });
});
