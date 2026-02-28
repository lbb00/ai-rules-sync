import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { getConfigSource, getCombinedProjectConfig, migrateLegacyToNew, getRepoSourceConfig, getSourceDir } from '../src/project-config.js';
import { findAdapterForAlias } from '../src/adapters/index.js';

vi.mock('fs-extra');

describe('project-config (ai-rules-sync + legacy compat)', () => {
  const projectPath = '/mock/project';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.readJson).mockResolvedValue({});
    vi.mocked(fs.writeJson).mockResolvedValue(undefined as any);
  });

  it('prefers new config when ai-rules-sync.json exists', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) return true;
      if (p === path.join(projectPath, 'cursor-rules.json')) return true; // should be ignored
      return false;
    });

    const source = await getConfigSource(projectPath);
    expect(source).toBe('new');
  });

  it('falls back to legacy cursor-rules.json when no new config exists', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) return false;
      if (p === path.join(projectPath, 'ai-rules-sync.local.json')) return false;
      if (p === path.join(projectPath, 'cursor-rules.json')) return true;
      if (p === path.join(projectPath, 'cursor-rules.local.json')) return false;
      return false;
    });

    vi.mocked(fs.readJson).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'cursor-rules.json')) {
        return { rules: { react: 'https://example.com/repo.git' } };
      }
      return {};
    });

    const combined = await getCombinedProjectConfig(projectPath);
    expect(combined.cursor?.rules?.react).toBe('https://example.com/repo.git');
    expect(Object.keys(combined.copilot?.instructions || {})).toHaveLength(0);
  });

  it('migrates legacy cursor-rules*.json into ai-rules-sync*.json on write paths', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) return false;
      if (p === path.join(projectPath, 'ai-rules-sync.local.json')) return false;
      if (p === path.join(projectPath, 'cursor-rules.json')) return true;
      if (p === path.join(projectPath, 'cursor-rules.local.json')) return true;
      return false;
    });

    vi.mocked(fs.readJson).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'cursor-rules.json')) {
        return { rules: { a: 'url-a' } };
      }
      if (p === path.join(projectPath, 'cursor-rules.local.json')) {
        return { rules: { b: { url: 'url-b', rule: 'bb' } } };
      }
      return {};
    });

    const res = await migrateLegacyToNew(projectPath);
    expect(res.migrated).toBe(true);

    expect(fs.writeJson).toHaveBeenCalledWith(
      path.join(projectPath, 'ai-rules-sync.json'),
      expect.objectContaining({
        cursor: { rules: { a: 'url-a' } },
      }),
      { spaces: 2 }
    );

    expect(fs.writeJson).toHaveBeenCalledWith(
      path.join(projectPath, 'ai-rules-sync.local.json'),
      expect.objectContaining({
        cursor: { rules: { b: { url: 'url-b', rule: 'bb' } } },
      }),
      { spaces: 2 }
    );
  });
});

describe('getRepoSourceConfig - sourceDir format', () => {
  const repoPath = '/mock/repo';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses new sourceDir format correctly', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({
      rootPath: 'src',
      sourceDir: {
        cursor: {
          rules: '.cursor/rules',
          commands: '.cursor/commands'
        },
        copilot: {
          instructions: '.github/instructions'
        }
      }
    });

    const config = await getRepoSourceConfig(repoPath);

    expect(config.rootPath).toBe('src');
    expect(config.cursor?.rules).toBe('.cursor/rules');
    expect(config.cursor?.commands).toBe('.cursor/commands');
    expect(config.copilot?.instructions).toBe('.github/instructions');
  });

  it('parses legacy flat format (string values) correctly', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({
      rootPath: 'config',
      cursor: {
        rules: 'custom-rules',
        commands: 'custom-commands'
      }
    });

    const config = await getRepoSourceConfig(repoPath);

    expect(config.rootPath).toBe('config');
    expect(config.cursor?.rules).toBe('custom-rules');
    expect(config.cursor?.commands).toBe('custom-commands');
  });

  it('returns empty config when cursor/copilot are dependency records (not source dirs)', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue({
      cursor: {
        rules: { 'react': 'https://example.com/repo.git' }
      }
    });

    const config = await getRepoSourceConfig(repoPath);

    // Should NOT extract dependency records as source dirs
    expect(config.cursor?.rules).toBeUndefined();
  });

  it('returns empty config when file does not exist', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);

    const config = await getRepoSourceConfig(repoPath);

    expect(config).toEqual({});
  });
});

describe('getSourceDir', () => {
  it('returns custom directory from config', () => {
    const config = {
      rootPath: 'src',
      cursor: { rules: 'rules' }
    };

    const dir = getSourceDir(config, 'cursor', 'rules', '.cursor/rules');
    expect(dir).toBe('src/rules');
  });

  it('returns default directory when not configured', () => {
    const config = {};

    const dir = getSourceDir(config, 'cursor', 'rules', '.cursor/rules');
    expect(dir).toBe('.cursor/rules');
  });

  it('applies rootPath to default directory', () => {
    const config = { rootPath: 'config' };

    const dir = getSourceDir(config, 'cursor', 'rules', '.cursor/rules');
    expect(dir).toBe('config/.cursor/rules');
  });

  it('handles copilot instructions', () => {
    const config = {
      copilot: { instructions: 'docs/instructions' }
    };

    const dir = getSourceDir(config, 'copilot', 'instructions', '.github/instructions');
    expect(dir).toBe('docs/instructions');
  });

  it('handles cursor commands', () => {
    const config = {
      cursor: { commands: 'my-commands' }
    };

    const dir = getSourceDir(config, 'cursor', 'commands', '.cursor/commands');
    expect(dir).toBe('my-commands');
  });

  it('handles gemini md', () => {
    const config = {
      gemini: { md: 'custom-gemini' }
    };

    const dir = getSourceDir(config, 'gemini', 'md', '.gemini');
    expect(dir).toBe('custom-gemini');
  });

  it('handles codex md', () => {
    const config = {
      codex: { md: 'custom-codex' }
    };

    const dir = getSourceDir(config, 'codex', 'md', '.codex');
    expect(dir).toBe('custom-codex');
  });
});

describe('getCombinedProjectConfig - gemini and codex md sections', () => {
  const projectPath = '/mock/project';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.writeJson).mockResolvedValue(undefined as any);
  });

  it('merges gemini.md entries from main and local configs', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) return true;
      if (p === path.join(projectPath, 'ai-rules-sync.local.json')) return true;
      return false;
    });

    vi.mocked(fs.readJson).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) {
        return { gemini: { md: { GEMINI: 'https://example.com/repo.git' } } };
      }
      if (p === path.join(projectPath, 'ai-rules-sync.local.json')) {
        return { gemini: { md: { 'GEMINI-local': 'https://local.com/repo.git' } } };
      }
      return {};
    });

    const config = await getCombinedProjectConfig(projectPath);
    expect(config.gemini?.md?.['GEMINI']).toBe('https://example.com/repo.git');
    expect(config.gemini?.md?.['GEMINI-local']).toBe('https://local.com/repo.git');
  });

  it('merges codex.md entries from main and local configs', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) return true;
      if (p === path.join(projectPath, 'ai-rules-sync.local.json')) return true;
      return false;
    });

    vi.mocked(fs.readJson).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) {
        return { codex: { md: { AGENTS: 'https://example.com/repo.git' } } };
      }
      if (p === path.join(projectPath, 'ai-rules-sync.local.json')) {
        return { codex: { md: { 'AGENTS-local': 'https://local.com/repo.git' } } };
      }
      return {};
    });

    const config = await getCombinedProjectConfig(projectPath);
    expect(config.codex?.md?.['AGENTS']).toBe('https://example.com/repo.git');
    expect(config.codex?.md?.['AGENTS-local']).toBe('https://local.com/repo.git');
  });

  it('merges all gemini subtypes together', async () => {
    vi.mocked(fs.pathExists).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) return true;
      return false;
    });

    vi.mocked(fs.readJson).mockImplementation(async (p) => {
      if (p === path.join(projectPath, 'ai-rules-sync.json')) {
        return {
          gemini: {
            commands: { 'my-cmd': 'https://example.com/repo.git' },
            skills: { 'my-skill': 'https://example.com/repo.git' },
            agents: { 'my-agent': 'https://example.com/repo.git' },
            md: { 'GEMINI': 'https://example.com/repo.git' },
          }
        };
      }
      return {};
    });

    const config = await getCombinedProjectConfig(projectPath);
    expect(config.gemini?.commands?.['my-cmd']).toBeDefined();
    expect(config.gemini?.skills?.['my-skill']).toBeDefined();
    expect(config.gemini?.agents?.['my-agent']).toBeDefined();
    expect(config.gemini?.md?.['GEMINI']).toBeDefined();
  });
});

describe('findAdapterForAlias - gemini.md and codex.md', () => {
  it('should find gemini-md adapter for alias in gemini.md', () => {
    const cfg = {
      gemini: { md: { 'GEMINI': 'https://example.com/repo.git' } }
    };
    const result = findAdapterForAlias(cfg, 'GEMINI');
    expect(result).not.toBeNull();
    expect(result?.adapter.name).toBe('gemini-md');
    expect(result?.section).toBe('gemini.md');
  });

  it('should find codex-md adapter for alias in codex.md', () => {
    const cfg = {
      codex: { md: { 'AGENTS': 'https://example.com/repo.git' } }
    };
    const result = findAdapterForAlias(cfg, 'AGENTS');
    expect(result).not.toBeNull();
    expect(result?.adapter.name).toBe('codex-md');
    expect(result?.section).toBe('codex.md');
  });

  it('should return null for unknown alias', () => {
    const cfg = {};
    const result = findAdapterForAlias(cfg, 'unknown-alias');
    expect(result).toBeNull();
  });

  it('should prefer gemini.agents over gemini.md for same alias when both present', () => {
    // In practice they should not have the same alias, but test priority order
    const cfg = {
      gemini: {
        agents: { 'GEMINI': 'url-agents' },
        md: { 'GEMINI': 'url-md' },
      }
    };
    // agents is checked before md in findAdapterForAlias
    const result = findAdapterForAlias(cfg, 'GEMINI');
    expect(result?.section).toBe('gemini.agents');
  });
});
