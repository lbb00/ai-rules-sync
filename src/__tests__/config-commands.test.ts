import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listRepos, showRepoConfig } from '../commands/config.js';
import { getConfig } from '../config.js';

vi.mock('../config.js', () => ({
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  getUserConfigPath: vi.fn()
}));

describe('config command query output', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should output JSON for listRepos with current repo marker', async () => {
    vi.mocked(getConfig).mockResolvedValue({
      currentRepo: 'company-rules',
      repos: {
        'company-rules': {
          name: 'company-rules',
          url: 'https://example.com/company.git',
          path: '/tmp/company-rules'
        },
        'personal-rules': {
          name: 'personal-rules',
          url: 'https://example.com/personal.git',
          path: '/tmp/personal-rules'
        }
      }
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listRepos({ json: true });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload.currentRepo).toBe('company-rules');
    expect(payload.repositories).toHaveLength(2);
    expect(payload.repositories[0]).toMatchObject({
      name: 'company-rules',
      isCurrent: true
    });
    expect(payload.repositories[1]).toMatchObject({
      name: 'personal-rules',
      isCurrent: false
    });
  });

  it('should output JSON for showRepoConfig', async () => {
    vi.mocked(getConfig).mockResolvedValue({
      currentRepo: 'company-rules',
      repos: {
        'company-rules': {
          name: 'company-rules',
          url: 'https://example.com/company.git',
          path: '/tmp/company-rules',
          sourceDir: {
            cursor: { rules: '.cursor/rules' }
          }
        }
      }
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await showRepoConfig('company-rules', { json: true });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      name: 'company-rules',
      url: 'https://example.com/company.git',
      path: '/tmp/company-rules',
      sourceDir: {
        cursor: { rules: '.cursor/rules' }
      }
    });
  });

  it('should throw for unknown repo in showRepoConfig', async () => {
    vi.mocked(getConfig).mockResolvedValue({
      currentRepo: undefined,
      repos: {}
    });

    await expect(showRepoConfig('missing', { json: true })).rejects.toThrow(
      'Repository "missing" not found'
    );
  });
});
