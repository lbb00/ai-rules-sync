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
    ...overrides,
  };
}

describe('importEntry user-mode path fix', () => {
  let tmpDir: string;
  let repoDir: string;
  let userHomeDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-sync-engine-user-'));
    repoDir = path.join(tmpDir, 'repo');
    userHomeDir = path.join(tmpDir, 'home');

    // Set up repo with git dir and user source dir
    await fs.ensureDir(path.join(repoDir, '.git'));
    await fs.ensureDir(path.join(repoDir, '.claude', 'user'));

    // Set up user home with settings file
    await fs.ensureDir(path.join(userHomeDir, '.claude'));
    await fs.writeJson(path.join(userHomeDir, '.claude', 'settings.json'), { theme: 'dark' });
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.clearAllMocks();
  });

  it('8.2: skipIgnore=true with userTargetDir and userDefaultSourceDir uses user paths', async () => {
    const { execa } = await import('execa');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter();

    await importEntry(adapter, {
      projectPath: userHomeDir,
      name: 'settings.json',
      repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: true,
    });

    // importEntry should call git add with the userDefaultSourceDir-based path
    const execaCalls = vi.mocked(execa).mock.calls;
    const gitAddCall = execaCalls.find(call => call[0] === 'git' && Array.isArray(call[1]) && call[1][0] === 'add');
    expect(gitAddCall).toBeDefined();

    // The relative path should use userDefaultSourceDir (.claude/user/settings.json)
    const relativePath = (gitAddCall![1] as string[])[1] as string;
    expect(relativePath).toContain('.claude/user');
    expect(relativePath).toContain('settings.json');
  });

  it('8.3: skipIgnore=true but no userDefaultSourceDir falls back to defaultSourceDir', async () => {
    const { execa } = await import('execa');
    const { importEntry } = await import('../sync-engine.js');

    // Adapter without userDefaultSourceDir
    const adapter = makeAdapter({ userDefaultSourceDir: undefined });

    // Set up the default source dir in the repo
    await fs.ensureDir(path.join(repoDir, '.claude'));

    await importEntry(adapter, {
      projectPath: userHomeDir,
      name: 'settings.json',
      repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: true,
    });

    const execaCalls = vi.mocked(execa).mock.calls;
    const gitAddCall = execaCalls.find(call => call[0] === 'git' && Array.isArray(call[1]) && call[1][0] === 'add');
    expect(gitAddCall).toBeDefined();

    // Should use defaultSourceDir (.claude/settings.json)
    const relativePath = (gitAddCall![1] as string[])[1] as string;
    // Should NOT use userDefaultSourceDir (.claude/user)
    expect(relativePath).not.toContain('.claude/user');
    // Should use defaultSourceDir .claude
    expect(relativePath).toContain('settings.json');
  });

  it('8.4: skipIgnore=false uses non-user defaults (regression guard)', async () => {
    const { execa } = await import('execa');
    const { importEntry } = await import('../sync-engine.js');

    const adapter = makeAdapter();

    // Set up a project with a settings file in project targetDir (not user)
    const projectDir = path.join(tmpDir, 'project');
    await fs.ensureDir(path.join(projectDir, '.claude'));
    await fs.writeJson(path.join(projectDir, '.claude', 'settings.json'), { theme: 'light' });
    await fs.ensureDir(path.join(repoDir, '.claude'));

    await importEntry(adapter, {
      projectPath: projectDir,
      name: 'settings.json',
      repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
      skipIgnore: false,
    });

    const execaCalls = vi.mocked(execa).mock.calls;
    const gitAddCall = execaCalls.find(call => call[0] === 'git' && Array.isArray(call[1]) && call[1][0] === 'add');
    expect(gitAddCall).toBeDefined();

    const relativePath = (gitAddCall![1] as string[])[1] as string;
    // Should NOT use userDefaultSourceDir when skipIgnore=false
    expect(relativePath).not.toContain('.claude/user');
  });
});
