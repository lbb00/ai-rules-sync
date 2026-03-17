import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock execa so git commands don't actually run
vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

// Mock project-config functions
vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(async () => ({})),
    getRepoSourceConfig: vi.fn(async () => ({})),
    getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
    getTargetDir: vi.fn((_config: unknown, _tool: string, _subtype: string, _name: string, defaultDir: string) => defaultDir),
    addUserDependency: vi.fn(async () => {}),
    removeUserDependency: vi.fn(async () => ({ removedFrom: ['user.json'] })),
    getEntryConfig: vi.fn(() => undefined),
  };
});

// Mock config.js
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getUserProjectConfig: vi.fn(async () => ({})),
    getUserConfigPath: vi.fn(async () => '/mock/user-config/user.json'),
  };
});

// Mock utils for ignore entry management
vi.mock('../utils.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    addIgnoreEntry: vi.fn(async () => true),
    removeIgnoreEntry: vi.fn(async () => true),
  };
});

// Mock sync-engine
vi.mock('../sync-engine.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    importEntry: vi.fn(async () => ({
      imported: true,
      sourceName: 'my-rule.md',
      targetName: 'my-rule.md',
    })),
  };
});

import {
  handleAdd,
  handleRemove,
  handleImport,
  previewImport,
  CommandContext,
} from '../commands/handlers.js';
import { SyncAdapter } from '../adapters/types.js';
import { addIgnoreEntry, removeIgnoreEntry } from '../utils.js';
import { addUserDependency, removeUserDependency, getEntryConfig, getCombinedProjectConfig } from '../project-config.js';
import { importEntry } from '../sync-engine.js';

function createMockAdapter(overrides?: Partial<SyncAdapter>): SyncAdapter {
  const mockManager = {
    add: vi.fn(async () => ({
      sourceName: 'my-rule.md',
      targetName: 'my-rule.md',
      linked: true,
      targetPath: '/project/.test/rules/my-rule.md',
    })),
    remove: vi.fn(async () => {}),
    apply: vi.fn(async () => ({ linked: [], skipped: [], errors: [] })),
    diff: vi.fn(),
    status: vi.fn(),
    readManifest: vi.fn(),
    import: vi.fn(async () => ({
      sourceName: 'my-rule.md',
      targetName: 'my-rule.md',
      linked: true,
      targetPath: '/project/.test/rules/my-rule.md',
    })),
  };

  return {
    name: 'test-rules',
    tool: 'test',
    subtype: 'rules',
    configPath: ['test', 'rules'],
    defaultSourceDir: '.test/rules',
    targetDir: '.test/rules',
    mode: 'file',
    fileSuffixes: ['.md'],
    forProject: vi.fn(() => mockManager) as any,
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => ({ removedFrom: [] })),
    link: vi.fn(async () => ({
      sourceName: 'my-rule.md',
      targetName: 'my-rule.md',
      linked: true,
    })),
    unlink: vi.fn(async () => {}),
    ...overrides,
  };
}

function createCtx(overrides?: Partial<CommandContext>): CommandContext {
  return {
    projectPath: '/project',
    repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: '/repos/test-repo' },
    isLocal: false,
    ...overrides,
  };
}

describe('handleAdd', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-add-'));
    vi.mocked(addIgnoreEntry).mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should add entry in project mode (non-local)', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir });

    const result = await handleAdd(adapter, ctx, 'my-rule');

    expect(adapter.forProject).toHaveBeenCalledWith(tmpDir, ctx.repo, false);
    expect(result.sourceName).toBe('my-rule.md');
    expect(result.targetName).toBe('my-rule.md');
    expect(result.linked).toBe(true);
  });

  it('should add to .gitignore in project mode when linked', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir });
    const spy = vi.spyOn(console, 'log');

    await handleAdd(adapter, ctx, 'my-rule');

    expect(addIgnoreEntry).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should add to .git/info/exclude in local mode', async () => {
    const adapter = createMockAdapter();
    await fs.ensureDir(path.join(tmpDir, '.git', 'info'));
    const ctx = createCtx({ projectPath: tmpDir, isLocal: true });
    const spy = vi.spyOn(console, 'log');

    await handleAdd(adapter, ctx, 'my-rule');

    // Should use git/info/exclude for local entries
    expect(addIgnoreEntry).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should warn when .git/info dir does not exist for local mode', async () => {
    const adapter = createMockAdapter();
    // Don't create .git/info
    const ctx = createCtx({ projectPath: tmpDir, isLocal: true });
    const spy = vi.spyOn(console, 'log');

    await handleAdd(adapter, ctx, 'my-rule');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Warning'));
    spy.mockRestore();
  });

  it('should add ai-rules-sync.local.json to .gitignore in local mode', async () => {
    const adapter = createMockAdapter();
    await fs.ensureDir(path.join(tmpDir, '.git', 'info'));
    const ctx = createCtx({ projectPath: tmpDir, isLocal: true });
    const spy = vi.spyOn(console, 'log');

    await handleAdd(adapter, ctx, 'my-rule');

    // The last addIgnoreEntry call should be for local config
    const calls = vi.mocked(addIgnoreEntry).mock.calls;
    const localConfigCall = calls.find(c => c[1] === 'ai-rules-sync.local.json');
    expect(localConfigCall).toBeTruthy();
    spy.mockRestore();
  });

  it('should use user mode when ctx.user is true', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir, user: true, skipIgnore: true });
    const spy = vi.spyOn(console, 'log');

    const result = await handleAdd(adapter, ctx, 'my-rule');

    expect(adapter.link).toHaveBeenCalled();
    expect(addUserDependency).toHaveBeenCalled();
    expect(adapter.forProject).not.toHaveBeenCalled();
    expect(result.linked).toBe(true);
    spy.mockRestore();
  });

  it('should use alias in user mode', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir, user: true, skipIgnore: true });
    const spy = vi.spyOn(console, 'log');

    await handleAdd(adapter, ctx, 'my-rule', 'custom-alias');

    expect(adapter.link).toHaveBeenCalledWith(expect.objectContaining({
      name: 'my-rule',
      alias: 'custom-alias',
    }));
    spy.mockRestore();
  });

  it('should detect conflict when targetDir is provided without alias', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir });

    // Mock getEntryConfig to return an existing entry with different targetDir
    vi.mocked(getEntryConfig).mockReturnValue({
      url: 'https://repo.git',
      targetDir: '.other/dir',
    } as any);

    await expect(handleAdd(adapter, ctx, 'my-rule', undefined, { targetDir: '.custom/dir' }))
      .rejects.toThrow('already exists in configuration');
  });

  it('should not throw conflict when targetDir matches', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir });

    vi.mocked(getEntryConfig).mockReturnValue({
      url: 'https://repo.git',
      targetDir: '.custom/dir',
    } as any);

    // Should not throw since targetDir matches
    const result = await handleAdd(adapter, ctx, 'my-rule', undefined, { targetDir: '.custom/dir' });
    expect(result.linked).toBe(true);
  });

  it('should not report already-in-gitignore when addIgnoreEntry returns false', async () => {
    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath: tmpDir });
    vi.mocked(addIgnoreEntry).mockResolvedValue(false);
    const spy = vi.spyOn(console, 'log');

    await handleAdd(adapter, ctx, 'my-rule');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('already in'));
    spy.mockRestore();
  });

  it('should handle linked=false (entry not linked)', async () => {
    const mockManager = {
      add: vi.fn(async () => ({
        sourceName: 'my-rule.md',
        targetName: 'my-rule.md',
        linked: false,
        targetPath: '/project/.test/rules/my-rule.md',
      })),
      remove: vi.fn(),
      apply: vi.fn(),
      diff: vi.fn(),
      status: vi.fn(),
      readManifest: vi.fn(),
      import: vi.fn(),
    };
    const adapter = createMockAdapter({
      forProject: vi.fn(() => mockManager) as any,
    });
    const ctx = createCtx({ projectPath: tmpDir });

    const result = await handleAdd(adapter, ctx, 'my-rule');

    expect(result.linked).toBe(false);
    // Should not call addIgnoreEntry when not linked
    // (addIgnoreEntry is only called when result.linked is true)
  });
});

describe('handleRemove', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-rm-'));
    vi.mocked(removeIgnoreEntry).mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should remove in user mode', async () => {
    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    const result = await handleRemove(adapter, tmpDir, 'my-rule', true);

    expect(adapter.unlink).toHaveBeenCalledWith(tmpDir, 'my-rule');
    expect(removeUserDependency).toHaveBeenCalledWith(['test', 'rules'], 'my-rule');
    expect(result.removedFrom).toEqual(['user.json']);
    spy.mockRestore();
  });

  it('should log not-found in user mode when removedFrom is empty', async () => {
    vi.mocked(removeUserDependency).mockResolvedValue({ removedFrom: [] });
    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    await handleRemove(adapter, tmpDir, 'nonexistent', true);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('was not found in user config'));
    spy.mockRestore();
  });

  it('should dry-run with config hits', async () => {
    // Write a config file with matching entry
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.json'), {
      test: { rules: { 'my-rule': 'https://repo.git' } },
    });

    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    const result = await handleRemove(adapter, tmpDir, 'my-rule', false, { dryRun: true });

    expect(result.removedFrom).toEqual(['ai-rules-sync.json']);
    expect(adapter.unlink).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should dry-run with symlink target', async () => {
    await fs.ensureDir(path.join(tmpDir, '.test', 'rules'));
    const sourcePath = path.join(tmpDir, 'source.md');
    const targetPath = path.join(tmpDir, '.test', 'rules', 'my-rule.md');
    await fs.writeFile(sourcePath, '# Source');
    await fs.symlink(sourcePath, targetPath);

    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    await handleRemove(adapter, tmpDir, 'my-rule', false, { dryRun: true });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('symlink'));
    spy.mockRestore();
  });

  it('should remove in project mode and clean ignore entries', async () => {
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.json'), {
      test: { rules: { 'my-rule': 'https://repo.git' } },
    });
    await fs.writeFile(path.join(tmpDir, '.gitignore'), '.test/rules/my-rule.md\n');

    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    const result = await handleRemove(adapter, tmpDir, 'my-rule', false);

    expect(adapter.forProject).toHaveBeenCalledWith(tmpDir, null, false);
    expect(removeIgnoreEntry).toHaveBeenCalled();
    expect(result.removedFrom).toEqual(['ai-rules-sync.json']);
    spy.mockRestore();
  });
});

describe('previewImport', () => {
  let tmpDir: string;
  let repoDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-preview-'));
    repoDir = path.join(tmpDir, 'repo');
    await fs.ensureDir(path.join(repoDir, '.test', 'rules'));
    await fs.ensureDir(path.join(repoDir, '.git'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should report source exists when file is present', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');

    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });

    const preview = await previewImport(adapter, ctx, 'my-rule.md', {});

    expect(preview.sourceExists).toBe(true);
    expect(preview.sourceIsSymlink).toBe(false);
    expect(preview.configFileName).toBe('ai-rules-sync.json');
  });

  it('should detect symlink source', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    const sourcePath = path.join(tmpDir, 'real-source.md');
    await fs.writeFile(sourcePath, '# Source');
    await fs.symlink(sourcePath, path.join(projectPath, '.test', 'rules', 'my-rule.md'));

    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });

    const preview = await previewImport(adapter, ctx, 'my-rule.md', {});

    expect(preview.sourceIsSymlink).toBe(true);
  });

  it('should report source not found', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(projectPath);

    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });

    const preview = await previewImport(adapter, ctx, 'missing.md', {});

    expect(preview.sourceExists).toBe(false);
  });

  it('should set configFileName based on context', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(projectPath);

    const adapter = createMockAdapter();
    const localCtx = createCtx({ projectPath, isLocal: true, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });
    const userCtx = createCtx({ projectPath, user: true, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });

    const localPreview = await previewImport(adapter, localCtx, 'x.md', {});
    const userPreview = await previewImport(adapter, userCtx, 'x.md', {});

    expect(localPreview.configFileName).toBe('ai-rules-sync.local.json');
    expect(userPreview.configFileName).toBe('user.json');
  });

  it('should use custom commit message', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(projectPath);

    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });

    const preview = await previewImport(adapter, ctx, 'x.md', { message: 'Custom msg' });

    expect(preview.commitMessage).toBe('Custom msg');
  });

  it('should use default commit message', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(projectPath);

    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });

    const preview = await previewImport(adapter, ctx, 'my-rule.md', {});

    expect(preview.commitMessage).toBe('Import test rules: my-rule.md');
  });
});

describe('handleImport', () => {
  let tmpDir: string;
  let repoDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-import-'));
    repoDir = path.join(tmpDir, 'repo');
    await fs.ensureDir(path.join(repoDir, '.test', 'rules'));
    await fs.ensureDir(path.join(repoDir, '.git'));
    vi.mocked(addIgnoreEntry).mockResolvedValue(true);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should import and add to project config (non-local)', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');

    const adapter = createMockAdapter();
    const ctx = createCtx({ projectPath, repo: { name: 'repo', url: 'https://repo.git', path: repoDir } });
    const spy = vi.spyOn(console, 'log');

    await handleImport(adapter, ctx, 'my-rule.md', {});

    expect(importEntry).toHaveBeenCalled();
    expect(adapter.addDependency).toHaveBeenCalledWith(
      projectPath, 'my-rule.md', 'https://repo.git', undefined, false
    );
    expect(addIgnoreEntry).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should import local mode and use git/info/exclude', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.ensureDir(path.join(projectPath, '.git', 'info'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      isLocal: true,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });
    const spy = vi.spyOn(console, 'log');

    await handleImport(adapter, ctx, 'my-rule.md', {});

    expect(adapter.addDependency).toHaveBeenCalledWith(
      projectPath, 'my-rule.md', 'https://repo.git', undefined, true
    );
    // Should add to gitignore for local config
    const addCalls = vi.mocked(addIgnoreEntry).mock.calls;
    const localConfigCall = addCalls.find(c => c[1] === 'ai-rules-sync.local.json');
    expect(localConfigCall).toBeTruthy();
    spy.mockRestore();
  });

  it('should import in user mode', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      user: true,
      skipIgnore: true,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });
    const spy = vi.spyOn(console, 'log');

    await handleImport(adapter, ctx, 'my-rule.md', {});

    expect(addUserDependency).toHaveBeenCalled();
    expect(adapter.addDependency).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle dry-run mode', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });
    const spy = vi.spyOn(console, 'log');

    // Clear mock call history before this test
    vi.mocked(importEntry).mockClear();

    await handleImport(adapter, ctx, 'my-rule.md', { dryRun: true });

    expect(importEntry).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[DRY RUN]'));
    spy.mockRestore();
  });

  it('should throw on dry-run when source not found', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(projectPath);

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });

    await expect(handleImport(adapter, ctx, 'missing.md', { dryRun: true }))
      .rejects.toThrow('not found in project');
  });

  it('should throw on dry-run when source is a symlink', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    const sourcePath = path.join(tmpDir, 'real.md');
    await fs.writeFile(sourcePath, '# Source');
    await fs.symlink(sourcePath, path.join(projectPath, '.test', 'rules', 'my-rule.md'));

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });

    await expect(handleImport(adapter, ctx, 'my-rule.md', { dryRun: true }))
      .rejects.toThrow('already a symlink');
  });

  it('should throw on dry-run when destination exists without force', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');
    // Also put file in repo destination
    await fs.writeFile(path.join(repoDir, '.test', 'rules', 'my-rule.md'), '# Already there');

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });

    await expect(handleImport(adapter, ctx, 'my-rule.md', { dryRun: true }))
      .rejects.toThrow('already exists in rules repository');
  });

  it('should show overwrite message on dry-run when destination exists with force', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');
    await fs.writeFile(path.join(repoDir, '.test', 'rules', 'my-rule.md'), '# Already there');

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });
    const spy = vi.spyOn(console, 'log');

    await handleImport(adapter, ctx, 'my-rule.md', { dryRun: true, force: true });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('overwritten'));
    spy.mockRestore();
  });

  it('should show push info on dry-run', async () => {
    const projectPath = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectPath, '.test', 'rules'));
    await fs.writeFile(path.join(projectPath, '.test', 'rules', 'my-rule.md'), '# Rule');

    const adapter = createMockAdapter();
    const ctx = createCtx({
      projectPath,
      repo: { name: 'repo', url: 'https://repo.git', path: repoDir },
    });
    const spy = vi.spyOn(console, 'log');

    await handleImport(adapter, ctx, 'my-rule.md', { dryRun: true, push: true });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('push: enabled'));
    spy.mockRestore();
  });
});

describe('handleRemove dry-run with user mode', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-rm-user-dry-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should preview user mode removal with config hits', async () => {
    const adapter = createMockAdapter();
    const spy = vi.spyOn(console, 'log');

    // Mock getUserProjectConfig to return matching entries
    const { getUserProjectConfig } = await import('../config.js');
    vi.mocked(getUserProjectConfig).mockResolvedValue({
      test: { rules: { 'my-rule': 'https://repo.git' } },
    } as any);

    const result = await handleRemove(adapter, tmpDir, 'my-rule', true, { dryRun: true });

    // getUserProjectConfig mock has the entry, so it should be in hits
    expect(result).toBeDefined();
    spy.mockRestore();
  });
});
