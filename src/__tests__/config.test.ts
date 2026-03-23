import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import os from 'os';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs-extra')>();
  return {
    ...actual,
    default: {
      ...actual,
      pathExists: vi.fn(),
      readJson: vi.fn(),
      writeJson: vi.fn(),
      ensureDir: vi.fn(),
    },
  };
});

import fs from 'fs-extra';
import { getConfig, setConfig, getReposBaseDir, getCurrentRepo, getUserConfigPath, getUserProjectConfig, saveUserProjectConfig } from '../config.js';

const mockedFs = vi.mocked(fs);

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ai-rules-sync');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

describe('config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getConfig', () => {
    it('should return default config when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const config = await getConfig();
      expect(config).toEqual({ repos: {} });
    });

    it('should read and return config from file', async () => {
      const storedConfig = { repos: { myRepo: { url: 'https://example.com', name: 'myRepo', path: '/tmp/repo' } }, currentRepo: 'myRepo' };
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue(storedConfig);
      const config = await getConfig();
      expect(config).toEqual({ repos: storedConfig.repos, currentRepo: 'myRepo' });
    });

    it('should return default config with repos when file has no repos field', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue({ currentRepo: 'test' });
      const config = await getConfig();
      expect(config.repos).toEqual({});
      expect(config.currentRepo).toBe('test');
    });

    it('should return default config on read error', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockRejectedValue(new Error('parse error'));
      const config = await getConfig();
      expect(config).toEqual({ repos: {} });
    });
  });

  describe('setConfig', () => {
    it('should merge with existing config and write', async () => {
      const existing = { repos: { r1: { url: 'u1', name: 'r1', path: '/p1' } } };
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue(existing);
      mockedFs.ensureDir.mockResolvedValue(undefined as never);
      mockedFs.writeJson.mockResolvedValue(undefined as never);

      await setConfig({ currentRepo: 'r1' });

      expect(mockedFs.ensureDir).toHaveBeenCalledWith(CONFIG_DIR);
      expect(mockedFs.writeJson).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.objectContaining({ currentRepo: 'r1', repos: existing.repos }),
        { spaces: 2 }
      );
    });

    it('should ensure repos object exists when not present in merged config', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      mockedFs.ensureDir.mockResolvedValue(undefined as never);
      mockedFs.writeJson.mockResolvedValue(undefined as never);

      await setConfig({ currentRepo: 'test' });

      const written = mockedFs.writeJson.mock.calls[0][1] as any;
      expect(written.repos).toEqual({});
    });
  });

  describe('getReposBaseDir', () => {
    it('should return the repos base directory path', () => {
      const result = getReposBaseDir();
      expect(result).toBe(path.join(CONFIG_DIR, 'repos'));
    });
  });

  describe('getCurrentRepo', () => {
    it('should return null when no current repo is set', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const result = await getCurrentRepo();
      expect(result).toBeNull();
    });

    it('should return null when currentRepo name does not match any repo', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue({
        currentRepo: 'nonexistent',
        repos: { myRepo: { url: 'u', name: 'myRepo', path: '/p' } },
      });
      const result = await getCurrentRepo();
      expect(result).toBeNull();
    });

    it('should return the repo config when currentRepo matches', async () => {
      const repoConfig = { url: 'https://example.com', name: 'myRepo', path: '/tmp/repo' };
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue({
        currentRepo: 'myRepo',
        repos: { myRepo: repoConfig },
      });
      const result = await getCurrentRepo();
      expect(result).toEqual(repoConfig);
    });
  });

  describe('getUserConfigPath', () => {
    it('should return default path when no custom path is configured', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      const result = await getUserConfigPath();
      expect(result).toBe(path.join(CONFIG_DIR, 'user.json'));
    });

    it('should expand tilde in custom path', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue({
        repos: {},
        userConfigPath: '~/custom/user.json',
      });
      const result = await getUserConfigPath();
      expect(result).toBe(path.join(os.homedir(), 'custom/user.json'));
    });

    it('should return absolute custom path as-is', async () => {
      mockedFs.pathExists.mockResolvedValue(true as never);
      mockedFs.readJson.mockResolvedValue({
        repos: {},
        userConfigPath: '/absolute/path/user.json',
      });
      const result = await getUserConfigPath();
      expect(result).toBe('/absolute/path/user.json');
    });
  });

  describe('getUserProjectConfig', () => {
    it('should return empty object when user config file does not exist', async () => {
      // getConfig returns default (no userConfigPath), then pathExists on user.json returns false
      mockedFs.pathExists.mockResolvedValue(false as never);
      const result = await getUserProjectConfig();
      expect(result).toEqual({});
    });

    it('should return parsed config from user.json', async () => {
      const userConfig = { claude: { rules: { myRule: 'https://repo.git' } } };
      // First call: getConfig -> pathExists for config.json
      // Second call: pathExists for user.json
      mockedFs.pathExists
        .mockResolvedValueOnce(false as never) // config.json doesn't exist
        .mockResolvedValueOnce(true as never);  // user.json exists
      mockedFs.readJson.mockResolvedValue(userConfig);
      const result = await getUserProjectConfig();
      expect(result).toEqual(userConfig);
    });

    it('should return empty object on parse error', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(false as never) // config.json
        .mockResolvedValueOnce(true as never);  // user.json exists
      mockedFs.readJson.mockRejectedValue(new Error('bad json'));
      const result = await getUserProjectConfig();
      expect(result).toEqual({});
    });
  });

  describe('saveUserProjectConfig', () => {
    it('should write config to user config path', async () => {
      mockedFs.pathExists.mockResolvedValue(false as never);
      mockedFs.ensureDir.mockResolvedValue(undefined as never);
      mockedFs.writeJson.mockResolvedValue(undefined as never);

      const projectConfig = { claude: { rules: { test: 'https://repo.git' } } };
      await saveUserProjectConfig(projectConfig);

      const expectedPath = path.join(CONFIG_DIR, 'user.json');
      expect(mockedFs.ensureDir).toHaveBeenCalledWith(path.dirname(expectedPath));
      expect(mockedFs.writeJson).toHaveBeenCalledWith(expectedPath, projectConfig, { spaces: 2 });
    });
  });
});
