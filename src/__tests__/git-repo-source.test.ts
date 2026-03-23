import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepoConfig } from '../config.js';

// Mock project-config.js
vi.mock('../project-config.js', () => ({
  getRepoSourceConfig: vi.fn(async () => ({})),
  getSourceDir: vi.fn(
    (_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir
  ),
  getSourceFileOverride: vi.fn(() => undefined),
  getSourceDirOverride: vi.fn(() => undefined),
  getTargetFileOverride: vi.fn(() => undefined),
  getTargetNameOverride: vi.fn(() => undefined),
}));

// Mock GitSource as a class
vi.mock('../dotany/sources/git.js', () => {
  return {
    GitSource: class MockGitSource {
      resolveFn = vi.fn(async (name: string) => ({ name, path: `/mock/source/${name}` }));
      destinationPathFn = vi.fn(async (name: string) => `/mock/dest/${name}`);
      constructor(public _url: string, public _cloneDir: string, public _subDir: string) {}
      async resolve(name: string) { return this.resolveFn(name); }
      async destinationPath(name: string) { return this.destinationPathFn(name); }
    },
  };
});

import {
  getRepoSourceConfig,
  getSourceDir,
  getSourceFileOverride,
  getSourceDirOverride,
  getTargetFileOverride,
  getTargetNameOverride,
} from '../project-config.js';
import { GitSource } from '../dotany/sources/git.js';
import { GitRepoSource, GitRepoSourceConfig } from '../plugin/git-repo-source.js';

const mockedGetRepoSourceConfig = vi.mocked(getRepoSourceConfig);
const mockedGetSourceDir = vi.mocked(getSourceDir);
const mockedGetSourceFileOverride = vi.mocked(getSourceFileOverride);
const mockedGetSourceDirOverride = vi.mocked(getSourceDirOverride);
const mockedGetTargetFileOverride = vi.mocked(getTargetFileOverride);
const mockedGetTargetNameOverride = vi.mocked(getTargetNameOverride);
const staticRepo: RepoConfig = {
  url: 'https://github.com/user/rules.git',
  name: 'my-rules',
  path: '/tmp/repos/my-rules',
};

const baseConfig: GitRepoSourceConfig = {
  tool: 'cursor',
  subtype: 'rules',
  defaultSourceDir: '.cursor/rules',
};

beforeEach(() => {
  vi.resetAllMocks();
  mockedGetRepoSourceConfig.mockResolvedValue({});
  mockedGetSourceDir.mockImplementation(
    (_config, _tool, _subtype, defaultDir) => defaultDir
  );
  mockedGetSourceFileOverride.mockReturnValue(undefined);
  mockedGetSourceDirOverride.mockReturnValue(undefined);
  mockedGetTargetFileOverride.mockReturnValue(undefined);
  mockedGetTargetNameOverride.mockReturnValue(undefined);
});

// --- resolve() ---

describe('GitRepoSource.resolve', () => {
  it('resolves with static repo (no resolveSource)', async () => {
    const source = new GitRepoSource(staticRepo, baseConfig);
    const result = await source.resolve('my-rule');

    expect(mockedGetRepoSourceConfig).toHaveBeenCalledWith('/tmp/repos/my-rules');
    expect(mockedGetSourceDir).toHaveBeenCalledWith(
      {},
      'cursor',
      'rules',
      '.cursor/rules'
    );
    expect(result).toEqual({ name: 'my-rule', path: '/mock/source/my-rule' });
  });

  it('resolves with static repo using resolveSource', async () => {
    const resolveSource = vi.fn(async () => ({
      sourceName: 'resolved-name',
      sourcePath: '/resolved/path',
      suffix: '.mdc',
    }));

    const source = new GitRepoSource(staticRepo, { ...baseConfig, resolveSource });
    const result = await source.resolve('my-rule');

    expect(resolveSource).toHaveBeenCalledWith(
      '/tmp/repos/my-rules',
      '.cursor/rules',
      'my-rule',
      { sourceFileOverride: undefined, sourceDirOverride: undefined }
    );
    expect(result).toEqual({
      name: 'resolved-name',
      path: '/resolved/path',
      suffix: '.mdc',
    });
  });

  it('sets targetName when targetFileOverride is present (with resolveSource)', async () => {
    mockedGetTargetFileOverride.mockReturnValue('custom-target.md');
    const resolveSource = vi.fn(async () => ({
      sourceName: 'src-name',
      sourcePath: '/src/path',
    }));

    const source = new GitRepoSource(staticRepo, { ...baseConfig, resolveSource });
    const result = await source.resolve('my-rule');

    expect(result.targetName).toBe('custom-target.md');
  });

  it('sets targetName when targetNameOverride is present (with resolveSource)', async () => {
    mockedGetTargetNameOverride.mockReturnValue('custom-dir-name');
    const resolveSource = vi.fn(async () => ({
      sourceName: 'src-name',
      sourcePath: '/src/path',
    }));

    const source = new GitRepoSource(staticRepo, { ...baseConfig, resolveSource });
    const result = await source.resolve('my-rule');

    expect(result.targetName).toBe('custom-dir-name');
  });

  it('prefers targetFileOverride over targetNameOverride (with resolveSource)', async () => {
    mockedGetTargetFileOverride.mockReturnValue('file-override');
    mockedGetTargetNameOverride.mockReturnValue('name-override');
    const resolveSource = vi.fn(async () => ({
      sourceName: 'src-name',
      sourcePath: '/src/path',
    }));

    const source = new GitRepoSource(staticRepo, { ...baseConfig, resolveSource });
    const result = await source.resolve('my-rule');

    expect(result.targetName).toBe('file-override');
  });

  it('uses sourceDirOverride as effectiveName (no resolveSource)', async () => {
    mockedGetSourceDirOverride.mockReturnValue('shared-rules');

    // Spy on GitSource prototype to verify args
    const resolveSpy = vi.spyOn(GitSource.prototype, 'resolve');

    const source = new GitRepoSource(staticRepo, baseConfig);
    await source.resolve('my-rule');

    // GitSource.resolve should be called with 'shared-rules' instead of 'my-rule'
    expect(resolveSpy).toHaveBeenCalledWith('shared-rules');
    resolveSpy.mockRestore();
  });

  it('sets targetName from targetNameOverride (no resolveSource)', async () => {
    mockedGetTargetNameOverride.mockReturnValue('renamed-dir');

    const source = new GitRepoSource(staticRepo, baseConfig);
    const result = await source.resolve('my-rule');

    expect(result.targetName).toBe('renamed-dir');
  });

  it('passes repoUrl through resolveConfig', async () => {
    const resolver = vi.fn(async (url: string) => ({
      ...staticRepo,
      url,
    }));

    const source = new GitRepoSource(resolver, baseConfig);
    await source.resolve('my-rule', { repoUrl: 'https://other.git' });

    expect(resolver).toHaveBeenCalledWith('https://other.git', 'my-rule');
  });
});

// --- resolve() with dynamic resolver ---

describe('GitRepoSource.resolve with dynamic resolver', () => {
  it('calls resolver function with repoUrl', async () => {
    const resolver = vi.fn(async () => staticRepo);
    const source = new GitRepoSource(resolver, baseConfig);

    await source.resolve('my-rule', { repoUrl: 'https://other.git' });

    expect(resolver).toHaveBeenCalledWith('https://other.git', 'my-rule');
  });

  it('throws if resolver used without repoUrl', async () => {
    const resolver = vi.fn(async () => staticRepo);
    const source = new GitRepoSource(resolver, baseConfig);

    await expect(source.resolve('my-rule')).rejects.toThrow(
      'repoUrl is required when using a repo resolver'
    );
  });
});

// --- resolve() with null repo ---

describe('GitRepoSource.resolve with null repo', () => {
  it('throws when repo is null', async () => {
    const source = new GitRepoSource(null, baseConfig);

    await expect(source.resolve('my-rule')).rejects.toThrow(
      'No repo configured for GitRepoSource'
    );
  });
});

// --- resolveFromManifest() ---

describe('GitRepoSource.resolveFromManifest', () => {
  it('resolves using manifest entry with repoUrl meta', async () => {
    const resolver = vi.fn(async () => staticRepo);
    const source = new GitRepoSource(resolver, baseConfig);

    const entry = {
      sourceName: 'manifest-rule',
      meta: { repoUrl: 'https://github.com/user/rules.git' },
    };

    const result = await source.resolveFromManifest(entry);

    expect(resolver).toHaveBeenCalledWith('https://github.com/user/rules.git', 'manifest-rule');
    expect(result).toEqual({ name: 'manifest-rule', path: '/mock/source/manifest-rule' });
  });

  it('resolves with static repo (no meta.repoUrl)', async () => {
    const source = new GitRepoSource(staticRepo, baseConfig);

    const entry = { sourceName: 'manifest-rule' };
    const result = await source.resolveFromManifest(entry);

    expect(result).toEqual({ name: 'manifest-rule', path: '/mock/source/manifest-rule' });
  });

  it('handles entry with meta but no repoUrl (static repo)', async () => {
    const source = new GitRepoSource(staticRepo, baseConfig);

    const entry = {
      sourceName: 'manifest-rule',
      meta: { someOtherField: 'value' },
    };

    const result = await source.resolveFromManifest(entry);
    expect(result).toEqual({ name: 'manifest-rule', path: '/mock/source/manifest-rule' });
  });
});

// --- destinationPath() ---

describe('GitRepoSource.destinationPath', () => {
  it('returns destination path using GitSource', async () => {
    const source = new GitRepoSource(staticRepo, baseConfig);

    const result = await source.destinationPath('my-rule');

    expect(mockedGetRepoSourceConfig).toHaveBeenCalledWith('/tmp/repos/my-rules');
    expect(result).toBe('/mock/dest/my-rule');
  });

  it('throws when repo is null', async () => {
    const source = new GitRepoSource(null, baseConfig);

    await expect(source.destinationPath('my-rule')).rejects.toThrow(
      'No repo configured for GitRepoSource'
    );
  });

  it('throws when resolver used without repoUrl', async () => {
    const resolver = vi.fn(async () => staticRepo);
    const source = new GitRepoSource(resolver, baseConfig);

    await expect(source.destinationPath('my-rule')).rejects.toThrow(
      'repoUrl is required when using a repo resolver'
    );
  });
});
