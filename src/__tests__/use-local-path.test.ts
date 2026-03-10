import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getConfig, setConfig } from '../config.js';
import { isLocalPath, resolveLocalPath } from '../utils.js';
import { isLocalRepo, stripUrlCredentials } from '../git.js';

describe('isLocalPath', () => {
  it('should return false for URLs', () => {
    expect(isLocalPath('https://github.com/org/repo.git')).toBe(false);
    expect(isLocalPath('git@github.com:org/repo.git')).toBe(false);
    expect(isLocalPath('ssh://git@host/repo')).toBe(false);
  });

  it('should return false for bare .git suffix (likely URL)', () => {
    expect(isLocalPath('repo.git')).toBe(false);
  });

  it('should return true for absolute paths', () => {
    expect(isLocalPath('/home/user/repo')).toBe(true);
    expect(isLocalPath('/tmp/repo')).toBe(true);
  });

  it('should return true for home-relative paths', () => {
    expect(isLocalPath('~/repo')).toBe(true);
    expect(isLocalPath('~/my-rules-repo')).toBe(true);
  });

  it('should return true for relative paths', () => {
    expect(isLocalPath('./repo')).toBe(true);
    expect(isLocalPath('../repo')).toBe(true);
  });
});

describe('resolveLocalPath', () => {
  it('should resolve and verify existing directory', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-resolve-'));
    const subDir = path.join(cwd, 'subdir');
    await fs.ensureDir(subDir);

    const resolved = await resolveLocalPath('./subdir', cwd);
    expect(resolved).toBe(subDir);

    const absResolved = await resolveLocalPath(cwd);
    expect(absResolved).toBe(cwd);
  });

  it('should return null for non-existent path', async () => {
    const resolved = await resolveLocalPath('/nonexistent/path/12345');
    expect(resolved).toBeNull();
  });

  it('should expand ~ to homedir', async () => {
    const inHome = path.join(os.homedir(), 'ais-test-dir');
    await fs.ensureDir(inHome);
    try {
      const resolved = await resolveLocalPath('~/ais-test-dir');
      expect(resolved).toBe(inHome);
    } finally {
      await fs.remove(inHome).catch(() => {});
    }
  });
});

describe('isLocalRepo', () => {
  it('should return true when url is a path', () => {
    expect(isLocalRepo({ name: 'x', url: '/home/user/repo', path: '/home/user/repo' })).toBe(true);
    expect(isLocalRepo({ name: 'x', url: '~/repo', path: '/home/user/repo' })).toBe(true);
  });

  it('should return false when url is a remote URL', () => {
    expect(isLocalRepo({ name: 'x', url: 'https://github.com/org/repo', path: '/tmp/repo' })).toBe(false);
    expect(isLocalRepo({ name: 'x', url: 'git@github.com:org/repo.git', path: '/tmp/repo' })).toBe(false);
  });
});

describe('stripUrlCredentials', () => {
  it('should strip credentials from https URL', () => {
    expect(stripUrlCredentials('https://token@github.com/org/repo.git')).toBe('https://github.com/org/repo.git');
    expect(stripUrlCredentials('https://user:pass@host/path')).toBe('https://host/path');
  });

  it('should leave git@ URLs unchanged', () => {
    expect(stripUrlCredentials('git@github.com:org/repo.git')).toBe('git@github.com:org/repo.git');
  });
});
