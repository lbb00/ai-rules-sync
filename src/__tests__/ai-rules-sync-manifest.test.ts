import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../project-config.js', () => ({
  getCombinedProjectConfig: vi.fn(),
  getConfigSectionWithFallback: vi.fn(),
  addDependencyGeneric: vi.fn(),
  removeDependencyGeneric: vi.fn(),
}));

import {
  getCombinedProjectConfig,
  getConfigSectionWithFallback,
  addDependencyGeneric,
  removeDependencyGeneric,
} from '../project-config.js';
import { AiRulesSyncManifest } from '../plugin/ai-rules-sync-manifest.js';

const mockedGetCombined = vi.mocked(getCombinedProjectConfig);
const mockedGetSection = vi.mocked(getConfigSectionWithFallback);
const mockedAddDep = vi.mocked(addDependencyGeneric);
const mockedRemoveDep = vi.mocked(removeDependencyGeneric);

describe('AiRulesSyncManifest', () => {
  const projectPath = '/project';
  const configPath = ['claude', 'rules'];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('readAll', () => {
    it('should return empty object when section is empty', async () => {
      mockedGetCombined.mockResolvedValue({});
      mockedGetSection.mockReturnValue({});

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      const result = await manifest.readAll();
      expect(result).toEqual({});
    });

    it('should convert string entries to manifest entries', async () => {
      mockedGetCombined.mockResolvedValue({});
      mockedGetSection.mockReturnValue({
        'my-rule': 'https://github.com/user/repo.git',
      });

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      const result = await manifest.readAll();
      expect(result).toEqual({
        'my-rule': {
          sourceName: 'my-rule',
          meta: { repoUrl: 'https://github.com/user/repo.git' },
        },
      });
    });

    it('should convert object entries with url to manifest entries', async () => {
      mockedGetCombined.mockResolvedValue({});
      mockedGetSection.mockReturnValue({
        'my-alias': { url: 'https://repo.git', rule: 'original-name', targetDir: 'custom/dir' },
      });

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      const result = await manifest.readAll();
      expect(result['my-alias']).toEqual({
        sourceName: 'original-name',
        meta: {
          repoUrl: 'https://repo.git',
          targetDir: 'custom/dir',
          alias: 'my-alias',
        },
      });
    });

    it('should use key as sourceName when rule equals key', async () => {
      mockedGetCombined.mockResolvedValue({});
      mockedGetSection.mockReturnValue({
        'my-rule': { url: 'https://repo.git', rule: 'my-rule' },
      });

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      const result = await manifest.readAll();
      // When rule === key, no alias field should be set
      expect(result['my-rule'].meta?.alias).toBeUndefined();
    });

    it('should use key as sourceName when no rule field', async () => {
      mockedGetCombined.mockResolvedValue({});
      mockedGetSection.mockReturnValue({
        'my-rule': { url: 'https://repo.git' },
      });

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      const result = await manifest.readAll();
      expect(result['my-rule'].sourceName).toBe('my-rule');
    });

    it('should pass correct configPath to getConfigSectionWithFallback', async () => {
      mockedGetCombined.mockResolvedValue({});
      mockedGetSection.mockReturnValue({});

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      await manifest.readAll();

      expect(mockedGetSection).toHaveBeenCalledWith({}, 'claude', 'rules');
    });
  });

  describe('write', () => {
    it('should call addDependencyGeneric with correct arguments', async () => {
      mockedAddDep.mockResolvedValue(undefined as any);

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      await manifest.write('my-rule', {
        sourceName: 'my-rule',
        meta: { repoUrl: 'https://repo.git' },
      });

      expect(mockedAddDep).toHaveBeenCalledWith(
        projectPath,
        configPath,
        'my-rule',
        'https://repo.git',
        undefined, // key === sourceName, no alias
        false,     // isLocal
        undefined  // targetDir
      );
    });

    it('should pass alias when key differs from sourceName', async () => {
      mockedAddDep.mockResolvedValue(undefined as any);

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      await manifest.write('my-alias', {
        sourceName: 'original-name',
        meta: { repoUrl: 'https://repo.git', alias: 'old-alias' },
      });

      expect(mockedAddDep).toHaveBeenCalledWith(
        projectPath,
        configPath,
        'original-name',
        'https://repo.git',
        'my-alias',  // key !== sourceName
        false,
        undefined
      );
    });

    it('should pass targetDir when present in meta', async () => {
      mockedAddDep.mockResolvedValue(undefined as any);

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      await manifest.write('my-rule', {
        sourceName: 'my-rule',
        meta: { repoUrl: 'https://repo.git', targetDir: 'custom/dir' },
      });

      expect(mockedAddDep).toHaveBeenCalledWith(
        projectPath,
        configPath,
        'my-rule',
        'https://repo.git',
        undefined,
        false,
        'custom/dir'
      );
    });

    it('should use isLocal=true when manifest is local', async () => {
      mockedAddDep.mockResolvedValue(undefined as any);

      const manifest = new AiRulesSyncManifest(projectPath, configPath, true);
      await manifest.write('my-rule', {
        sourceName: 'my-rule',
        meta: { repoUrl: 'https://repo.git' },
      });

      expect(mockedAddDep).toHaveBeenCalledWith(
        projectPath,
        configPath,
        'my-rule',
        'https://repo.git',
        undefined,
        true,  // isLocal
        undefined
      );
    });
  });

  describe('delete', () => {
    it('should call removeDependencyGeneric with correct arguments', async () => {
      mockedRemoveDep.mockResolvedValue({ removedFrom: ['ai-rules-sync.json'] });

      const manifest = new AiRulesSyncManifest(projectPath, configPath);
      await manifest.delete('my-rule');

      expect(mockedRemoveDep).toHaveBeenCalledWith(projectPath, configPath, 'my-rule');
    });
  });
});
