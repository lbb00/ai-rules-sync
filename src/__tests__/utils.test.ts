import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';
import path from 'path';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs-extra')>();
  return {
    ...actual,
    default: {
      ...actual,
      pathExists: vi.fn(),
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      appendFile: vi.fn(),
    },
  };
});

import fs from 'fs-extra';
import { isLocalPath, resolveLocalPath, addIgnoreEntry, removeIgnoreEntry } from '../utils.js';

const mockedFs = vi.mocked(fs);

describe('utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('isLocalPath', () => {
    it('should return true for absolute paths', () => {
      expect(isLocalPath('/home/user/repo')).toBe(true);
    });

    it('should return true for tilde paths', () => {
      expect(isLocalPath('~/my-repo')).toBe(true);
    });

    it('should return true for relative dot paths', () => {
      expect(isLocalPath('./local-repo')).toBe(true);
      expect(isLocalPath('../other-repo')).toBe(true);
    });

    it('should return false for HTTPS URLs', () => {
      expect(isLocalPath('https://github.com/user/repo.git')).toBe(false);
    });

    it('should return false for SSH URLs', () => {
      expect(isLocalPath('git@github.com:user/repo.git')).toBe(false);
    });

    it('should return false for other protocol URLs', () => {
      expect(isLocalPath('ssh://user@server/repo')).toBe(false);
    });

    it('should return false for bare .git names that are not absolute or tilde paths', () => {
      expect(isLocalPath('repo.git')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isLocalPath('')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isLocalPath(null as any)).toBe(false);
      expect(isLocalPath(undefined as any)).toBe(false);
    });

    it('should return true for absolute path ending with .git', () => {
      expect(isLocalPath('/home/user/repo.git')).toBe(true);
    });

    it('should return true for tilde path ending with .git', () => {
      expect(isLocalPath('~/repo.git')).toBe(true);
    });
  });

  describe('resolveLocalPath', () => {
    it('should expand tilde and return resolved path for existing directory', async () => {
      const expanded = path.join(os.homedir(), 'my-repo');
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const result = await resolveLocalPath('~/my-repo');
      expect(result).toBe(expanded);
    });

    it('should return null for non-existent path', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const result = await resolveLocalPath('/nonexistent/path');
      expect(result).toBeNull();
    });

    it('should return null for a file (not a directory)', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

      const result = await resolveLocalPath('/some/file.txt');
      expect(result).toBeNull();
    });

    it('should resolve relative path against cwd', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const result = await resolveLocalPath('./sub-dir', '/base');
      expect(result).toBe(path.resolve('/base', './sub-dir'));
    });

    it('should normalize absolute paths', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const result = await resolveLocalPath('/foo/bar/../baz');
      expect(result).toBe(path.normalize('/foo/baz'));
    });
  });

  describe('addIgnoreEntry', () => {
    it('should create ignore file with entry when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      mockedFs.appendFile.mockResolvedValue(undefined as never);

      const added = await addIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(added).toBe(true);
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        '/project/.gitignore',
        '.cursor/rules/foo\n'
      );
    });

    it('should add entry to existing file', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('node_modules\n' as never);
      mockedFs.appendFile.mockResolvedValue(undefined as never);

      const added = await addIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(added).toBe(true);
    });

    it('should not add duplicate entry', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('.cursor/rules/foo\n' as never);

      const added = await addIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(added).toBe(false);
      expect(mockedFs.appendFile).not.toHaveBeenCalled();
    });

    it('should add header if provided and not present', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      mockedFs.appendFile.mockResolvedValue(undefined as never);

      await addIgnoreEntry('/project/.gitignore', '.cursor/rules/foo', '# Cursor Rules');
      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        '/project/.gitignore',
        '# Cursor Rules\n.cursor/rules/foo\n'
      );
    });

    it('should not duplicate header if already present', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('# Cursor Rules\n' as never);
      mockedFs.appendFile.mockResolvedValue(undefined as never);

      await addIgnoreEntry('/project/.gitignore', '.cursor/rules/foo', '# Cursor Rules');
      const appended = mockedFs.appendFile.mock.calls[0][1] as string;
      expect(appended).not.toContain('# Cursor Rules');
      expect(appended).toContain('.cursor/rules/foo');
    });

    it('should add newline before content if file does not end with newline', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('node_modules' as never); // no trailing newline
      mockedFs.appendFile.mockResolvedValue(undefined as never);

      await addIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      const appended = mockedFs.appendFile.mock.calls[0][1] as string;
      expect(appended).toMatch(/^\n/);
    });
  });

  describe('removeIgnoreEntry', () => {
    it('should return false when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const removed = await removeIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(removed).toBe(false);
    });

    it('should remove entry from file', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('node_modules\n.cursor/rules/foo\ndist\n' as never);
      mockedFs.writeFile.mockResolvedValue(undefined as never);

      const removed = await removeIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(removed).toBe(true);
      const written = mockedFs.writeFile.mock.calls[0][1] as string;
      expect(written).not.toContain('.cursor/rules/foo');
      expect(written).toContain('node_modules');
      expect(written).toContain('dist');
    });

    it('should return false when entry is not in file', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('node_modules\ndist\n' as never);

      const removed = await removeIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(removed).toBe(false);
      expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });

    it('should match trimmed lines', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readFile.mockResolvedValue('  .cursor/rules/foo  \n' as never);
      mockedFs.writeFile.mockResolvedValue(undefined as never);

      const removed = await removeIgnoreEntry('/project/.gitignore', '.cursor/rules/foo');
      expect(removed).toBe(true);
    });
  });
});
