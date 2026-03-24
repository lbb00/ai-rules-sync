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
      ensureFile: vi.fn(async () => {}),
    },
  };
});

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

// Mock project-config
vi.mock('../project-config.js', () => ({
  getRepoSourceConfig: vi.fn(async () => ({})),
  getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
  addUserDependency: vi.fn(async () => {}),
}));

// Mock sync-engine
vi.mock('../sync-engine.js', () => ({
  importEntryNoCommit: vi.fn(async () => ({
    name: 'test-entry',
    sourceName: 'test-entry.mdc',
    targetName: 'test-entry.mdc',
    repoRelativePath: '.cursor/rules/test-entry.mdc',
  })),
}));

// Mock utils
vi.mock('../utils.js', () => ({
  addIgnoreEntry: vi.fn(async () => {}),
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
import { execa } from 'execa';
import readline from 'readline';
import { getRepoSourceConfig, getSourceDir, addUserDependency } from '../project-config.js';
import { importEntryNoCommit } from '../sync-engine.js';
import { addIgnoreEntry } from '../utils.js';
import {
  discoverProjectEntriesForAdapter,
  discoverAllProjectEntries,
  importDiscoveredEntries,
  handleImportAll,
  scanAdapterTargetDir,
  DiscoveredProjectEntry,
} from '../commands/import-all.js';

const mockedPathExists = vi.mocked(fs.pathExists);
const mockedReaddir = vi.mocked(fs.readdir);
const mockedLstat = vi.mocked(fs.lstat);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedExeca: any = vi.mocked(execa);
const mockedGetRepoSourceConfig = vi.mocked(getRepoSourceConfig);
const mockedGetSourceDir = vi.mocked(getSourceDir);
const mockedImportEntryNoCommit = vi.mocked(importEntryNoCommit);
const mockedAddIgnoreEntry = vi.mocked(addIgnoreEntry);
const mockedAddUserDependency = vi.mocked(addUserDependency);

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
  mockedGetRepoSourceConfig.mockResolvedValue({});
  mockedGetSourceDir.mockImplementation((_config, _tool, _subtype, defaultDir) => defaultDir);
  mockedImportEntryNoCommit.mockResolvedValue({
    name: 'test-entry',
    sourceName: 'test-entry.mdc',
    targetName: 'test-entry.mdc',
    repoRelativePath: '.cursor/rules/test-entry.mdc',
  });
  mockedExeca.mockResolvedValue({ stdout: '', stderr: '' } as any);
});

// ----- discoverProjectEntriesForAdapter -----

describe('discoverProjectEntriesForAdapter', () => {
  it('returns empty when target directory does not exist', async () => {
    const adapter = makeAdapter();
    const repo = makeRepo();
    mockedPathExists.mockResolvedValue(false as never);

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
    expect(result).toEqual([]);
  });

  it('discovers file-mode entries matching suffix', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    // pathExists: target dir yes, repo source check no
    mockedPathExists.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes('.cursor/rules') && !s.includes('test-repo')) return true as never;
      return false as never;
    });
    mockedReaddir.mockResolvedValue(['rule1.mdc', 'readme.txt', '.hidden.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);

    // .hidden filtered, readme.txt doesn't match suffix
    expect(result).toHaveLength(1);
    expect(result[0].entryName).toBe('rule1');
    expect(result[0].alreadyInRepo).toBe(false);
  });

  it('skips symlinks (already managed by ais)', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['linked.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => true,
    } as never);

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
    expect(result).toHaveLength(0);
  });

  it('discovers directory-mode entries', async () => {
    const adapter = makeAdapter({ mode: 'directory' });
    const repo = makeRepo();

    mockedPathExists.mockImplementation(async (p) => {
      const s = String(p);
      if (s.endsWith('.cursor/rules')) return true as never;
      return false as never;
    });
    mockedReaddir.mockResolvedValue(['my-dir', 'some-file.txt'] as never);
    mockedLstat.mockImplementation(async (p) => {
      const name = String(p).split('/').pop();
      return {
        isDirectory: () => name === 'my-dir',
        isSymbolicLink: () => false,
      } as never;
    });

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
    expect(result).toHaveLength(1);
    expect(result[0].entryName).toBe('my-dir');
    expect(result[0].isDirectory).toBe(true);
  });

  it('discovers hybrid-mode entries', async () => {
    const adapter = makeAdapter({
      mode: 'hybrid',
      hybridFileSuffixes: ['.md'],
    });
    const repo = makeRepo();

    mockedPathExists.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes('/project/')) return true as never;
      return false as never;
    });
    mockedReaddir.mockResolvedValue(['docs-dir', 'readme.md', 'skip.txt'] as never);
    mockedLstat.mockImplementation(async (p) => {
      const name = String(p).split('/').pop();
      return {
        isDirectory: () => name === 'docs-dir',
        isSymbolicLink: () => false,
      } as never;
    });

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
    expect(result).toHaveLength(2);
  });

  it('marks entries as alreadyInRepo when they exist in repo source', async () => {
    const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockResolvedValue(['existing.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
    expect(result).toHaveLength(1);
    expect(result[0].alreadyInRepo).toBe(true);
  });

  it('uses userTargetDir when isUser is true', async () => {
    const adapter = makeAdapter({ userTargetDir: '.config/cursor' });
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverProjectEntriesForAdapter(adapter, repo, '/project', true);

    // The function should scan the user target dir
    // Since pathExists returns false, result is empty, but we verify the code path ran
    expect(mockedPathExists).toHaveBeenCalled();
  });

  it('returns empty when readdir throws', async () => {
    const adapter = makeAdapter();
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockRejectedValue(new Error('EACCES'));

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
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

    const result = await discoverProjectEntriesForAdapter(adapter, repo, '/project', false);
    expect(result).toHaveLength(1);
  });
});

// ----- discoverAllProjectEntries -----

describe('discoverAllProjectEntries', () => {
  it('uses all adapters when no filter provided', async () => {
    const adapter1 = makeAdapter({ name: 'a' });
    const adapter2 = makeAdapter({ name: 'b' });
    const registry = makeRegistry([adapter1, adapter2]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverAllProjectEntries('/project', repo, registry);

    expect(registry.all).toHaveBeenCalled();
  });

  it('filters by adapter names', async () => {
    const adapter1 = makeAdapter({ name: 'adapter-a' });
    const registry = makeRegistry([adapter1]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverAllProjectEntries('/project', repo, registry, { adapters: ['adapter-a'] });

    expect(registry.getByName).toHaveBeenCalledWith('adapter-a');
  });

  it('passes user flag to discoverProjectEntriesForAdapter', async () => {
    const adapter = makeAdapter({ userTargetDir: '.config/cursor' });
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await discoverAllProjectEntries('/project', repo, registry, { user: true });

    // Verifies the code path ran (pathExists is called at minimum)
    expect(mockedPathExists).toHaveBeenCalled();
  });
});

// ----- importDiscoveredEntries -----

describe('importDiscoveredEntries', () => {
  function makeEntry(overrides: Partial<DiscoveredProjectEntry> = {}): DiscoveredProjectEntry {
    const adapter = makeAdapter();
    return {
      adapter,
      sourceName: 'test-rule.mdc',
      entryName: 'test-rule',
      sourcePath: '/project/.cursor/rules/test-rule.mdc',
      isDirectory: false,
      suffix: '.mdc',
      alreadyInRepo: false,
      ...overrides,
    };
  }

  it('imports entries and creates batch git commit', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    // git diff --cached --stat returns content (has staged changes)
    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    const result = await importDiscoveredEntries('/project', [entry], repo, {});

    expect(result.imported).toBe(1);
    expect(mockedImportEntryNoCommit).toHaveBeenCalled();
    // Verify git add was called
    expect(mockedExeca).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['add']),
      expect.objectContaining({ cwd: repo.path }),
    );
    // Verify git commit was called
    expect(mockedExeca).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['commit', '-m', expect.any(String)]),
      expect.objectContaining({ cwd: repo.path }),
    );
  });

  it('skips already-in-repo entries without force', async () => {
    const entry = makeEntry({ alreadyInRepo: true });
    const repo = makeRepo();

    const result = await importDiscoveredEntries('/project', [entry], repo, {});

    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
    expect(mockedImportEntryNoCommit).not.toHaveBeenCalled();
  });

  it('imports already-in-repo entries with force flag', async () => {
    const entry = makeEntry({ alreadyInRepo: true });
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    const result = await importDiscoveredEntries('/project', [entry], repo, { force: true });

    expect(result.imported).toBe(1);
    expect(mockedImportEntryNoCommit).toHaveBeenCalled();
  });

  it('dry-run mode counts entries without importing', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    const result = await importDiscoveredEntries('/project', [entry], repo, { dryRun: true });

    expect(result.imported).toBe(1);
    expect(mockedImportEntryNoCommit).not.toHaveBeenCalled();
    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it('records errors when importEntryNoCommit throws', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedImportEntryNoCommit.mockRejectedValue(new Error('import failed'));

    const result = await importDiscoveredEntries('/project', [entry], repo, {});

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('import failed');
    expect(result.imported).toBe(0);
  });

  it('pushes to remote when push option is true', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, { push: true });

    expect(mockedExeca).toHaveBeenCalledWith(
      'git',
      ['push'],
      expect.objectContaining({ cwd: repo.path }),
    );
  });

  it('does not push when push option is false', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, { push: false });

    const pushCalls = mockedExeca.mock.calls.filter(
      (call: any[]) => call[1] && (call[1] as string[])[0] === 'push'
    );
    expect(pushCalls).toHaveLength(0);
  });

  it('uses custom commit message when provided', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, {
      message: 'Custom commit message',
    });

    expect(mockedExeca).toHaveBeenCalledWith(
      'git',
      ['commit', '-m', 'Custom commit message'],
      expect.anything(),
    );
  });

  it('skips commit when no staged changes', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    // git diff --cached --stat returns empty (no staged changes)
    mockedExeca.mockResolvedValue({ stdout: '', stderr: '' } as any);

    await importDiscoveredEntries('/project', [entry], repo, {});

    const commitCalls = mockedExeca.mock.calls.filter(
      (call: any[]) => call[1] && (call[1] as string[])[0] === 'commit'
    );
    expect(commitCalls).toHaveLength(0);
  });

  it('registers user dependency when user option is true', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, { user: true });

    expect(mockedAddUserDependency).toHaveBeenCalled();
    expect(entry.adapter.addDependency).not.toHaveBeenCalled();
  });

  it('registers project dependency and adds gitignore when isLocal is false', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, {});

    expect(entry.adapter.addDependency).toHaveBeenCalled();
    expect(mockedAddIgnoreEntry).toHaveBeenCalled();
  });

  it('uses git info/exclude for local mode', async () => {
    const entry = makeEntry();
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(true as never);
    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, { isLocal: true });

    expect(entry.adapter.addDependency).toHaveBeenCalledWith(
      '/project',
      expect.any(String),
      expect.any(String),
      undefined,
      true,
    );
  });

  it('interactive mode skips when user answers no', async () => {
    vi.mocked(readline.createInterface).mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('n')),
      close: vi.fn(),
    } as any);

    const entry = makeEntry();
    const repo = makeRepo();

    const result = await importDiscoveredEntries('/project', [entry], repo, { interactive: true });
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('interactive mode imports when user answers yes', async () => {
    vi.mocked(readline.createInterface).mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('y')),
      close: vi.fn(),
    } as any);

    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    const result = await importDiscoveredEntries('/project', [entry], repo, { interactive: true });
    expect(result.imported).toBe(1);
  });

  it('quiet mode suppresses logging', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const entry = makeEntry();
    const repo = makeRepo();

    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    await importDiscoveredEntries('/project', [entry], repo, { quiet: true });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ----- handleImportAll -----

describe('handleImportAll', () => {
  it('returns zero counts when no entries discovered', async () => {
    const registry = makeRegistry([]);
    const repo = makeRepo();

    const result = await handleImportAll('/project', repo, registry, {});

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('imports discovered entries end-to-end', async () => {
    const adapter = makeAdapter();
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    // Target dir exists with one file
    mockedPathExists.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes('/project/')) return true as never;
      return false as never;
    });
    mockedReaddir.mockResolvedValue(['rule.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);
    mockedExeca.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args && args[0] === 'diff') {
        return { stdout: ' 1 file changed', stderr: '' } as any;
      }
      return { stdout: '', stderr: '' } as any;
    });

    const result = await handleImportAll('/project', repo, registry, {});

    expect(result.imported).toBe(1);
    expect(mockedImportEntryNoCommit).toHaveBeenCalled();
  });

  it('passes adapter filter options', async () => {
    const adapter = makeAdapter({ name: 'cursor-rules' });
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    mockedPathExists.mockResolvedValue(false as never);

    await handleImportAll('/project', repo, registry, { adapters: ['cursor-rules'] });

    expect(registry.getByName).toHaveBeenCalledWith('cursor-rules');
  });

  it('dry-run mode shows what would be imported', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const adapter = makeAdapter();
    const registry = makeRegistry([adapter]);
    const repo = makeRepo();

    mockedPathExists.mockImplementation(async (p) => {
      const s = String(p);
      if (s.includes('/project/')) return true as never;
      return false as never;
    });
    mockedReaddir.mockResolvedValue(['rule.mdc'] as never);
    mockedLstat.mockResolvedValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as never);

    const result = await handleImportAll('/project', repo, registry, { dryRun: true });

    expect(result.imported).toBe(1);
    expect(mockedImportEntryNoCommit).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('quiet mode suppresses discovery summary', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const registry = makeRegistry([]);
    const repo = makeRepo();

    await handleImportAll('/project', repo, registry, { quiet: true });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ----- scanAdapterTargetDir -----

describe('scanAdapterTargetDir', () => {
  it('returns empty array when target directory does not exist', async () => {
    const adapter = makeAdapter();
    mockedPathExists.mockResolvedValue(false as never);

    const result = await scanAdapterTargetDir(adapter, '/project', false);
    expect(result).toEqual([]);
  });

  it('returns empty array when readdir throws', async () => {
    const adapter = makeAdapter();
    mockedPathExists.mockResolvedValue(true as never);
    mockedReaddir.mockRejectedValue(new Error('EACCES'));

    const result = await scanAdapterTargetDir(adapter, '/project', false);
    expect(result).toEqual([]);
  });

  describe('file mode filtering', () => {
    it('includes files matching fileSuffixes and strips suffix for entryName', async () => {
      const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['rule1.mdc', 'readme.txt'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => false,
        isSymbolicLink: () => false,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);

      expect(result).toHaveLength(1);
      expect(result[0].sourceName).toBe('rule1.mdc');
      expect(result[0].entryName).toBe('rule1');
      expect(result[0].isDirectory).toBe(false);
      expect(result[0].suffix).toBe('.mdc');
    });

    it('excludes directories in file mode', async () => {
      const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['a-directory'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => true,
        isSymbolicLink: () => false,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);
      expect(result).toHaveLength(0);
    });

    it('excludes files with non-matching suffixes', async () => {
      const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['readme.txt', 'notes.md'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => false,
        isSymbolicLink: () => false,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);
      expect(result).toHaveLength(0);
    });
  });

  describe('directory mode filtering', () => {
    it('includes only directories', async () => {
      const adapter = makeAdapter({ mode: 'directory' });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['my-dir', 'some-file.txt'] as never);
      mockedLstat.mockImplementation(async (p) => {
        const name = String(p).split('/').pop();
        return {
          isDirectory: () => name === 'my-dir',
          isSymbolicLink: () => false,
        } as never;
      });

      const result = await scanAdapterTargetDir(adapter, '/project', false);

      expect(result).toHaveLength(1);
      expect(result[0].sourceName).toBe('my-dir');
      expect(result[0].entryName).toBe('my-dir');
      expect(result[0].isDirectory).toBe(true);
    });

    it('excludes files in directory mode', async () => {
      const adapter = makeAdapter({ mode: 'directory' });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['some-file.txt'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => false,
        isSymbolicLink: () => false,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);
      expect(result).toHaveLength(0);
    });
  });

  describe('hybrid mode filtering', () => {
    it('includes directories and files matching hybridFileSuffixes', async () => {
      const adapter = makeAdapter({
        mode: 'hybrid',
        hybridFileSuffixes: ['.md'],
      });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['docs-dir', 'readme.md', 'skip.txt'] as never);
      mockedLstat.mockImplementation(async (p) => {
        const name = String(p).split('/').pop();
        return {
          isDirectory: () => name === 'docs-dir',
          isSymbolicLink: () => false,
        } as never;
      });

      const result = await scanAdapterTargetDir(adapter, '/project', false);

      expect(result).toHaveLength(2);

      const dirEntry = result.find(e => e.sourceName === 'docs-dir');
      expect(dirEntry).toBeDefined();
      expect(dirEntry!.isDirectory).toBe(true);
      expect(dirEntry!.entryName).toBe('docs-dir');

      const fileEntry = result.find(e => e.sourceName === 'readme.md');
      expect(fileEntry).toBeDefined();
      expect(fileEntry!.isDirectory).toBe(false);
      expect(fileEntry!.entryName).toBe('readme');
      expect(fileEntry!.suffix).toBe('.md');
    });

    it('excludes files that do not match hybridFileSuffixes', async () => {
      const adapter = makeAdapter({
        mode: 'hybrid',
        hybridFileSuffixes: ['.md'],
      });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['skip.txt'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => false,
        isSymbolicLink: () => false,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);
      expect(result).toHaveLength(0);
    });
  });

  describe('hidden file and symlink exclusion', () => {
    it('excludes hidden files (names starting with .)', async () => {
      const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['.hidden.mdc', 'visible.mdc'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => false,
        isSymbolicLink: () => false,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);

      expect(result).toHaveLength(1);
      expect(result[0].sourceName).toBe('visible.mdc');
    });

    it('excludes symbolic links', async () => {
      const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });

      mockedPathExists.mockResolvedValue(true as never);
      mockedReaddir.mockResolvedValue(['linked.mdc'] as never);
      mockedLstat.mockResolvedValue({
        isDirectory: () => false,
        isSymbolicLink: () => true,
      } as never);

      const result = await scanAdapterTargetDir(adapter, '/project', false);
      expect(result).toHaveLength(0);
    });

    it('skips items that fail lstat', async () => {
      const adapter = makeAdapter({ mode: 'file', fileSuffixes: ['.mdc'] });

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

      const result = await scanAdapterTargetDir(adapter, '/project', false);
      expect(result).toHaveLength(1);
      expect(result[0].sourceName).toBe('good.mdc');
    });
  });

  describe('user-mode target directory resolution', () => {
    it('uses userTargetDir when isUser is true and userTargetDir is set', async () => {
      const adapter = makeAdapter({ targetDir: '.cursor/rules', userTargetDir: '.config/cursor' });

      mockedPathExists.mockResolvedValue(false as never);

      await scanAdapterTargetDir(adapter, '/project', true);

      // pathExists should be called with the user target dir
      expect(mockedPathExists).toHaveBeenCalledWith(
        expect.stringContaining('.config/cursor')
      );
    });

    it('falls back to targetDir when isUser is true but userTargetDir is not set', async () => {
      const adapter = makeAdapter({ targetDir: '.cursor/rules' });

      mockedPathExists.mockResolvedValue(false as never);

      await scanAdapterTargetDir(adapter, '/project', true);

      expect(mockedPathExists).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/rules')
      );
    });
  });
});
