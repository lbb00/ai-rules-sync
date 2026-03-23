import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import { execa } from 'execa';
import { checkRepositories, updateRepositories } from '../commands/lifecycle.js';
import { getConfig, setConfig, getUserProjectConfig } from '../config.js';
import { getCombinedProjectConfig } from '../project-config.js';
import { cloneOrUpdateRepo } from '../git.js';
import { installAllUserEntries, installEntriesForAdapter } from '../commands/install.js';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

vi.mock('../config.js', () => ({
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getReposBaseDir: vi.fn(() => '/tmp/repos'),
  getUserProjectConfig: vi.fn(),
}));

vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../project-config.js')>();
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(),
  };
});

vi.mock('../git.js', () => ({
  cloneOrUpdateRepo: vi.fn(),
}));

vi.mock('../commands/install.js', () => ({
  installAllUserEntries: vi.fn(),
  installEntriesForAdapter: vi.fn(),
}));

vi.mock('../adapters/index.js', () => ({
  adapterRegistry: {
    all: vi.fn(() => [
      {
        name: 'cursor-rules',
        tool: 'cursor',
        subtype: 'rules',
        configPath: ['cursor', 'rules'],
        defaultSourceDir: '.cursor/rules',
      },
    ]),
    register: vi.fn(),
  },
}));

const mockedExeca = vi.mocked(execa as any);
const mockedGetConfig = vi.mocked(getConfig);
const mockedSetConfig = vi.mocked(setConfig);
const mockedGetCombinedProjectConfig = vi.mocked(getCombinedProjectConfig);
const mockedGetUserProjectConfig = vi.mocked(getUserProjectConfig);
const mockedCloneOrUpdateRepo = vi.mocked(cloneOrUpdateRepo);
const mockedInstallAllUserEntries = vi.mocked(installAllUserEntries);
const mockedInstallEntriesForAdapter = vi.mocked(installEntriesForAdapter);

describe('lifecycle check/update coverage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---------- checkRepositories ----------

  it('reports not-configured when repo URL not in global config', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://unknown.com/repo.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({ repos: {} } as any);

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('not-configured');
  });

  it('reports missing-local when repo dir does not exist', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(false as never);

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('missing-local');
  });

  it('reports error when git fetch fails', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockRejectedValue(new Error('network error'));

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('error');
    expect(result.entries[0].message).toContain('network error');
  });

  it('reports no-upstream when branch has no tracking ref', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') throw new Error('no upstream');
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('no-upstream');
  });

  it('reports error when rev-list fails', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') throw new Error('count fail');
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('error');
    expect(result.entries[0].message).toContain('Failed to compare');
  });

  it('reports up-to-date when no diff', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('up-to-date');
    expect(result.updateAvailable).toBe(0);
  });

  it('reports ahead when local is ahead of upstream', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '3\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('ahead');
    expect(result.entries[0].ahead).toBe(3);
  });

  it('reports diverged when both ahead and behind', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '2\t3' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.entries[0].status).toBe('diverged');
    expect(result.updateAvailable).toBe(1);
  });

  it('skips fetch when fetch option is false', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') throw new Error('should not fetch');
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project', fetch: false });

    expect(result.entries[0].status).toBe('up-to-date');
  });

  it('filters repos by target name', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: {
        rules: {
          react: 'https://example.com/rules.git',
          vue: 'https://example.com/vue-rules.git',
        },
      },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
        'vue-rules': { name: 'vue-rules', url: 'https://example.com/vue-rules.git', path: '/tmp/vue-rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project', target: 'rules' });

    expect(result.total).toBe(1);
    expect(result.entries[0].repoUrl).toBe('https://example.com/rules.git');
  });

  it('filters repos by target URL', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project', target: 'https://example.com/rules.git' });

    expect(result.total).toBe(1);
  });

  it('throws when target does not match any repo', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    await expect(
      checkRepositories({ projectPath: '/tmp/project', target: 'nonexistent' })
    ).rejects.toThrow('not found');
  });

  it('uses user scope when user option is true', async () => {
    mockedGetUserProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project', user: true });

    expect(result.scope).toBe('user');
    expect(mockedGetUserProjectConfig).toHaveBeenCalled();
  });

  it('handles config entries with object values (url field)', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: {
        rules: {
          react: { url: 'https://example.com/rules.git', rule: 'react' },
        },
      },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await checkRepositories({ projectPath: '/tmp/project' });

    expect(result.total).toBe(1);
    expect(result.entries[0].repoUrl).toBe('https://example.com/rules.git');
  });

  // ---------- updateRepositories ----------

  it('marks error entries in update results', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    // Fetch fails -> error in check
    mockedExeca.mockRejectedValue(new Error('fetch error'));

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    expect(result.failed).toBe(1);
    expect(result.entries[0].action).toBe('error');
    expect(result.reinstalled).toBe(false);
  });

  it('reports unchanged when repo is up-to-date', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t0' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    expect(result.unchanged).toBe(1);
    expect(result.entries[0].action).toBe('unchanged');
  });

  it('actually updates and reinstalls when update is available', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    let callCount = 0;
    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') {
        callCount++;
        // First call (during check): old commit; second (after update): new commit
        return { stdout: callCount <= 2 ? 'old1234' : 'new5678' };
      }
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t2' };
      throw new Error(`Unexpected: ${command}`);
    });

    mockedCloneOrUpdateRepo.mockResolvedValue(undefined);
    mockedInstallEntriesForAdapter.mockResolvedValue(undefined);

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    expect(result.updated).toBe(1);
    expect(result.entries[0].action).toBe('updated');
    expect(result.reinstalled).toBe(true);
    expect(mockedCloneOrUpdateRepo).toHaveBeenCalled();
    expect(mockedInstallEntriesForAdapter).toHaveBeenCalled();
  });

  it('reports unchanged when commit does not change after update', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'same123' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t1' };
      throw new Error(`Unexpected: ${command}`);
    });

    mockedCloneOrUpdateRepo.mockResolvedValue(undefined);
    mockedInstallEntriesForAdapter.mockResolvedValue(undefined);

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    expect(result.unchanged).toBe(1);
    expect(result.entries[0].action).toBe('unchanged');
  });

  it('handles update error gracefully', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t2' };
      throw new Error(`Unexpected: ${command}`);
    });

    mockedCloneOrUpdateRepo.mockRejectedValue(new Error('clone failed'));

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    expect(result.failed).toBe(1);
    expect(result.entries[0].action).toBe('error');
    expect(result.entries[0].message).toContain('clone failed');
    expect(result.reinstalled).toBe(false);
  });

  it('uses user scope in update and reinstalls user entries', async () => {
    mockedGetUserProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    let callCount = 0;
    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') {
        callCount++;
        return { stdout: callCount <= 2 ? 'old' : 'new' };
      }
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t1' };
      throw new Error(`Unexpected: ${command}`);
    });

    mockedCloneOrUpdateRepo.mockResolvedValue(undefined);
    mockedInstallAllUserEntries.mockResolvedValue({ total: 1 });

    const result = await updateRepositories({ projectPath: '/tmp/project', user: true });

    expect(result.scope).toBe('user');
    expect(result.reinstalled).toBe(true);
    expect(mockedInstallAllUserEntries).toHaveBeenCalled();
  });

  it('dry-run with new unconfigured repo shows would-clone', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://new.com/new-repo.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({ repos: {} } as any);

    const result = await updateRepositories({ projectPath: '/tmp/project', dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.entries[0].action).toBe('would-clone');
    expect(mockedCloneOrUpdateRepo).not.toHaveBeenCalled();
  });

  it('dry-run skips reinstall and does not clone', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t1' };
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await updateRepositories({ projectPath: '/tmp/project', dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.entries[0].action).toBe('would-update');
    expect(mockedCloneOrUpdateRepo).not.toHaveBeenCalled();
    expect(result.reinstalled).toBe(false);
  });

  it('does not reinstall when all repos fail', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://example.com/rules.git' } },
    } as any);
    mockedGetConfig.mockResolvedValue({
      repos: {
        rules: { name: 'rules', url: 'https://example.com/rules.git', path: '/tmp/rules' },
      },
    } as any);

    vi.spyOn(fs, 'pathExists').mockResolvedValue(true as never);

    mockedExeca.mockRejectedValue(new Error('all fail'));

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    expect(result.reinstalled).toBe(false);
    expect(mockedInstallEntriesForAdapter).not.toHaveBeenCalled();
  });

  it('creates new repo config when url is not already registered during update', async () => {
    mockedGetCombinedProjectConfig.mockResolvedValue({
      cursor: { rules: { react: 'https://new.com/new-repo.git' } },
    } as any);

    // After setting config, subsequent get should show updated repos
    let reposConfigured = false;
    mockedGetConfig.mockImplementation(async () => {
      if (reposConfigured) {
        return {
          repos: {
            'new-repo': {
              name: 'new-repo',
              url: 'https://new.com/new-repo.git',
              path: '/tmp/repos/new-repo',
            },
          },
        } as any;
      }
      return { repos: {} } as any;
    });

    mockedSetConfig.mockImplementation(async () => {
      reposConfigured = true;
    });

    vi.spyOn(fs, 'pathExists').mockResolvedValue(false as never);
    mockedCloneOrUpdateRepo.mockResolvedValue(undefined);
    mockedInstallEntriesForAdapter.mockResolvedValue(undefined);

    let headCallCount = 0;
    mockedExeca.mockImplementation(async (_cmd: any, args: string[]) => {
      const command = args.join(' ');
      if (command === 'rev-parse --short HEAD') {
        headCallCount++;
        // Before update: undefined (no HEAD yet). After: new commit
        return { stdout: headCallCount <= 1 ? '' : 'new123' };
      }
      throw new Error(`Unexpected: ${command}`);
    });

    const result = await updateRepositories({ projectPath: '/tmp/project' });

    // The repo was missing, so it gets cloned and ensureRepoByUrl registers it
    expect(mockedSetConfig).toHaveBeenCalled();
    expect(mockedCloneOrUpdateRepo).toHaveBeenCalled();
    // It could be 'updated' (beforeCommit empty != afterCommit 'new123')
    // or 'unchanged' depending on shortHead behavior
    expect(['updated', 'unchanged']).toContain(result.entries[0].action);
  });
});

