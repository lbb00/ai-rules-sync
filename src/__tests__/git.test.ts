import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepoConfig } from '../config.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

// Mock fs-extra
vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...(actual.default as Record<string, unknown>),
      pathExists: vi.fn(async () => false),
      remove: vi.fn(async () => {}),
      ensureDir: vi.fn(async () => {}),
    },
  };
});

import { execa } from 'execa';
import fs from 'fs-extra';
import {
  isLocalRepo,
  stripUrlCredentials,
  getRemoteUrl,
  cloneOrUpdateRepo,
  runGitCommand,
} from '../git.js';

const mockedExeca = vi.mocked(execa);
const mockedPathExists = vi.mocked(fs.pathExists);
const mockedRemove = vi.mocked(fs.remove);
const mockedEnsureDir = vi.mocked(fs.ensureDir);

function makeRepo(overrides: Partial<RepoConfig> = {}): RepoConfig {
  return {
    url: 'https://github.com/user/repo.git',
    name: 'test-repo',
    path: '/tmp/repos/test-repo',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// --- isLocalRepo ---

describe('isLocalRepo', () => {
  it('returns true for absolute local path', () => {
    expect(isLocalRepo(makeRepo({ url: '/home/user/my-repo' }))).toBe(true);
  });

  it('returns true for tilde path', () => {
    expect(isLocalRepo(makeRepo({ url: '~/my-repo' }))).toBe(true);
  });

  it('returns false for HTTPS URL', () => {
    expect(isLocalRepo(makeRepo({ url: 'https://github.com/user/repo.git' }))).toBe(false);
  });

  it('returns false for SSH URL', () => {
    expect(isLocalRepo(makeRepo({ url: 'git@github.com:user/repo.git' }))).toBe(false);
  });

  it('returns false for HTTP URL', () => {
    expect(isLocalRepo(makeRepo({ url: 'http://github.com/user/repo.git' }))).toBe(false);
  });

  it('returns false for relative path without tilde', () => {
    expect(isLocalRepo(makeRepo({ url: 'relative/path' }))).toBe(false);
  });
});

// --- stripUrlCredentials ---

describe('stripUrlCredentials', () => {
  it('strips token from HTTPS URL', () => {
    expect(stripUrlCredentials('https://token@github.com/user/repo.git')).toBe(
      'https://github.com/user/repo.git'
    );
  });

  it('strips user:password from HTTPS URL', () => {
    expect(stripUrlCredentials('https://user:password@github.com/user/repo.git')).toBe(
      'https://github.com/user/repo.git'
    );
  });

  it('strips token from HTTP URL', () => {
    expect(stripUrlCredentials('http://token@github.com/user/repo.git')).toBe(
      'http://github.com/user/repo.git'
    );
  });

  it('returns SSH URL unchanged', () => {
    expect(stripUrlCredentials('git@github.com:user/repo.git')).toBe(
      'git@github.com:user/repo.git'
    );
  });

  it('returns clean HTTPS URL unchanged', () => {
    expect(stripUrlCredentials('https://github.com/user/repo.git')).toBe(
      'https://github.com/user/repo.git'
    );
  });

  it('returns non-URL string unchanged', () => {
    expect(stripUrlCredentials('/local/path')).toBe('/local/path');
  });

  it('returns empty string unchanged', () => {
    expect(stripUrlCredentials('')).toBe('');
  });
});

// --- getRemoteUrl ---

describe('getRemoteUrl', () => {
  it('returns stripped URL on success', async () => {
    mockedExeca.mockResolvedValueOnce({
      stdout: 'https://token@github.com/user/repo.git\n',
      stderr: '',
    } as any);

    const result = await getRemoteUrl('/some/repo');
    expect(result).toBe('https://github.com/user/repo.git');
    expect(mockedExeca).toHaveBeenCalledWith('git', ['remote', 'get-url', 'origin'], {
      cwd: '/some/repo',
    });
  });

  it('returns undefined when stdout is empty', async () => {
    mockedExeca.mockResolvedValueOnce({ stdout: '  ', stderr: '' } as any);
    const result = await getRemoteUrl('/some/repo');
    expect(result).toBeUndefined();
  });

  it('returns undefined on error', async () => {
    mockedExeca.mockRejectedValueOnce(new Error('not a git repo'));
    const result = await getRemoteUrl('/some/repo');
    expect(result).toBeUndefined();
  });
});

// --- cloneOrUpdateRepo ---

describe('cloneOrUpdateRepo', () => {
  describe('local repo', () => {
    const localRepo = makeRepo({ url: '/home/user/my-repo', path: '/home/user/my-repo' });

    it('throws if local path does not exist', async () => {
      mockedPathExists.mockResolvedValue(false as any);
      await expect(cloneOrUpdateRepo(localRepo)).rejects.toThrow(
        'Local repository path does not exist'
      );
    });

    it('does nothing if path exists but is not a git repo', async () => {
      mockedPathExists.mockImplementation(async (p) => {
        if (p === '/home/user/my-repo') return true as any;
        return false as any; // .git check
      });

      await cloneOrUpdateRepo(localRepo);
      expect(mockedExeca).not.toHaveBeenCalled();
    });

    it('pulls if path is a git repo with upstream', async () => {
      mockedPathExists.mockResolvedValue(true as any);
      mockedExeca.mockResolvedValue({ stdout: 'main', stderr: '' } as any);

      await cloneOrUpdateRepo(localRepo);

      expect(mockedExeca).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', '@{u}'],
        { cwd: '/home/user/my-repo' }
      );
      expect(mockedExeca).toHaveBeenCalledWith('git', ['pull'], {
        cwd: '/home/user/my-repo',
        stdio: 'inherit',
      });
    });

    it('skips pull if upstream check fails (no upstream)', async () => {
      mockedPathExists.mockResolvedValue(true as any);
      mockedExeca.mockRejectedValue(new Error('no upstream'));

      // Should not throw
      await cloneOrUpdateRepo(localRepo);
    });
  });

  describe('remote repo', () => {
    const remoteRepo = makeRepo({
      url: 'https://github.com/user/repo.git',
      path: '/tmp/repos/test-repo',
    });

    it('clones if repo dir does not exist', async () => {
      mockedPathExists.mockResolvedValue(false as any);
      mockedExeca.mockResolvedValue({ stdout: '', stderr: '' } as any);

      await cloneOrUpdateRepo(remoteRepo);

      expect(mockedEnsureDir).toHaveBeenCalledWith('/tmp/repos/test-repo');
      expect(mockedExeca).toHaveBeenCalledWith(
        'git',
        ['clone', 'https://github.com/user/repo.git', '.'],
        { cwd: '/tmp/repos/test-repo', stdio: 'inherit' }
      );
    });

    it('pulls if repo dir exists and is a git repo', async () => {
      mockedPathExists.mockResolvedValue(true as any);
      mockedExeca.mockResolvedValue({ stdout: 'main', stderr: '' } as any);

      await cloneOrUpdateRepo(remoteRepo);

      expect(mockedExeca).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--abbrev-ref', '@{u}'],
        { cwd: '/tmp/repos/test-repo' }
      );
      expect(mockedExeca).toHaveBeenCalledWith('git', ['pull'], {
        cwd: '/tmp/repos/test-repo',
        stdio: 'inherit',
      });
    });

    it('silently catches pull/upstream errors on existing git repo', async () => {
      mockedPathExists.mockResolvedValue(true as any);
      mockedExeca.mockRejectedValue(new Error('pull failed'));

      // Should not throw
      await cloneOrUpdateRepo(remoteRepo);
    });

    it('removes and re-clones if dir exists but is not a git repo', async () => {
      mockedPathExists.mockImplementation(async (p) => {
        if (typeof p === 'string' && p.endsWith('/.git')) return false as any;
        return true as any; // repoDir exists
      });
      mockedExeca.mockResolvedValue({ stdout: '', stderr: '' } as any);

      await cloneOrUpdateRepo(remoteRepo);

      expect(mockedRemove).toHaveBeenCalledWith('/tmp/repos/test-repo');
      expect(mockedEnsureDir).toHaveBeenCalledWith('/tmp/repos/test-repo');
      expect(mockedExeca).toHaveBeenCalledWith(
        'git',
        ['clone', 'https://github.com/user/repo.git', '.'],
        { cwd: '/tmp/repos/test-repo', stdio: 'inherit' }
      );
    });
  });
});

// --- runGitCommand ---

describe('runGitCommand', () => {
  it('runs git command in repo directory', async () => {
    mockedPathExists.mockResolvedValueOnce(true as any);
    mockedExeca.mockResolvedValueOnce({ stdout: '', stderr: '' } as any);

    await runGitCommand(['status'], '/tmp/repos/test-repo');

    expect(mockedExeca).toHaveBeenCalledWith('git', ['status'], {
      cwd: '/tmp/repos/test-repo',
      stdio: 'inherit',
    });
  });

  it('throws if repo path does not exist', async () => {
    mockedPathExists.mockResolvedValueOnce(false as any);

    await expect(runGitCommand(['status'], '/nonexistent')).rejects.toThrow(
      'Cursor rules repository not found at /nonexistent'
    );
  });

  it('propagates execa errors', async () => {
    mockedPathExists.mockResolvedValueOnce(true as any);
    mockedExeca.mockRejectedValueOnce(new Error('git failed'));

    await expect(runGitCommand(['push'], '/tmp/repos/test-repo')).rejects.toThrow(
      'git failed'
    );
  });
});
