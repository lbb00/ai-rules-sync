import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncAdapter } from '../adapters/types.js';

// Mock execa to prevent real git calls
vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '', stderr: '' }))
}));

// Mock project-config to control path resolution
vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(async () => ({})),
    getRepoSourceConfig: vi.fn(async () => ({})),
    getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
    getTargetDir: vi.fn((_config: unknown, _tool: string, _subtype: string, _name: string, defaultDir: string) => defaultDir),
  };
});

function makeAdapter(overrides: Partial<SyncAdapter> = {}): SyncAdapter {
  return {
    name: 'cursor-rules',
    tool: 'cursor',
    subtype: 'rules',
    configPath: ['cursor', 'rules'] as [string, string],
    defaultSourceDir: '.cursor/rules',
    targetDir: '.cursor/rules',
    userTargetDir: undefined,
    userDefaultSourceDir: undefined,
    mode: 'directory',
    forProject: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      apply: vi.fn(),
      diff: vi.fn(),
      status: vi.fn(),
      readManifest: vi.fn(),
      import: vi.fn(async () => ({
        sourceName: 'my-rule',
        targetName: 'my-rule',
        linked: true,
        targetPath: '',
      })),
    })) as any,
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => ({ removedFrom: [] })),
    link: vi.fn(async () => ({ sourceName: 'my-rule', targetName: 'my-rule', linked: true })),
    unlink: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('linkEntry', () => {
  let tmpDir: string;
  let repoDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-sync-engine-'));
    repoDir = path.join(tmpDir, 'repo');
    projectDir = path.join(tmpDir, 'project');

    await fs.ensureDir(path.join(repoDir, '.git', 'info'));
    await fs.ensureDir(path.join(repoDir, '.cursor', 'rules'));
    await fs.ensureDir(path.join(projectDir, '.git', 'info'));
    await fs.writeFile(path.join(repoDir, '.cursor', 'rules', 'my-rule'), 'rule content');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.resetAllMocks();
  });

  it('uses default resolution when resolveSource is absent', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.linked).toBe(true);
    expect(result.sourceName).toBe('my-rule');
    expect(result.targetName).toBe('my-rule');
    const symlink = path.join(projectDir, '.cursor', 'rules', 'my-rule');
    expect(await fs.pathExists(symlink)).toBe(true);
    const stat = await fs.lstat(symlink);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it('throws when resolveSource is absent and source file does not exist', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    await expect(
      linkEntry(adapter, {
        projectPath: projectDir,
        name: 'nonexistent',
        repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      })
    ).rejects.toThrow('Entry "nonexistent" not found in repository.');
  });

  it('uses resolveSource when present', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const sourcePath = path.join(repoDir, '.cursor', 'rules', 'my-rule');
    const adapter = makeAdapter({
      resolveSource: vi.fn(async () => ({
        sourceName: 'my-rule-resolved',
        sourcePath,
        suffix: undefined,
      })),
    });

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.linked).toBe(true);
    expect(result.sourceName).toBe('my-rule-resolved');
  });

  it('uses resolveTargetName when present', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const sourcePath = path.join(repoDir, '.cursor', 'rules', 'my-rule');
    const adapter = makeAdapter({
      resolveSource: vi.fn(async () => ({
        sourceName: 'my-rule',
        sourcePath,
        suffix: '.mdc',
      })),
      resolveTargetName: vi.fn(() => 'my-rule.mdc'),
    });

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.targetName).toBe('my-rule.mdc');
    const vi_mock = adapter.resolveTargetName as ReturnType<typeof vi.fn>;
    expect(vi_mock).toHaveBeenCalledWith('my-rule', undefined, '.mdc');
  });

  it('falls back to alias when resolveTargetName is absent and alias is provided', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveTargetName: undefined, resolveSource: undefined });
    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      alias: 'my-alias',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.targetName).toBe('my-alias');
  });

  it('falls back to name when resolveTargetName is absent and no alias', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveTargetName: undefined, resolveSource: undefined });
    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.targetName).toBe('my-rule');
  });

  it('uses options.targetDir when provided (highest priority)', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    const customTarget = 'custom/target/dir';
    await fs.ensureDir(path.join(projectDir, customTarget));

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      targetDir: customTarget,
    });

    expect(result.linked).toBe(true);
    const symlink = path.join(projectDir, customTarget, 'my-rule');
    expect(await fs.pathExists(symlink)).toBe(true);
  });

  it('falls through to getCombinedProjectConfig when no options.targetDir', async () => {
    const { getCombinedProjectConfig, getTargetDir } = await import('../project-config.js');
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(vi.mocked(getCombinedProjectConfig)).toHaveBeenCalledWith(projectDir);
    expect(vi.mocked(getTargetDir)).toHaveBeenCalled();
  });

  it('falls back to adapter.targetDir when getCombinedProjectConfig throws', async () => {
    const { getCombinedProjectConfig } = await import('../project-config.js');
    const { linkEntry } = await import('../sync-engine.js');

    vi.mocked(getCombinedProjectConfig).mockRejectedValueOnce(new Error('config read error'));

    const adapter = makeAdapter({ resolveSource: undefined, targetDir: '.cursor/rules' });
    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.linked).toBe(true);
    // Should use adapter.targetDir as fallback
    const symlink = path.join(projectDir, '.cursor', 'rules', 'my-rule');
    expect(await fs.pathExists(symlink)).toBe(true);
  });

  it('uses userTargetDir when skipIgnore=true and adapter.userTargetDir is defined', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const userTargetDir = '.cursor/user-rules';
    const adapter = makeAdapter({
      resolveSource: undefined,
      userTargetDir,
    });

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: true,
    });

    expect(result.linked).toBe(true);
    const symlink = path.join(projectDir, userTargetDir, 'my-rule');
    expect(await fs.pathExists(symlink)).toBe(true);
  });

  it('does not use userTargetDir when skipIgnore=false', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      resolveSource: undefined,
      userTargetDir: '.cursor/user-rules',
      targetDir: '.cursor/rules',
    });

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: false,
    });

    expect(result.linked).toBe(true);
    // Should use targetDir, not userTargetDir
    const symlink = path.join(projectDir, '.cursor', 'rules', 'my-rule');
    expect(await fs.pathExists(symlink)).toBe(true);
    const userSymlink = path.join(projectDir, '.cursor', 'user-rules', 'my-rule');
    expect(await fs.pathExists(userSymlink)).toBe(false);
  });

  it('re-links when target already exists as a symlink', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    const targetDir = path.join(projectDir, '.cursor', 'rules');
    await fs.ensureDir(targetDir);
    // Create an existing symlink pointing somewhere else
    const existingTarget = path.join(tmpDir, 'old-source');
    await fs.writeFile(existingTarget, 'old');
    await fs.ensureSymlink(existingTarget, path.join(targetDir, 'my-rule'));

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.linked).toBe(true);
    // Should have replaced the symlink
    const newStat = await fs.lstat(path.join(targetDir, 'my-rule'));
    expect(newStat.isSymbolicLink()).toBe(true);
  });

  it('returns linked=false when target exists as a non-symlink file', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    const targetDir = path.join(projectDir, '.cursor', 'rules');
    await fs.ensureDir(targetDir);
    // Create a real file (not a symlink) at the target location
    await fs.writeFile(path.join(targetDir, 'my-rule'), 'existing file content');

    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.linked).toBe(false);
  });

  it('adds entry to .gitignore when skipIgnore=false and isLocal=false', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: false,
      isLocal: false,
    });

    expect(result.linked).toBe(true);
    const gitignore = path.join(projectDir, '.gitignore');
    expect(await fs.pathExists(gitignore)).toBe(true);
    const content = await fs.readFile(gitignore, 'utf-8');
    expect(content).toContain('.cursor/rules/my-rule');
  });

  it('adds entry to .git/info/exclude when skipIgnore=false and isLocal=true', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    // Create .git/info directory for the project
    await fs.ensureDir(path.join(projectDir, '.git', 'info'));

    const adapter = makeAdapter({ resolveSource: undefined });
    const result = await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: false,
      isLocal: true,
    });

    expect(result.linked).toBe(true);
    const excludeFile = path.join(projectDir, '.git', 'info', 'exclude');
    expect(await fs.pathExists(excludeFile)).toBe(true);
    const content = await fs.readFile(excludeFile, 'utf-8');
    expect(content).toContain('.cursor/rules/my-rule');
  });

  it('skips ignore management when skipIgnore=true', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({ resolveSource: undefined });
    await linkEntry(adapter, {
      projectPath: projectDir,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: true,
    });

    const gitignore = path.join(projectDir, '.gitignore');
    // .gitignore should not have been created / written
    if (await fs.pathExists(gitignore)) {
      const content = await fs.readFile(gitignore, 'utf-8');
      expect(content).not.toContain('my-rule');
    } else {
      expect(await fs.pathExists(gitignore)).toBe(false);
    }
  });

  it('logs warning and skips ignore when isLocal=true but .git/info dir does not exist', async () => {
    const { linkEntry } = await import('../sync-engine.js');

    // Do NOT create .git/info directory for projectDir
    const noGitProject = path.join(tmpDir, 'no-git-project');
    await fs.ensureDir(noGitProject);
    // No .git directory at all here

    const adapter = makeAdapter({ resolveSource: undefined });
    // Should not throw - it warns and returns
    const result = await linkEntry(adapter, {
      projectPath: noGitProject,
      name: 'my-rule',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: false,
      isLocal: true,
    });

    expect(result.linked).toBe(true);
  });
});

describe('unlinkEntry', () => {
  let tmpDir: string;
  let repoDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-unlink-'));
    repoDir = path.join(tmpDir, 'repo');
    projectDir = path.join(tmpDir, 'project');

    await fs.ensureDir(path.join(repoDir, '.git', 'info'));
    await fs.ensureDir(path.join(projectDir, '.git', 'info'));
    await fs.ensureDir(path.join(projectDir, '.cursor', 'rules'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.resetAllMocks();
  });

  it('removes file at direct path and removes from .gitignore', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    const targetFile = path.join(projectDir, '.cursor', 'rules', 'my-rule');
    await fs.writeFile(targetFile, 'content');

    // Set up .gitignore with the entry
    const gitignore = path.join(projectDir, '.gitignore');
    await fs.writeFile(gitignore, '.cursor/rules/my-rule\n');

    const adapter = makeAdapter({ resolveSource: undefined });
    await unlinkEntry(adapter, projectDir, 'my-rule');

    expect(await fs.pathExists(targetFile)).toBe(false);
    const content = await fs.readFile(gitignore, 'utf-8');
    expect(content).not.toContain('my-rule');
  });

  it('tries suffix variants when direct path does not exist', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    // Create file with suffix
    const targetFile = path.join(projectDir, '.cursor', 'rules', 'my-rule.md');
    await fs.writeFile(targetFile, 'content');

    const adapter = makeAdapter({
      resolveSource: undefined,
      fileSuffixes: ['.md'],
    });
    await unlinkEntry(adapter, projectDir, 'my-rule');

    expect(await fs.pathExists(targetFile)).toBe(false);
  });

  it('logs not found when neither direct path nor suffix variants exist', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const adapter = makeAdapter({ resolveSource: undefined });
    await unlinkEntry(adapter, projectDir, 'nonexistent');

    // Should have logged a "not found" message (not thrown)
    expect(consoleSpy).toHaveBeenCalled();
    const calls = consoleSpy.mock.calls.map(args => String(args[0]));
    const foundNotFoundMsg = calls.some(msg => msg.includes('not found') || msg.includes('nonexistent'));
    expect(foundNotFoundMsg).toBe(true);

    consoleSpy.mockRestore();
  });

  it('uses hybridFileSuffixes when fileSuffixes is absent', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    const targetFile = path.join(projectDir, '.cursor', 'rules', 'my-rule.instructions.md');
    await fs.writeFile(targetFile, 'content');

    const adapter = makeAdapter({
      resolveSource: undefined,
      fileSuffixes: undefined,
      hybridFileSuffixes: ['.instructions.md'],
    });
    await unlinkEntry(adapter, projectDir, 'my-rule');

    expect(await fs.pathExists(targetFile)).toBe(false);
  });

  it('removes from .git/info/exclude when present', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    const targetFile = path.join(projectDir, '.cursor', 'rules', 'my-rule');
    await fs.writeFile(targetFile, 'content');

    const excludeFile = path.join(projectDir, '.git', 'info', 'exclude');
    await fs.writeFile(excludeFile, '.cursor/rules/my-rule\n');

    const adapter = makeAdapter({ resolveSource: undefined });
    await unlinkEntry(adapter, projectDir, 'my-rule');

    const content = await fs.readFile(excludeFile, 'utf-8');
    expect(content).not.toContain('.cursor/rules/my-rule');
  });

  it('does not throw when .gitignore does not exist', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    const targetFile = path.join(projectDir, '.cursor', 'rules', 'my-rule');
    await fs.writeFile(targetFile, 'content');

    const adapter = makeAdapter({ resolveSource: undefined });
    // Should not throw even without .gitignore
    await expect(unlinkEntry(adapter, projectDir, 'my-rule')).resolves.toBeUndefined();
  });

  it('skips suffix that already ends with that suffix', async () => {
    const { unlinkEntry } = await import('../sync-engine.js');

    // File is named exactly "my-rule.md" and alias is "my-rule.md" (already has the suffix)
    const targetFile = path.join(projectDir, '.cursor', 'rules', 'my-rule.md');
    await fs.writeFile(targetFile, 'content');

    const adapter = makeAdapter({
      resolveSource: undefined,
      fileSuffixes: ['.md'],
    });
    // Alias already ends with .md, so the loop should skip that suffix
    await unlinkEntry(adapter, projectDir, 'my-rule.md');

    expect(await fs.pathExists(targetFile)).toBe(false);
  });
});

describe('importEntry push branch', () => {
  let tmpDir: string;
  let repoDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-import-push-'));
    repoDir = path.join(tmpDir, 'repo');
    projectDir = path.join(tmpDir, 'project');

    await fs.ensureDir(path.join(repoDir, '.git', 'info'));
    await fs.ensureDir(path.join(projectDir, '.claude'));
    await fs.writeJson(path.join(projectDir, '.claude', 'settings.json'), { theme: 'dark' });
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.resetAllMocks();
  });

  it('calls git push when push=true', async () => {
    const { execa } = await import('execa');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
    });

    await importEntry(adapter, {
      projectPath: projectDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      push: true,
    });

    const execaCalls = vi.mocked(execa).mock.calls;
    const gitPushCall = execaCalls.find(
      call => call[0] === 'git' && Array.isArray(call[1]) && call[1][0] === 'push'
    );
    expect(gitPushCall).toBeDefined();
  });

  it('does not call git push when push=false', async () => {
    const { execa } = await import('execa');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
    });

    await importEntry(adapter, {
      projectPath: projectDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      push: false,
    });

    const execaCalls = vi.mocked(execa).mock.calls;
    const gitPushCall = execaCalls.find(
      call => call[0] === 'git' && Array.isArray(call[1]) && call[1][0] === 'push'
    );
    expect(gitPushCall).toBeUndefined();
  });
});

describe('importEntryNoCommit', () => {
  let tmpDir: string;
  let repoDir: string;
  let projectDir: string;
  let userHomeDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-import-nocommit-'));
    repoDir = path.join(tmpDir, 'repo');
    projectDir = path.join(tmpDir, 'project');
    userHomeDir = path.join(tmpDir, 'home');

    await fs.ensureDir(path.join(repoDir, '.git', 'info'));
    await fs.ensureDir(path.join(repoDir, '.claude', 'user'));
    await fs.ensureDir(path.join(projectDir, '.claude'));
    await fs.ensureDir(path.join(userHomeDir, '.claude'));
    await fs.writeJson(path.join(projectDir, '.claude', 'settings.json'), { theme: 'light' });
    await fs.writeJson(path.join(userHomeDir, '.claude', 'settings.json'), { theme: 'dark' });
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.resetAllMocks();
  });

  it('skipIgnore=true with userTargetDir + userDefaultSourceDir returns correct repoRelativePath', async () => {
    const { importEntryNoCommit } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
      userTargetDir: '.claude',
      userDefaultSourceDir: '.claude/user',
    });

    const result = await importEntryNoCommit(adapter, {
      projectPath: userHomeDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: true,
    });

    expect(result.name).toBe('settings.json');
    expect(result.repoRelativePath).toContain('.claude/user');
    expect(result.repoRelativePath).toContain('settings.json');
  });

  it('skipIgnore=false uses defaultSourceDir (no userDefaultSourceDir)', async () => {
    const { importEntryNoCommit } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
      userTargetDir: '.claude',
      userDefaultSourceDir: '.claude/user',
    });

    const result = await importEntryNoCommit(adapter, {
      projectPath: projectDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: false,
    });

    expect(result.repoRelativePath).not.toContain('.claude/user');
    expect(result.repoRelativePath).toContain('settings.json');
  });

  it('skipIgnore=true but no userDefaultSourceDir falls back to defaultSourceDir', async () => {
    const { importEntryNoCommit } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
      userTargetDir: '.claude',
      userDefaultSourceDir: undefined,
    });

    const result = await importEntryNoCommit(adapter, {
      projectPath: userHomeDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: true,
    });

    expect(result.repoRelativePath).not.toContain('.claude/user');
    expect(result.repoRelativePath).toContain('settings.json');
  });

  it('returns sourceName and targetName from manager.import', async () => {
    const { importEntryNoCommit } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
      forProject: vi.fn(() => ({
        add: vi.fn(),
        remove: vi.fn(),
        apply: vi.fn(),
        diff: vi.fn(),
        status: vi.fn(),
        readManifest: vi.fn(),
        import: vi.fn(async () => ({
          sourceName: 'settings.json',
          targetName: 'settings-alias.json',
          linked: true,
          targetPath: '',
        })),
      })) as any,
    });

    const result = await importEntryNoCommit(adapter, {
      projectPath: projectDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    expect(result.sourceName).toBe('settings.json');
    expect(result.targetName).toBe('settings-alias.json');
  });

  it('no git commit is called', async () => {
    const { execa } = await import('execa');
    const { importEntryNoCommit } = await import('../sync-engine.js');

    const adapter = makeAdapter({
      tool: 'claude',
      subtype: 'settings',
      defaultSourceDir: '.claude',
      targetDir: '.claude',
    });

    await importEntryNoCommit(adapter, {
      projectPath: projectDir,
      name: 'settings.json',
      repo: { name: 'repo', url: 'https://github.com/test/repo.git', path: repoDir },
    });

    const execaCalls = vi.mocked(execa).mock.calls;
    const gitCommitCall = execaCalls.find(
      call => call[0] === 'git' && Array.isArray(call[1]) && call[1][0] === 'commit'
    );
    expect(gitCommitCall).toBeUndefined();
  });
});
