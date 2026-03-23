import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SyncAdapter, AdapterRegistry } from '../adapters/types.js';
import type { RepoConfig } from '../config.js';

// Mock fs-extra
vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...(actual.default as Record<string, unknown>),
      pathExists: vi.fn(async () => false),
      readdir: vi.fn(async () => []),
      lstat: vi.fn(async () => ({ isDirectory: () => false, isSymbolicLink: () => false })),
      stat: vi.fn(async () => ({})),
    },
  };
});

// Mock project-config
vi.mock('../project-config.js', () => ({
  getRepoSourceConfig: vi.fn(async () => ({})),
  getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
  getCombinedProjectConfig: vi.fn(async () => ({})),
}));

// Mock chalk to passthrough strings
vi.mock('chalk', () => {
  const handler: ProxyHandler<object> = {
    get: () => new Proxy((s: string) => s, handler),
    apply: (_target, _thisArg, args) => args[0],
  };
  return { default: new Proxy({}, handler) };
});

// Mock readline
vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn(() => ({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('y')),
      close: vi.fn(),
    })),
  },
}));

import fs from 'fs-extra';
import { getRepoSourceConfig, getSourceDir, getCombinedProjectConfig } from '../project-config.js';
import readline from 'readline';
import {
  discoverEntriesForAdapter,
  discoverAllEntries,
  installDiscoveredEntries,
  handleAddAll,
  DiscoveredEntry,
} from '../commands/add-all.js';

const mockedPathExists = vi.mocked(fs.pathExists);
const mockedReaddir = vi.mocked(fs.readdir);
const mockedLstat = vi.mocked(fs.lstat);
const mockedStat = vi.mocked(fs.stat);
const mockedGetRepoSourceConfig = vi.mocked(getRepoSourceConfig);
const mockedGetSourceDir = vi.mocked(getSourceDir);
const mockedGetCombinedProjectConfig = vi.mocked(getCombinedProjectConfig);

function makeRepo(overrides: Partial<RepoConfig> = {}): RepoConfig {
  return {
    url: 'https://github.com/user/repo.git',
    name: 'test-repo',
    path: '/tmp/repos/test-repo',
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<SyncAdapter> = {}): SyncAdapter {
  return {
    name: 'cursor-rules',
    tool: 'cursor',
    subtype: 'rules',
    configPath: ['cursor', 'rules'],
    defaultSourceDir: '.cursor/rules',
    targetDir: '.cursor/rules',
    mode: 'file',
    fileSuffixes: ['.mdc'],
    forProject: vi.fn(),
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => {}),
    link: vi.fn(async () => ({ targetPath: '/some/path', created: true })),
    unlink: vi.fn(async () => {}),
    ...overrides,
  } as unknown as SyncAdapter;
}

function makeRegistry(adapters: SyncAdapter[]): AdapterRegistry {
  return {
    register: vi.fn(),
    get: vi.fn((tool: string, subtype: string) =>
      adapters.find((a) => a.tool === tool && a.subtype === subtype)
    ),
    getByName: vi.fn((name: string) => adapters.find((a) => a.name === name)),
    getForTool: vi.fn((tool: string) => adapters.filter((a) => a.tool === tool)),
    getDefaultForTool: vi.fn((tool: string) => adapters.find((a) => a.tool === tool)),
    all: vi.fn(() => adapters),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  // Defaults
  mockedGetRepoSourceConfig.mockResolvedValue({});
  mockedGetSourceDir.mockImplementation((_config, _tool, _subtype, defaultDir) => defaultDir);
  mockedGetCombinedProjectConfig.mockResolvedValue({});
});

// ----- discoverEntriesForAdapter -----

describe('discoverEntriesForAdapter', () => {
  it('returns empty when source directory does not exist', async () => {
    const adapter = makeAdapter();
    const repo = makeRepo();
    mockedPathExists.mockResolvedValue(false as never);

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toEqual([]);
  });

  it('discovers file-mode entries matching suffix', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['rule1.mdc', 'rule2.mdc', 'readme.txt', '.hidden.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');

    // .hidden.mdc is filtered out (hidden file), readme.txt doesn't match suffix
    expect(result).toHaveLength(2);
    expect(result[0].entryName).toBe('rule1');
    expect(result[0].suffix).toBe('.mdc');
    expect(result[0].isDirectory).toBe(false);
    expect(result[1].entryName).toBe('rule2');
  });

  it('skips directories in file mode', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['some-dir'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => true,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(0);
  });

  it('discovers directory-mode entries', async () => {
    const adapter = makeAdapter({ mode: 'directory' });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['my-dir', 'some-file.txt'] as never);
    mockedLstat.mockImplementation(async (p) => {
      const name = String(p).split('/').pop();
      return {
        isDirectory: () => name === 'my-dir',
        isSymbolicLink: () => false,
      } as never;
    });

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(1);
    expect(result[0].entryName).toBe('my-dir');
    expect(result[0].isDirectory).toBe(true);
  });

  it('discovers hybrid-mode entries (files and directories)', async () => {
    const adapter = makeAdapter({
      mode: 'hybrid',
      hybridFileSuffixes: ['.md'],
    });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['docs-dir', 'readme.md', 'skip.txt'] as never);
    mockedLstat.mockImplementation(async (p) => {
      const name = String(p).split('/').pop();
      return {
        isDirectory: () => name === 'docs-dir',
        isSymbolicLink: () => false,
      } as never;
    });

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    // docs-dir (directory) + readme.md (file matching .md suffix)
    expect(result).toHaveLength(2);
    expect(result[0].entryName).toBe('docs-dir');
    expect(result[0].isDirectory).toBe(true);
    expect(result[1].entryName).toBe('readme');
    expect(result[1].isDirectory).toBe(false);
    expect(result[1].suffix).toBe('.md');
  });

  it('skips files not matching hybrid suffixes', async () => {
    const adapter = makeAdapter({
      mode: 'hybrid',
      hybridFileSuffixes: ['.md'],
    });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['skip.txt'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(0);
  });

  it('marks entries as alreadyInConfig when they exist in project config', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['existing.mdc', 'new.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { existing: 'https://github.com/user/repo.git' } },
    });

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(2);
    expect(result[0].entryName).toBe('existing');
    expect(result[0].alreadyInConfig).toBe(true);
    expect(result[1].entryName).toBe('new');
    expect(result[1].alreadyInConfig).toBe(false);
  });

  it('skips broken symlinks', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['broken.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => true,
    } as never);
    mockedStat.mockRejectedValue(new Error('ENOENT'));

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(0);
  });

  it('returns empty when readdir throws', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockRejectedValue(new Error('EACCES'));

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toEqual([]);
  });

  it('skips items that fail lstat', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['good.mdc', 'bad.mdc'] as never);

    let callCount = 0;
    mockedLstat.mockImplementation(async () => {
      callCount++;
      if (callCount === 2) throw new Error('ENOENT');
      return {
        isDirectory: () => false,
        isSymbolicLink: () => false,
      } as never;
    });

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(1);
    expect(result[0].entryName).toBe('good');
  });

  it('uses sourceDirOverrides when provided', async () => {
    const adapter = makeAdapter();
    const repo = makeRepo();

    const overrides = { cursor: { rules: 'custom/dir' } };
    mockedPathExists.mockResolvedValue(false as never);

    await discoverEntriesForAdapter(adapter, repo, '/project', overrides as any);

    expect(mockedGetSourceDir).toHaveBeenCalledWith(
      expect.anything(),
      'cursor',
      'rules',
      '.cursor/rules',
      overrides,
    );
  });

  it('uses repo.sourceDir when no explicit override', async () => {
    const adapter = makeAdapter();
    const repoSourceDir = { cursor: { rules: 'repo-level/dir' } };
    const repo = makeRepo({ sourceDir: repoSourceDir as any });

    mockedPathExists.mockResolvedValue(false as never);

    await discoverEntriesForAdapter(adapter, repo, '/project');

    expect(mockedGetSourceDir).toHaveBeenCalledWith(
      expect.anything(),
      'cursor',
      'rules',
      '.cursor/rules',
      repoSourceDir,
    );
  });

  it('handles getCombinedProjectConfig errors gracefully', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedGetCombinedProjectConfig.mockRejectedValue(new Error('No config'));
    mockedReaddir.mockResolvedValue(['test.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(1);
    expect(result[0].alreadyInConfig).toBe(false);
  });

  it('handles file mode with no fileSuffixes (empty array)', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: [] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['anything.txt'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverEntriesForAdapter(adapter, repo, '/project');
    expect(result).toHaveLength(0);
  });
});

// ----- discoverAllEntries -----

describe('discoverAllEntries', () => {
  it('uses all adapters when no filter is provided', async () => {
    const adapter1 = makeAdapter({ name: 'adapter-a', tool: 'toolA', subtype: 'rules' });
    const adapter2 = makeAdapter({ name: 'adapter-b', tool: 'toolB', subtype: 'rules' });
    const registry = makeRegistry([adapter1, adapter2]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverAllEntries('/project', repo, registry);

    expect(registry.all).toHaveBeenCalled();
  });

  it('filters by adapter names when options.adapters is provided', async () => {
    const adapter1 = makeAdapter({ name: 'adapter-a' });
    const adapter2 = makeAdapter({ name: 'adapter-b' });
    const registry = makeRegistry([adapter1, adapter2]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverAllEntries('/project', repo, registry, { adapters: ['adapter-a'] });

    expect(registry.getByName).toHaveBeenCalledWith('adapter-a');
  });

  it('filters by tool names when options.tools is provided', async () => {
    const adapter1 = makeAdapter({ name: 'cursor-rules', tool: 'cursor' });
    const adapter2 = makeAdapter({ name: 'copilot-instructions', tool: 'copilot' });
    const registry = makeRegistry([adapter1, adapter2]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverAllEntries('/project', repo, registry, { tools: ['cursor'] });

    expect(registry.getForTool).toHaveBeenCalledWith('cursor');
  });

  it('ignores unknown adapter names', async () => {
    const adapter1 = makeAdapter({ name: 'adapter-a' });
    const registry = makeRegistry([adapter1]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    const result = await discoverAllEntries('/project', repo, registry, { adapters: ['nonexistent'] });
    // getByName returns undefined for 'nonexistent', filter removes it
    expect(result).toEqual([]);
  });
});

// ----- installDiscoveredEntries -----

describe('installDiscoveredEntries', () => {
  function makeEntry(overrides: Partial<DiscoveredEntry> = {}): DiscoveredEntry {
    const adapter = makeAdapter();
    return {
      adapter,
      sourceName: 'test-rule.mdc',
      entryName: 'test-rule',
      sourcePath: '/tmp/repos/test-repo/.cursor/rules/test-rule.mdc',
      isDirectory: false,
      suffix: '.mdc',
      alreadyInConfig: false,
      ...overrides,
    };
  }

  it('installs entries by calling addDependency and link', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, {});

    expect(entry.adapter.addDependency).toHaveBeenCalledWith(
      '/project',
      'test-rule',
      repo.url,
      'test-rule',
      false,
    );
    expect(entry.adapter.link).toHaveBeenCalled();
    expect(result.installed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('skips already-configured entries when skipExisting is true', async () => {
    const entry = makeEntry({ alreadyInConfig: true });
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, {
      skipExisting: true,
    });

    expect(result.skipped).toBe(1);
    expect(result.installed).toBe(0);
    expect(entry.adapter.addDependency).not.toHaveBeenCalled();
  });

  it('skips already-configured entries by default (non-interactive)', async () => {
    const entry = makeEntry({ alreadyInConfig: true });
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, {});

    expect(result.skipped).toBe(1);
    expect(result.installed).toBe(0);
  });

  it('installs already-configured entries when force is true', async () => {
    const entry = makeEntry({ alreadyInConfig: true });
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, { force: true });

    expect(result.installed).toBe(1);
    expect(entry.adapter.addDependency).toHaveBeenCalled();
  });

  it('in dry-run mode, counts entries without calling addDependency/link', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, { dryRun: true });

    expect(result.installed).toBe(1);
    expect(entry.adapter.addDependency).not.toHaveBeenCalled();
    expect(entry.adapter.link).not.toHaveBeenCalled();
  });

  it('records errors when link throws', async () => {
    const adapter = makeAdapter();
    (adapter.link as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('link failed'));
    const entry = makeEntry({ adapter });
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, {});

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('link failed');
    expect(result.installed).toBe(0);
  });

  it('passes isLocal to addDependency when set', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    await installDiscoveredEntries('/project', [entry], repo, { isLocal: true });

    expect(entry.adapter.addDependency).toHaveBeenCalledWith(
      '/project',
      'test-rule',
      repo.url,
      'test-rule',
      true,
    );
  });

  it('quiet mode suppresses logging without affecting behavior', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const entry = makeEntry();
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, { quiet: true });

    expect(result.installed).toBe(1);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('interactive mode installs when user answers yes', async () => {
    vi.mocked(readline.createInterface).mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('y')),
      close: vi.fn(),
    } as any);

    const entry = makeEntry();
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, { interactive: true });
    expect(result.installed).toBe(1);
  });

  it('interactive mode skips when user answers no', async () => {
    vi.mocked(readline.createInterface).mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('n')),
      close: vi.fn(),
    } as any);

    const entry = makeEntry();
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [entry], repo, { interactive: true });
    expect(result.skipped).toBe(1);
    expect(result.installed).toBe(0);
  });

  it('handles multiple entries with mixed success and failure', async () => {
    const goodEntry = makeEntry({ entryName: 'good-rule', sourceName: 'good-rule.mdc' });
    const badAdapter = makeAdapter();
    (badAdapter.link as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    const badEntry = makeEntry({ adapter: badAdapter, entryName: 'bad-rule', sourceName: 'bad-rule.mdc' });
    const repo = makeRepo();

    const result = await installDiscoveredEntries('/project', [goodEntry, badEntry], repo, {});

    expect(result.installed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});

// ----- handleAddAll -----

describe('handleAddAll', () => {
  it('returns zero counts when no entries discovered', async () => {
    const registry = makeRegistry([]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    const result = await handleAddAll('/project', repo, registry, {});

    expect(result.installed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('installs discovered entries end-to-end', async () => {
    const adapter = makeAdapter();
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    // Source dir exists with one file
    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['rule.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await handleAddAll('/project', repo, registry, {});

    expect(result.installed).toBe(1);
    expect(adapter.addDependency).toHaveBeenCalled();
    expect(adapter.link).toHaveBeenCalled();
  });

  it('passes tools/adapters/sourceDirOverrides to discoverAllEntries', async () => {
    const adapter = makeAdapter();
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await handleAddAll('/project', repo, registry, {
      tools: ['cursor'],
      adapters: ['cursor-rules'],
      sourceDirOverrides: { cursor: { rules: 'custom' } } as any,
    });

    // Verify filter was applied
    expect(registry.getByName).toHaveBeenCalledWith('cursor-rules');
  });

  it('dry-run mode shows what would be installed', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const adapter = makeAdapter();
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['rule.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await handleAddAll('/project', repo, registry, { dryRun: true });

    expect(result.installed).toBe(1);
    expect(adapter.addDependency).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('quiet mode suppresses discovery summary', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const registry = makeRegistry([]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await handleAddAll('/project', repo, registry, { quiet: true });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
