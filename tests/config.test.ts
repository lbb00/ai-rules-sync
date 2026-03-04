import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import * as configModule from '../src/config.js';
import fs from 'fs-extra';
import os from 'os';

// Mock fs-extra and os
vi.mock('fs-extra');
vi.mock('os', () => ({
  default: {
    homedir: () => '/mock/home'
  },
  homedir: () => '/mock/home'
}));

describe('Config Module', () => {
  const mockHomeDir = '/mock/home';
  const mockConfigDir = path.join(mockHomeDir, '.config', 'ai-rules-sync');
  const mockConfigFile = path.join(mockConfigDir, 'config.json');

  beforeEach(() => {
    vi.resetAllMocks();
    // os.homedir is mocked by factory to return mockHomeDir always
  });

  it('should return empty config if file does not exist', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false);

    const config = await configModule.getConfig();
    expect(config).toEqual({ repos: {} });
    expect(fs.pathExists).toHaveBeenCalledWith(mockConfigFile);
  });

  it('should return parsed config if file exists', async () => {
    const mockConfig = {
      currentRepo: 'default',
      repos: {
        default: { name: 'default', url: 'http://test.git', path: '/path' }
      }
    };
    vi.mocked(fs.pathExists).mockResolvedValue(true);
    vi.mocked(fs.readJson).mockResolvedValue(mockConfig);

    const config = await configModule.getConfig();
    expect(config).toEqual(mockConfig);
  });

  it('should save config correctly', async () => {
    vi.mocked(fs.pathExists).mockResolvedValue(false); // no existing config

    const newConfig = {
      currentRepo: 'new',
      repos: {
        new: { name: 'new', url: 'http://new.git', path: '/new/path' }
      }
    };

    await configModule.setConfig(newConfig);

    expect(fs.ensureDir).toHaveBeenCalledWith(mockConfigDir);
    expect(fs.writeJson).toHaveBeenCalledWith(
      mockConfigFile,
      expect.objectContaining(newConfig),
      { spaces: 2 }
    );
  });

});
