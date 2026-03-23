import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setRepoSourceDir,
  clearRepoSourceDir,
  showRepoConfig,
  listRepos,
  handleUserConfigShow,
  handleUserConfigSet,
  handleUserConfigReset,
} from '../commands/config.js';
import { getConfig, setConfig, getUserConfigPath } from '../config.js';

vi.mock('../config.js', () => ({
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getUserConfigPath: vi.fn(),
}));

// Mock chalk to passthrough
vi.mock('chalk', () => {
  const handler: ProxyHandler<object> = {
    get: () => new Proxy((s: string) => s, handler),
    apply: (_target, _thisArg, args) => args[0],
  };
  return { default: new Proxy({}, handler) };
});

const mockedGetConfig = vi.mocked(getConfig);
const mockedSetConfig = vi.mocked(setConfig);
const mockedGetUserConfigPath = vi.mocked(getUserConfigPath);

beforeEach(() => {
  vi.resetAllMocks();
  mockedSetConfig.mockResolvedValue(undefined);
});

// ---------- setRepoSourceDir ----------

describe('setRepoSourceDir', () => {
  it('sets sourceDir for tool.subtype on a repo', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': { name: 'my-repo', url: 'https://example.com/repo.git', path: '/tmp/repo' },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await setRepoSourceDir('my-repo', 'cursor.rules', 'custom/path');

    expect(mockedSetConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        repos: expect.objectContaining({
          'my-repo': expect.objectContaining({
            sourceDir: { cursor: { rules: 'custom/path' } },
          }),
        }),
      })
    );
    consoleSpy.mockRestore();
  });

  it('throws for unknown repo', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {} });

    await expect(setRepoSourceDir('unknown', 'cursor.rules', 'path')).rejects.toThrow('not found');
  });

  it('throws for invalid tool.subtype format', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': { name: 'my-repo', url: 'https://example.com/repo.git', path: '/tmp/repo' },
      },
    });

    await expect(setRepoSourceDir('my-repo', 'invalid', 'path')).rejects.toThrow('Invalid format');
  });

  it('preserves existing sourceDir entries when adding new', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': {
          name: 'my-repo',
          url: 'https://example.com/repo.git',
          path: '/tmp/repo',
          sourceDir: { cursor: { rules: 'existing/path' } },
        },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await setRepoSourceDir('my-repo', 'cursor.commands', 'commands/path');

    const savedConfig = mockedSetConfig.mock.calls[0][0] as any;
    expect(savedConfig.repos['my-repo'].sourceDir.cursor.rules).toBe('existing/path');
    expect(savedConfig.repos['my-repo'].sourceDir.cursor.commands).toBe('commands/path');
    consoleSpy.mockRestore();
  });
});

// ---------- clearRepoSourceDir ----------

describe('clearRepoSourceDir', () => {
  it('clears all sourceDir when no toolSubtype given', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': {
          name: 'my-repo',
          url: 'https://example.com/repo.git',
          path: '/tmp/repo',
          sourceDir: { cursor: { rules: 'path' } },
        },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await clearRepoSourceDir('my-repo');

    const savedConfig = mockedSetConfig.mock.calls[0][0] as any;
    expect(savedConfig.repos['my-repo'].sourceDir).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('clears specific tool.subtype sourceDir', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': {
          name: 'my-repo',
          url: 'https://example.com/repo.git',
          path: '/tmp/repo',
          sourceDir: { cursor: { rules: 'path', commands: 'cmd' } },
        },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await clearRepoSourceDir('my-repo', 'cursor.rules');

    const savedConfig = mockedSetConfig.mock.calls[0][0] as any;
    expect(savedConfig.repos['my-repo'].sourceDir.cursor.rules).toBeUndefined();
    expect(savedConfig.repos['my-repo'].sourceDir.cursor.commands).toBe('cmd');
    consoleSpy.mockRestore();
  });

  it('throws for unknown repo', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {} });

    await expect(clearRepoSourceDir('unknown')).rejects.toThrow('not found');
  });

  it('throws for invalid format', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': { name: 'my-repo', url: 'https://example.com/repo.git', path: '/tmp/repo' },
      },
    });

    await expect(clearRepoSourceDir('my-repo', 'invalid')).rejects.toThrow('Invalid format');
  });

  it('logs message when tool sourceDir does not exist', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': { name: 'my-repo', url: 'https://example.com/repo.git', path: '/tmp/repo' },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await clearRepoSourceDir('my-repo', 'cursor.rules');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    consoleSpy.mockRestore();
  });
});

// ---------- showRepoConfig ----------

describe('showRepoConfig', () => {
  it('shows repo config in text mode', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'my-repo': { name: 'my-repo', url: 'https://example.com/repo.git', path: '/tmp/repo' },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await showRepoConfig('my-repo');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('my-repo'));
    consoleSpy.mockRestore();
  });

  it('throws for unknown repo', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {} });

    await expect(showRepoConfig('unknown')).rejects.toThrow('not found');
  });
});

// ---------- listRepos ----------

describe('listRepos', () => {
  it('logs empty message when no repos configured', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {} });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listRepos();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No repositories configured'));
    consoleSpy.mockRestore();
  });

  it('lists repos in text mode with current marker', async () => {
    mockedGetConfig.mockResolvedValue({
      currentRepo: 'repo-a',
      repos: {
        'repo-a': { name: 'repo-a', url: 'https://a.git', path: '/tmp/a' },
        'repo-b': { name: 'repo-b', url: 'https://b.git', path: '/tmp/b' },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listRepos();

    const calls = consoleSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: string) => c.includes('repo-a'))).toBe(true);
    expect(calls.some((c: string) => c.includes('repo-b'))).toBe(true);
    consoleSpy.mockRestore();
  });

  it('lists repos with sourceDir in text mode', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'repo-a': {
          name: 'repo-a',
          url: 'https://a.git',
          path: '/tmp/a',
          sourceDir: { cursor: { rules: '.cursor/rules' } },
        },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listRepos();

    const calls = consoleSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: string) => c.includes('Source directories'))).toBe(true);
    expect(calls.some((c: string) => c.includes('cursor.rules'))).toBe(true);
    consoleSpy.mockRestore();
  });

  it('handles repos without sourceDir in text mode', async () => {
    mockedGetConfig.mockResolvedValue({
      repos: {
        'repo-a': { name: 'repo-a', url: 'https://a.git', path: '/tmp/a' },
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listRepos();

    const calls = consoleSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c: string) => c.includes('Source directories'))).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ---------- handleUserConfigShow ----------

describe('handleUserConfigShow', () => {
  it('shows default user config path', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {} });
    mockedGetUserConfigPath.mockResolvedValue('/home/user/.config/ai-rules-sync/user.json');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigShow();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('User config path'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('(default)'));
    consoleSpy.mockRestore();
  });

  it('shows custom user config path', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {}, userConfigPath: '~/custom.json' });
    mockedGetUserConfigPath.mockResolvedValue('/home/user/custom.json');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigShow();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('(custom)'));
    consoleSpy.mockRestore();
  });
});

// ---------- handleUserConfigSet ----------

describe('handleUserConfigSet', () => {
  it('stores path with tilde prefix', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigSet('~/custom/path.json');

    expect(mockedSetConfig).toHaveBeenCalledWith({ userConfigPath: '~/custom/path.json' });
    consoleSpy.mockRestore();
  });

  it('converts absolute homedir path to tilde-prefixed', async () => {
    const home = require('os').homedir();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigSet(`${home}/custom/path.json`);

    expect(mockedSetConfig).toHaveBeenCalledWith({ userConfigPath: '~/custom/path.json' });
    consoleSpy.mockRestore();
  });

  it('stores non-home path as-is', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigSet('/opt/config.json');

    expect(mockedSetConfig).toHaveBeenCalledWith({ userConfigPath: '/opt/config.json' });
    consoleSpy.mockRestore();
  });
});

// ---------- handleUserConfigReset ----------

describe('handleUserConfigReset', () => {
  it('resets custom path to default', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {}, userConfigPath: '~/custom.json' });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigReset();

    const savedArg = mockedSetConfig.mock.calls[0][0] as any;
    expect(savedArg.userConfigPath).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reset to default'));
    consoleSpy.mockRestore();
  });

  it('logs message when already at default', async () => {
    mockedGetConfig.mockResolvedValue({ repos: {} });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUserConfigReset();

    expect(mockedSetConfig).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already at default'));
    consoleSpy.mockRestore();
  });
});
