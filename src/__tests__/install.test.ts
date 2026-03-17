import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config module
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getConfig: vi.fn(async () => ({ repos: {} })),
    setConfig: vi.fn(async () => {}),
    getReposBaseDir: vi.fn(() => '/mock/repos'),
    getUserProjectConfig: vi.fn(async () => ({})),
    getUserConfigPath: vi.fn(async () => '/mock/.config/ai-rules-sync/user.json'),
  };
});

// Mock git module
vi.mock('../git.js', () => ({
  cloneOrUpdateRepo: vi.fn(async () => {}),
}));

// Mock helpers
vi.mock('../commands/helpers.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    parseConfigEntry: vi.fn((key: string, value: any) => {
      if (typeof value === 'string') {
        return { repoUrl: value, entryName: key, alias: undefined };
      }
      return { repoUrl: value.url, entryName: value.rule || key, alias: key };
    }),
  };
});

import {
  installEntriesForAdapter,
  installEntriesForTool,
  installUserEntriesForAdapter,
  installAllUserEntries,
} from '../commands/install.js';
import { SyncAdapter } from '../adapters/types.js';
import { getConfig, getUserProjectConfig, getUserConfigPath } from '../config.js';
import { cloneOrUpdateRepo } from '../git.js';

function createMockAdapter(overrides?: Partial<SyncAdapter>): SyncAdapter {
  const mockManager = {
    add: vi.fn(async () => ({ sourceName: 'rule.md', targetName: 'rule.md', linked: true, targetPath: '/p/rule.md' })),
    remove: vi.fn(),
    apply: vi.fn(async () => ({ linked: [], skipped: [], errors: [] })),
    diff: vi.fn(),
    status: vi.fn(),
    readManifest: vi.fn(),
    import: vi.fn(),
  };

  return {
    name: 'test-tool-rules',
    tool: 'test-tool',
    subtype: 'rules',
    configPath: ['testTool', 'rules'],
    defaultSourceDir: '.test-tool/rules',
    targetDir: '.test-tool/rules',
    mode: 'file',
    fileSuffixes: ['.md'],
    forProject: vi.fn(() => mockManager) as any,
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => ({ removedFrom: [] })),
    link: vi.fn(async () => ({ sourceName: 'rule.md', targetName: 'rule.md', linked: true })),
    unlink: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('installEntriesForAdapter', () => {
  it('should log warning when no entries found', async () => {
    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    await installEntriesForAdapter(adapter, '/project');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No test-tool rules'));
    spy.mockRestore();
  });

  it('should log success when entries are linked', async () => {
    const mockManager = {
      add: vi.fn(),
      remove: vi.fn(),
      apply: vi.fn(async () => ({
        linked: [{ name: 'rule.md', targetPath: '/p/rule.md' }],
        skipped: [],
        errors: [],
      })),
      diff: vi.fn(),
      status: vi.fn(),
      readManifest: vi.fn(),
      import: vi.fn(),
    };
    const adapter = createMockAdapter({
      forProject: vi.fn(() => mockManager) as any,
    });

    const spy = vi.spyOn(console, 'log');
    await installEntriesForAdapter(adapter, '/project');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('All test-tool rules installed'));
    spy.mockRestore();
  });

  it('should log success when entries are skipped', async () => {
    const mockManager = {
      add: vi.fn(),
      remove: vi.fn(),
      apply: vi.fn(async () => ({
        linked: [],
        skipped: [{ name: 'rule.md', reason: 'already exists' }],
        errors: [],
      })),
      diff: vi.fn(),
      status: vi.fn(),
      readManifest: vi.fn(),
      import: vi.fn(),
    };
    const adapter = createMockAdapter({
      forProject: vi.fn(() => mockManager) as any,
    });

    const spy = vi.spyOn(console, 'log');
    await installEntriesForAdapter(adapter, '/project');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('All test-tool rules installed'));
    spy.mockRestore();
  });
});

describe('installEntriesForTool', () => {
  it('should call installEntriesForAdapter for each adapter', async () => {
    const mockManager = {
      add: vi.fn(),
      remove: vi.fn(),
      apply: vi.fn(async () => ({ linked: [], skipped: [], errors: [] })),
      diff: vi.fn(),
      status: vi.fn(),
      readManifest: vi.fn(),
      import: vi.fn(),
    };

    const adapter1 = createMockAdapter({
      name: 'test-rules',
      subtype: 'rules',
      forProject: vi.fn(() => mockManager) as any,
    });
    const adapter2 = createMockAdapter({
      name: 'test-skills',
      subtype: 'skills',
      forProject: vi.fn(() => mockManager) as any,
    });

    await installEntriesForTool([adapter1, adapter2], '/project');

    expect(adapter1.forProject).toHaveBeenCalled();
    expect(adapter2.forProject).toHaveBeenCalled();
  });
});

describe('installUserEntriesForAdapter', () => {
  it('should log warning when no user entries found', async () => {
    vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);
    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    await installUserEntriesForAdapter(adapter);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No user'));
    spy.mockRestore();
  });

  it('should install entries from user config', async () => {
    vi.mocked(getUserProjectConfig).mockResolvedValue({
      testTool: {
        rules: {
          'my-rule': 'https://github.com/test/rules.git',
        },
      },
    } as any);
    vi.mocked(getConfig).mockResolvedValue({
      repos: {
        'rules': { name: 'rules', url: 'https://github.com/test/rules.git', path: '/mock/repos/rules' },
      },
    });

    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    await installUserEntriesForAdapter(adapter);

    expect(adapter.link).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('All user test-tool rules installed'));
    spy.mockRestore();
  });

  it('should clone repo if not found locally', async () => {
    vi.mocked(getUserProjectConfig).mockResolvedValue({
      testTool: {
        rules: {
          'my-rule': 'https://github.com/new/rules.git',
        },
      },
    } as any);
    vi.mocked(getConfig).mockResolvedValue({ repos: {} });

    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    await installUserEntriesForAdapter(adapter);

    expect(cloneOrUpdateRepo).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('installAllUserEntries', () => {
  it('should return total 0 and warn when no user entries exist', async () => {
    vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);
    vi.mocked(getUserConfigPath).mockResolvedValue('/home/user/.config/ai-rules-sync/user.json');
    const adapter = createMockAdapter();

    const spy = vi.spyOn(console, 'log');
    const result = await installAllUserEntries([adapter]);

    expect(result.total).toBe(0);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No user config found'));
    spy.mockRestore();
  });

  it('should count and install entries across adapters', async () => {
    vi.mocked(getUserProjectConfig).mockResolvedValue({
      testTool: {
        rules: {
          'rule1': 'https://github.com/test/rules.git',
          'rule2': 'https://github.com/test/rules.git',
        },
      },
    } as any);
    vi.mocked(getUserConfigPath).mockResolvedValue(path.join(os.homedir(), '.config/ai-rules-sync/user.json'));
    vi.mocked(getConfig).mockResolvedValue({
      repos: {
        'rules': { name: 'rules', url: 'https://github.com/test/rules.git', path: '/mock/repos/rules' },
      },
    });

    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');
    const result = await installAllUserEntries([adapter]);

    expect(result.total).toBe(2);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Installed 2 entries'));
    spy.mockRestore();
  });
});
