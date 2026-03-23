import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { promises as nodeFs } from 'fs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DotfileManager } from '../dotany/manager.js';
import type { SourceResolver, ManifestStore, ManifestEntry, ResolvedSource } from '../dotany/types.js';

// Helper to create a temp dir for each test
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-mgr-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

function createMockSource(overrides: Partial<SourceResolver> = {}): SourceResolver {
  return {
    resolve: vi.fn(async (name: string): Promise<ResolvedSource> => {
      const sourcePath = path.join(tmpDir, 'source', name);
      return { name, path: sourcePath };
    }),
    ...overrides,
  };
}

function createMockManifest(initialEntries: Record<string, ManifestEntry> = {}): ManifestStore & {
  _entries: Record<string, ManifestEntry>;
} {
  const store = { ...initialEntries };
  return {
    _entries: store,
    readAll: vi.fn(async () => ({ ...store })),
    write: vi.fn(async (key: string, value: ManifestEntry) => {
      store[key] = value;
    }),
    delete: vi.fn(async (key: string) => {
      delete store[key];
    }),
  };
}

// ----- add() -----

describe('DotfileManager.add()', () => {
  it('creates symlink and returns linked=true', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.add('myfile');

    expect(result.linked).toBe(true);
    expect(result.sourceName).toBe('myfile');
    expect(result.targetName).toBe('myfile');

    const targetPath = path.join(tmpDir, 'target', 'myfile');
    const stat = await fs.lstat(targetPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it('uses alias as targetName when provided', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.add('myfile', { alias: 'custom-name' });

    expect(result.targetName).toBe('custom-name');
    expect(result.linked).toBe(true);
  });

  it('uses resolveTargetName when provided', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file.md'), 'content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'file.md',
        path: path.join(sourceDir, 'file.md'),
        suffix: '.md',
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      resolveTargetName: (name: string, alias?: string, suffix?: string) => {
        return `resolved-${alias || name}`;
      },
    });

    const result = await manager.add('file.md', { alias: 'myalias' });

    expect(result.targetName).toBe('resolved-myalias');
  });

  it('uses resolved.targetName when source provides one', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'AGENTS.md'), 'content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'AGENTS.md',
        path: path.join(sourceDir, 'AGENTS.md'),
        targetName: 'CLAUDE.md',
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      resolveTargetName: () => 'should-not-use',
    });

    const result = await manager.add('AGENTS.md');

    expect(result.targetName).toBe('CLAUDE.md');
  });

  it('returns linked=false when target is a real file (conflict)', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'source content');

    // Create a real file at target location
    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'myfile'), 'existing content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.add('myfile');

    expect(result.linked).toBe(false);
    consoleSpy.mockRestore();
  });

  it('writes to manifest when manifest is provided', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });
    const manifest = createMockManifest();

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    await manager.add('myfile', { repoUrl: 'https://example.com/repo.git' });

    expect(manifest.write).toHaveBeenCalledWith('myfile', {
      sourceName: 'myfile',
      meta: { repoUrl: 'https://example.com/repo.git', targetDir: undefined, alias: undefined },
    });
  });

  it('uses custom targetDir from options', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'default-target',
      targetRoot: tmpDir,
    });

    const result = await manager.add('myfile', { targetDir: 'custom-target' });

    expect(result.targetPath).toContain('custom-target');
    expect(result.linked).toBe(true);
  });
});

// ----- remove() -----

describe('DotfileManager.remove()', () => {
  it('removes a symlink and logs success', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    const targetPath = path.join(targetDir, 'myfile');
    await nodeFs.symlink(path.join(sourceDir, 'myfile'), targetPath);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await manager.remove('myfile');

    const exists = await fs.pathExists(targetPath);
    expect(exists).toBe(false);
    consoleSpy.mockRestore();
  });

  it('logs not-found when target does not exist', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await manager.remove('nonexistent');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    consoleSpy.mockRestore();
  });

  it('removes from manifest when manifest is provided', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink(path.join(sourceDir, 'myfile'), path.join(targetDir, 'myfile'));

    const manifest = createMockManifest({
      myfile: { sourceName: 'myfile', meta: {} },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    await manager.remove('myfile');

    expect(manifest.delete).toHaveBeenCalledWith('myfile');
    consoleSpy.mockRestore();
  });

  it('uses targetDir from manifest entry', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const customTarget = path.join(tmpDir, 'custom-dir');
    await fs.ensureDir(customTarget);
    await nodeFs.symlink(path.join(sourceDir, 'myfile'), path.join(customTarget, 'myfile'));

    const manifest = createMockManifest({
      myfile: { sourceName: 'myfile', meta: { targetDir: 'custom-dir' } },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    await manager.remove('myfile');

    const exists = await fs.pathExists(path.join(customTarget, 'myfile'));
    expect(exists).toBe(false);
    consoleSpy.mockRestore();
  });

  it('finds file with common suffix fallback', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile.md'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink(path.join(sourceDir, 'myfile.md'), path.join(targetDir, 'myfile.md'));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await manager.remove('myfile');

    const exists = await fs.pathExists(path.join(targetDir, 'myfile.md'));
    expect(exists).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ----- apply() -----

describe('DotfileManager.apply()', () => {
  it('throws when no manifest is provided', async () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.apply()).rejects.toThrow('apply() requires a manifest store');
  });

  it('links entries from manifest using resolveFromManifest', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const manifest = createMockManifest({
      myfile: { sourceName: 'myfile', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async (entry: ManifestEntry): Promise<ResolvedSource> => ({
        name: entry.sourceName,
        path: path.join(sourceDir, entry.sourceName),
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.apply();

    expect(result.linked).toHaveLength(1);
    expect(result.linked[0].linked).toBe(true);
    expect(result.skipped).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('falls back to add() when resolveFromManifest is not available', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const manifest = createMockManifest({
      myfile: { sourceName: 'myfile', meta: { repoUrl: 'https://example.com/repo.git' } },
    });

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.apply();

    expect(result.linked).toHaveLength(1);
    expect(result.linked[0].linked).toBe(true);
    consoleSpy.mockRestore();
  });

  it('skips entries that throw during resolution', async () => {
    const manifest = createMockManifest({
      broken: { sourceName: 'broken', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async () => {
        throw new Error('Source not available');
      }),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.apply();

    expect(result.linked).toHaveLength(0);
    expect(result.skipped).toEqual(['broken']);
    consoleSpy.mockRestore();
  });

  it('records conflict when target is a real file during apply', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    // Create a real file at the target
    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'myfile'), 'existing file');

    const manifest = createMockManifest({
      myfile: { sourceName: 'myfile', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async () => ({
        name: 'myfile',
        path: path.join(sourceDir, 'myfile'),
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.apply();

    expect(result.linked).toHaveLength(1);
    expect(result.linked[0].linked).toBe(false);
    consoleSpy.mockRestore();
  });

  it('uses resolveTargetName in apply with resolveFromManifest', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file.md'), 'content');

    const manifest = createMockManifest({
      customAlias: { sourceName: 'file.md', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async (entry: ManifestEntry): Promise<ResolvedSource> => ({
        name: entry.sourceName,
        path: path.join(sourceDir, entry.sourceName),
        suffix: '.md',
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
      resolveTargetName: (name: string, alias?: string, suffix?: string) => `prefixed-${alias || name}`,
    });

    const result = await manager.apply();

    expect(result.linked[0].targetName).toBe('prefixed-customAlias');
    consoleSpy.mockRestore();
  });

  it('uses entry.meta.targetDir in apply', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'myfile'), 'content');

    const manifest = createMockManifest({
      myfile: { sourceName: 'myfile', meta: { targetDir: 'custom-target' } },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async (entry: ManifestEntry): Promise<ResolvedSource> => ({
        name: entry.sourceName,
        path: path.join(sourceDir, entry.sourceName),
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.apply();

    expect(result.linked[0].targetPath).toContain('custom-target');
    consoleSpy.mockRestore();
  });
});

// ----- stow() / unstow() / restow() -----

describe('DotfileManager.stow()', () => {
  it('throws when source does not have list()', async () => {
    const source = createMockSource();
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.stow()).rejects.toThrow('stow() requires source to implement list()');
  });

  it('links all files from source.list()', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file1'), 'content1');
    await fs.writeFile(path.join(sourceDir, 'file2'), 'content2');

    const source = createMockSource({
      list: vi.fn(async () => ['file1', 'file2']),
      resolve: vi.fn(async (name: string) => ({
        name,
        path: path.join(sourceDir, name),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const results = await manager.stow();

    expect(results).toHaveLength(2);
    expect(results[0].linked).toBe(true);
    expect(results[1].linked).toBe(true);
  });
});

describe('DotfileManager.unstow()', () => {
  it('removes all manifest entries when manifest is provided', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file1'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink(path.join(sourceDir, 'file1'), path.join(targetDir, 'file1'));

    const manifest = createMockManifest({
      file1: { sourceName: 'file1', meta: {} },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    await manager.unstow();

    expect(manifest.delete).toHaveBeenCalledWith('file1');
    consoleSpy.mockRestore();
  });

  it('removes all listed files when no manifest but source has list()', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file1'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink(path.join(sourceDir, 'file1'), path.join(targetDir, 'file1'));

    const source = createMockSource({
      list: vi.fn(async () => ['file1']),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await manager.unstow();

    const exists = await fs.pathExists(path.join(targetDir, 'file1'));
    expect(exists).toBe(false);
  });

  it('throws when no manifest and no source.list()', async () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.unstow()).rejects.toThrow('unstow() requires either manifest or source.list()');
  });
});

describe('DotfileManager.restow()', () => {
  it('calls unstow then stow', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file1'), 'content');

    const source = createMockSource({
      list: vi.fn(async () => ['file1']),
      resolve: vi.fn(async (name: string) => ({
        name,
        path: path.join(sourceDir, name),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.restow();

    expect(result).toHaveLength(1);
    expect(result[0].linked).toBe(true);
  });
});

// ----- diff() -----

describe('DotfileManager.diff()', () => {
  it('throws when no manifest is provided', async () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.diff()).rejects.toThrow('diff() requires a manifest store');
  });

  it('detects entries needing creation', async () => {
    const manifest = createMockManifest({
      missing: { sourceName: 'missing', meta: {} },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toCreate).toEqual(['missing']);
    expect(result.toUpdate).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
  });

  it('detects conflicts (non-symlink at target)', async () => {
    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'realfile'), 'content');

    const manifest = createMockManifest({
      realfile: { sourceName: 'realfile', meta: {} },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toUpdate).toEqual(['realfile']);
  });

  it('detects stale symlinks (pointing to wrong source) using resolveFromManifest', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    // Symlink pointing to wrong source
    await nodeFs.symlink('/wrong/path', path.join(targetDir, 'file'));

    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async () => ({
        name: 'file',
        path: path.join(sourceDir, 'file'),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toUpdate).toEqual(['file']);
  });

  it('detects correct symlinks as up-to-date', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink(path.join(sourceDir, 'file'), path.join(targetDir, 'file'));

    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async () => ({
        name: 'file',
        path: path.join(sourceDir, 'file'),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toCreate).toHaveLength(0);
    expect(result.toUpdate).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
  });

  it('uses resolve() fallback when resolveFromManifest is unavailable', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    // Wrong symlink target
    await nodeFs.symlink('/wrong/path', path.join(targetDir, 'file'));

    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: { repoUrl: 'https://repo.git' } },
    });

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'file',
        path: path.join(sourceDir, 'file'),
      })),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toUpdate).toEqual(['file']);
  });

  it('handles resolve errors gracefully in diff', async () => {
    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink('/some/path', path.join(targetDir, 'file'));

    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: {} },
    });

    const source = createMockSource({
      resolveFromManifest: vi.fn(async () => {
        throw new Error('Resolution failed');
      }),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toUpdate).toEqual(['file']);
  });

  it('uses targetDir from manifest entry meta', async () => {
    const customTarget = path.join(tmpDir, 'custom-target');
    // No files at all, so it should be toCreate
    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: { targetDir: 'custom-target' } },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.diff();

    expect(result.toCreate).toEqual(['file']);
  });
});

// ----- status() -----

describe('DotfileManager.status()', () => {
  it('throws when no manifest is provided', async () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.status()).rejects.toThrow('status() requires a manifest store');
  });

  it('reports missing entries', async () => {
    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: {} },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.status();

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].status).toBe('missing');
  });

  it('reports linked entries', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await nodeFs.symlink(path.join(sourceDir, 'file'), path.join(targetDir, 'file'));

    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: {} },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.status();

    expect(result.entries[0].status).toBe('linked');
  });

  it('reports conflict for real files', async () => {
    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'file'), 'real content');

    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: {} },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.status();

    expect(result.entries[0].status).toBe('conflict');
  });

  it('uses targetDir from manifest entry meta', async () => {
    const manifest = createMockManifest({
      file: { sourceName: 'file', meta: { targetDir: 'custom-target' } },
    });

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.status();

    expect(result.entries[0].targetPath).toContain('custom-target');
    expect(result.entries[0].status).toBe('missing');
  });
});

// ----- import() -----

describe('DotfileManager.import()', () => {
  it('throws when file does not exist', async () => {
    const source = createMockSource({
      destinationPath: vi.fn(async (name: string) => path.join(tmpDir, 'dest', name)),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.import('/nonexistent/file', 'name')).rejects.toThrow('does not exist');
  });

  it('throws when file is already a symlink', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'orig'), 'content');
    const linkPath = path.join(tmpDir, 'link');
    await nodeFs.symlink(path.join(sourceDir, 'orig'), linkPath);

    const source = createMockSource({
      destinationPath: vi.fn(async (name: string) => path.join(tmpDir, 'dest', name)),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.import(linkPath, 'name')).rejects.toThrow('already a symlink');
  });

  it('throws when source does not implement destinationPath', async () => {
    const filePath = path.join(tmpDir, 'myfile');
    await fs.writeFile(filePath, 'content');

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.import(filePath, 'name')).rejects.toThrow('import() requires source to implement destinationPath()');
  });

  it('throws when destination already exists without force', async () => {
    const filePath = path.join(tmpDir, 'myfile');
    await fs.writeFile(filePath, 'content');

    const destDir = path.join(tmpDir, 'dest');
    await fs.ensureDir(destDir);
    await fs.writeFile(path.join(destDir, 'name'), 'existing');

    const source = createMockSource({
      destinationPath: vi.fn(async (name: string) => path.join(destDir, name)),
    });

    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    await expect(manager.import(filePath, 'name')).rejects.toThrow('already exists');
  });

  it('successfully imports file: copies, removes original, creates symlink', async () => {
    const filePath = path.join(tmpDir, 'myfile');
    await fs.writeFile(filePath, 'original content');

    const destDir = path.join(tmpDir, 'dest');

    const source = createMockSource({
      destinationPath: vi.fn(async (name: string) => path.join(destDir, name)),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.import(filePath, 'name');

    expect(result.linked).toBe(true);
    expect(result.sourceName).toBe('name');
    // Original should now be a symlink
    const stat = await fs.lstat(filePath);
    expect(stat.isSymbolicLink()).toBe(true);
    // Dest should have the file
    const destContent = await fs.readFile(path.join(destDir, 'name'), 'utf-8');
    expect(destContent).toBe('original content');
    consoleSpy.mockRestore();
  });

  it('overwrites destination when force=true', async () => {
    const filePath = path.join(tmpDir, 'myfile');
    await fs.writeFile(filePath, 'new content');

    const destDir = path.join(tmpDir, 'dest');
    await fs.ensureDir(destDir);
    await fs.writeFile(path.join(destDir, 'name'), 'old content');

    const source = createMockSource({
      destinationPath: vi.fn(async (name: string) => path.join(destDir, name)),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.import(filePath, 'name', { force: true });

    expect(result.linked).toBe(true);
    const destContent = await fs.readFile(path.join(destDir, 'name'), 'utf-8');
    expect(destContent).toBe('new content');
    consoleSpy.mockRestore();
  });

  it('writes to manifest when manifest is provided', async () => {
    const filePath = path.join(tmpDir, 'myfile');
    await fs.writeFile(filePath, 'content');

    const destDir = path.join(tmpDir, 'dest');
    const manifest = createMockManifest();

    const source = createMockSource({
      destinationPath: vi.fn(async (name: string) => path.join(destDir, name)),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    await manager.import(filePath, 'name', { alias: 'myalias', repoUrl: 'https://repo.git' });

    expect(manifest.write).toHaveBeenCalledWith('myalias', {
      sourceName: 'name',
      meta: { alias: 'myalias', repoUrl: 'https://repo.git' },
    });
    consoleSpy.mockRestore();
  });
});

// ----- readManifest() -----

describe('DotfileManager.readManifest()', () => {
  it('returns empty object when no manifest', async () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.readManifest();
    expect(result).toEqual({});
  });

  it('returns manifest entries when manifest is provided', async () => {
    const entries = { file: { sourceName: 'file', meta: {} } };
    const manifest = createMockManifest(entries);

    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: tmpDir,
      manifest,
    });

    const result = await manager.readManifest();
    expect(result).toEqual(entries);
  });
});

// ----- targetRoot / targetDir getters -----

describe('DotfileManager getters', () => {
  it('returns process.cwd() as targetRoot when not specified', () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
    });

    expect(manager.targetRoot).toBe(process.cwd());
  });

  it('returns configured targetRoot', () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: 'target',
      targetRoot: '/custom/root',
    });

    expect(manager.targetRoot).toBe('/custom/root');
  });

  it('returns configured targetDir', () => {
    const manager = new DotfileManager({
      name: 'test',
      source: createMockSource(),
      targetDir: '.cursor/rules',
    });

    expect(manager.targetDir).toBe('.cursor/rules');
  });
});

// ----- doLink edge cases -----

describe('DotfileManager doLink edge cases', () => {
  it('updates symlink when it points to a different source', async () => {
    const sourceDir = path.join(tmpDir, 'source');
    await fs.ensureDir(sourceDir);
    await fs.writeFile(path.join(sourceDir, 'file'), 'content');

    const targetDir = path.join(tmpDir, 'target');
    await fs.ensureDir(targetDir);
    // Create symlink pointing to old source
    await nodeFs.symlink('/old/source', path.join(targetDir, 'file'));

    const source = createMockSource({
      resolve: vi.fn(async () => ({
        name: 'file',
        path: path.join(sourceDir, 'file'),
      })),
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new DotfileManager({
      name: 'test',
      source,
      targetDir: 'target',
      targetRoot: tmpDir,
    });

    const result = await manager.add('file');

    expect(result.linked).toBe(true);
    // Verify symlink now resolves to correct source (linkany uses relative paths)
    const resolved = await fs.realpath(path.join(targetDir, 'file'));
    expect(resolved).toBe(await fs.realpath(path.join(sourceDir, 'file')));
    consoleSpy.mockRestore();
  });
});
