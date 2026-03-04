import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';
import { execa } from 'execa';
import { checkRepositories, updateRepositories } from '../commands/lifecycle.js';
import { getConfig, setConfig, getUserProjectConfig } from '../config.js';
import { getCombinedProjectConfig } from '../project-config.js';
import { cloneOrUpdateRepo } from '../git.js';
import { installAllUserEntries, installEntriesForAdapter } from '../commands/install.js';

vi.mock('execa', () => ({
  execa: vi.fn()
}));

vi.mock('../config.js', () => ({
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getReposBaseDir: vi.fn(() => '/tmp/repos'),
  getUserProjectConfig: vi.fn()
}));

vi.mock('../project-config.js', () => ({
  getCombinedProjectConfig: vi.fn()
}));

vi.mock('../git.js', () => ({
  cloneOrUpdateRepo: vi.fn()
}));

vi.mock('../commands/install.js', () => ({
  installAllUserEntries: vi.fn(),
  installEntriesForAdapter: vi.fn()
}));

vi.mock('../adapters/index.js', () => ({
  adapterRegistry: {
    all: vi.fn(() => [{
      name: 'cursor-rules',
      tool: 'cursor',
      subtype: 'rules',
      configPath: ['cursor', 'rules'],
      defaultSourceDir: '.cursor/rules'
    }])
  }
}));

describe('lifecycle check/update', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should detect update-available repositories', async () => {
    vi.mocked(getCombinedProjectConfig).mockResolvedValue({
      cursor: {
        rules: {
          react: 'https://example.com/rules.git'
        }
      }
    } as any);
    vi.mocked(getConfig).mockResolvedValue({
      currentRepo: 'rules',
      repos: {
        rules: {
          name: 'rules',
          url: 'https://example.com/rules.git',
          path: '/tmp/rules'
        }
      }
    } as any);

    vi.spyOn(fs, 'pathExists').mockImplementation(async (target: fs.PathLike) => {
      const value = String(target);
      return value === '/tmp/rules' || value === '/tmp/rules/.git';
    });

    const execaMock = vi.mocked(execa as any);
    execaMock.mockImplementation(async (_cmd: string, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t2' };
      throw new Error(`Unexpected git command: ${command}`);
    });

    const result = await checkRepositories({
      projectPath: '/tmp/project'
    });

    expect(result.total).toBe(1);
    expect(result.updateAvailable).toBe(1);
    expect(result.entries[0]).toMatchObject({
      repoUrl: 'https://example.com/rules.git',
      status: 'update-available',
      ahead: 0,
      behind: 2
    });
  });

  it('should preview updates in dry-run mode without pulling', async () => {
    vi.mocked(getCombinedProjectConfig).mockResolvedValue({
      cursor: {
        rules: {
          react: 'https://example.com/rules.git'
        }
      }
    } as any);
    vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);
    vi.mocked(getConfig).mockResolvedValue({
      currentRepo: 'rules',
      repos: {
        rules: {
          name: 'rules',
          url: 'https://example.com/rules.git',
          path: '/tmp/rules'
        }
      }
    } as any);

    vi.spyOn(fs, 'pathExists').mockImplementation(async (target: fs.PathLike) => {
      const value = String(target);
      return value === '/tmp/rules' || value === '/tmp/rules/.git';
    });

    const execaMock = vi.mocked(execa as any);
    execaMock.mockImplementation(async (_cmd: string, args: string[]) => {
      const command = args.join(' ');
      if (command === 'fetch --quiet') return { stdout: '' };
      if (command === 'rev-parse --short HEAD') return { stdout: 'abc1234' };
      if (command === 'rev-parse --abbrev-ref --symbolic-full-name @{u}') return { stdout: 'origin/main' };
      if (command === 'rev-list --left-right --count HEAD...@{u}') return { stdout: '0\t1' };
      throw new Error(`Unexpected git command: ${command}`);
    });

    const result = await updateRepositories({
      projectPath: '/tmp/project',
      dryRun: true
    });

    expect(result.dryRun).toBe(true);
    expect(result.total).toBe(1);
    expect(result.entries[0]).toMatchObject({
      repoUrl: 'https://example.com/rules.git',
      action: 'would-update'
    });
    expect(cloneOrUpdateRepo).not.toHaveBeenCalled();
    expect(setConfig).not.toHaveBeenCalled();
    expect(installAllUserEntries).not.toHaveBeenCalled();
    expect(installEntriesForAdapter).not.toHaveBeenCalled();
  });
});
