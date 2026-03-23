import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncAdapter } from '../adapters/types.js';
import { CommandContext, ImportCommandOptions } from '../commands/handlers.js';

// Mock importEntry so we can assert on its arguments
vi.mock('../sync-engine.js', () => ({
  importEntry: vi.fn(async () => ({
    imported: true,
    sourceName: 'settings.json',
    targetName: 'settings.json',
  })),
  importEntryNoCommit: vi.fn(async () => ({
    name: 'settings.json',
    sourceName: 'settings.json',
    targetName: 'settings.json',
    repoRelativePath: '.claude/user/settings.json',
  })),
}));

// Mock utils to avoid filesystem access for gitignore operations
vi.mock('../utils.js', () => ({
  addIgnoreEntry: vi.fn(async () => true),
  removeIgnoreEntry: vi.fn(async () => false),
}));

// Mock fs-extra to avoid real filesystem access
vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    pathExists: vi.fn(async () => false),
    ensureFile: vi.fn(async () => {}),
    readJson: vi.fn(async () => ({})),
    writeJson: vi.fn(async () => {}),
  };
});

// Mock project-config to avoid filesystem access
vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(async () => ({})),
    getRepoSourceConfig: vi.fn(async () => ({})),
    getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
    getTargetDir: vi.fn((_config: unknown, _tool: string, _subtype: string, _name: string, defaultDir: string) => defaultDir),
    addUserDependency: vi.fn(async () => {}),
  };
});

// Mock config.js
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getUserProjectConfig: vi.fn(async () => ({})),
    getUserConfigPath: vi.fn(async () => '/mock/user.json'),
  };
});

function makeAdapter(): SyncAdapter {
  return {
    name: 'claude-settings',
    tool: 'claude',
    subtype: 'settings',
    configPath: ['claude', 'settings'] as [string, string],
    defaultSourceDir: '.claude',
    targetDir: '.claude',
    userTargetDir: '.claude',
    userDefaultSourceDir: '.claude/user',
    mode: 'file',
    fileSuffixes: ['.json'],
    forProject: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      apply: vi.fn(),
      diff: vi.fn(),
      status: vi.fn(),
      readManifest: vi.fn(),
      import: vi.fn(async () => ({
        sourceName: 'settings.json',
        targetName: 'settings.json',
        linked: true,
        targetPath: '',
      })),
    })) as any,
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => ({ removedFrom: [] })),
    link: vi.fn(async () => ({ sourceName: 'settings.json', targetName: 'settings.json', linked: true })),
    unlink: vi.fn(async () => {}),
  };
}

function makeRepo() {
  return { name: 'test-repo', url: 'https://github.com/test/repo.git', path: '/tmp/repo' };
}

describe('handleImport skipIgnore propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('9.2: ctx.user=true propagates skipIgnore=true to importEntry', async () => {
    const { handleImport } = await import('../commands/handlers.js');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter();
    const ctx: CommandContext = {
      projectPath: '/tmp/home',
      repo: makeRepo(),
      isLocal: false,
      user: true,
      skipIgnore: true,
    };

    await handleImport(adapter, ctx, 'settings.json', {} as ImportCommandOptions);

    expect(importEntry).toHaveBeenCalledWith(
      adapter,
      expect.objectContaining({ skipIgnore: true })
    );
  });

  it('9.3: ctx.user=false results in importEntry called with skipIgnore falsy', async () => {
    const { handleImport } = await import('../commands/handlers.js');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter();
    const ctx: CommandContext = {
      projectPath: '/tmp/project',
      repo: makeRepo(),
      isLocal: false,
      user: false,
    };

    await handleImport(adapter, ctx, 'settings.json', {} as ImportCommandOptions);

    expect(importEntry).toHaveBeenCalledWith(
      adapter,
      expect.objectContaining({ skipIgnore: undefined })
    );
  });

  it('9.4: ctx.skipIgnore=true without ctx.user is propagated unchanged', async () => {
    const { handleImport } = await import('../commands/handlers.js');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter();
    const ctx: CommandContext = {
      projectPath: '/tmp/project',
      repo: makeRepo(),
      isLocal: false,
      user: false,
      skipIgnore: true,
    };

    await handleImport(adapter, ctx, 'settings.json', {} as ImportCommandOptions);

    expect(importEntry).toHaveBeenCalledWith(
      adapter,
      expect.objectContaining({ skipIgnore: true })
    );
  });
});
