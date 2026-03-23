import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs-extra')>();
  return {
    ...actual,
    default: {
      ...actual,
      pathExists: vi.fn(),
      readdir: vi.fn(),
    },
  };
});

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import fs from 'fs-extra';
import { execa } from 'execa';
import { FileSystemSource } from '../dotany/sources/filesystem.js';
import { GitSource } from '../dotany/sources/git.js';

const mockedFs = vi.mocked(fs);
const mockedExeca: any = vi.mocked(execa);

describe('FileSystemSource', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const sourceDir = '/repo/rules';

  describe('resolve', () => {
    it('should resolve a file that exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      const source = new FileSystemSource(sourceDir);
      const result = await source.resolve('my-rule');
      expect(result).toEqual({ name: 'my-rule', path: path.join(sourceDir, 'my-rule') });
    });

    it('should throw when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const source = new FileSystemSource(sourceDir);
      await expect(source.resolve('missing')).rejects.toThrow('not found');
    });
  });

  describe('list', () => {
    it('should return directory contents when source dir exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readdir.mockResolvedValue(['file1', 'file2'] as any);
      const source = new FileSystemSource(sourceDir);
      const result = await source.list();
      expect(result).toEqual(['file1', 'file2']);
    });

    it('should return empty array when source dir does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const source = new FileSystemSource(sourceDir);
      const result = await source.list();
      expect(result).toEqual([]);
    });
  });

  describe('destinationPath', () => {
    it('should return path joined with source dir', async () => {
      const source = new FileSystemSource(sourceDir);
      const result = await source.destinationPath('my-rule');
      expect(result).toBe(path.join(sourceDir, 'my-rule'));
    });
  });
});

describe('GitSource', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const repoUrl = 'https://github.com/user/repo.git';
  const cloneDir = '/tmp/cache/repo';
  const subDir = 'rules';

  describe('resolve', () => {
    it('should clone repo and resolve file', async () => {
      // ensureCloned: no .git dir exists, so it clones
      mockedFs.pathExists
        .mockResolvedValueOnce(false as never) // .git check
        .mockResolvedValueOnce(true as never); // file exists check
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      const result = await source.resolve('my-rule');

      expect(mockedExeca).toHaveBeenCalledWith('git', ['clone', repoUrl, cloneDir]);
      expect(result).toEqual({
        name: 'my-rule',
        path: path.join(cloneDir, subDir, 'my-rule'),
      });
    });

    it('should pull when repo is already cloned', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true as never) // .git exists
        .mockResolvedValueOnce(true as never); // file exists
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      await source.resolve('my-rule');

      expect(mockedExeca).toHaveBeenCalledWith('git', ['pull'], { cwd: cloneDir });
    });

    it('should throw when resolved file does not exist', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true as never)  // .git exists
        .mockResolvedValueOnce(false as never); // file does not exist
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      await expect(source.resolve('missing')).rejects.toThrow('not found');
    });

    it('should include subDir in error message when set', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never);
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      await expect(source.resolve('missing')).rejects.toThrow(subDir);
    });

    it('should use "/" in error message when no subDir', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true as never)
        .mockResolvedValueOnce(false as never);
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, '');
      await expect(source.resolve('missing')).rejects.toThrow('(/)');
    });

    it('should only clone once (idempotent ensureCloned)', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(false as never)  // .git check first time
        .mockResolvedValueOnce(true as never)   // file1 exists
        .mockResolvedValueOnce(true as never);  // file2 exists
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      await source.resolve('file1');
      await source.resolve('file2');

      // Only called once for clone
      expect(mockedExeca).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('should list files in subDir after cloning', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(false as never) // .git check
        .mockResolvedValueOnce(true as never); // subDir exists
      mockedFs.readdir.mockResolvedValue(['rule1', 'rule2'] as any);
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      const result = await source.list();
      expect(result).toEqual(['rule1', 'rule2']);
    });

    it('should return empty array when subDir does not exist', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(false as never) // .git check
        .mockResolvedValueOnce(false as never); // subDir does not exist
      mockedExeca.mockResolvedValue({} as any);

      const source = new GitSource(repoUrl, cloneDir, subDir);
      const result = await source.list();
      expect(result).toEqual([]);
    });
  });

  describe('destinationPath', () => {
    it('should return path joined with cloneDir and subDir', async () => {
      const source = new GitSource(repoUrl, cloneDir, subDir);
      const result = await source.destinationPath('my-rule');
      expect(result).toBe(path.join(cloneDir, subDir, 'my-rule'));
    });

    it('should use cloneDir root when no subDir', async () => {
      const source = new GitSource(repoUrl, cloneDir);
      const result = await source.destinationPath('my-rule');
      expect(result).toBe(path.join(cloneDir, 'my-rule'));
    });
  });
});
