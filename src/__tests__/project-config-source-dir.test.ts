import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getRepoSourceConfig, getSourceDir } from '../project-config.js';
import type { ProjectConfig, RepoSourceConfig, SourceDirConfig } from '../project-config.js';

describe('project-config source directory resolution', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-config-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should prioritize global override over repo config in getSourceDir', () => {
    const repoConfig: RepoSourceConfig = {
      rootPath: 'repo-root',
      windsurf: {
        skills: '.windsurf/repo-skills'
      }
    };
    const override: SourceDirConfig = {
      windsurf: {
        skills: '.windsurf/override-skills'
      }
    };

    expect(getSourceDir(repoConfig, 'windsurf', 'skills', '.windsurf/skills', override)).toBe('.windsurf/override-skills');
    expect(getSourceDir(repoConfig, 'windsurf', 'skills', '.windsurf/skills')).toBe(path.join('repo-root', '.windsurf/repo-skills'));
    expect(getSourceDir({ rootPath: 'repo-root' }, 'windsurf', 'skills', '.windsurf/skills')).toBe(path.join('repo-root', '.windsurf/skills'));
  });

  it('should parse new sourceDir format from ai-rules-sync.json', async () => {
    const config: ProjectConfig = {
      rootPath: 'rules-root',
      sourceDir: {
        windsurf: {
          rules: '.windsurf/rules',
          skills: '.windsurf/skills'
        },
        cline: {
          rules: '.clinerules',
          skills: '.cline/skills'
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect(repoConfig.rootPath).toBe('rules-root');
    expect(repoConfig.windsurf?.rules).toBe('.windsurf/rules');
    expect(repoConfig.windsurf?.skills).toBe('.windsurf/skills');
    expect(repoConfig.cline?.rules).toBe('.clinerules');
    expect(repoConfig.cline?.skills).toBe('.cline/skills');
  });

  it('should parse legacy string-based source paths and ignore dependency objects', async () => {
    const config = {
      rootPath: 'legacy-root',
      cursor: {
        rules: {
          localAlias: 'https://example.com/repo.git'
        }
      },
      windsurf: {
        rules: '.windsurf/rules'
      },
      cline: {
        skills: '.cline/skills'
      },
      agentsMd: {
        file: 'agents-md'
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect(repoConfig.rootPath).toBe('legacy-root');
    expect(repoConfig.windsurf?.rules).toBe('.windsurf/rules');
    expect(repoConfig.cline?.skills).toBe('.cline/skills');
    expect(repoConfig.agentsMd?.file).toBe('agents-md');
    expect(repoConfig.cursor?.rules).toBeUndefined();
  });

  it('should return only rootPath when config only contains dependency objects', async () => {
    const config: ProjectConfig = {
      rootPath: 'project-root',
      cursor: {
        rules: {
          localAlias: 'https://example.com/repo.git'
        }
      },
      windsurf: {
        skills: {
          deploy: 'https://example.com/repo.git'
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect(repoConfig).toEqual({ rootPath: 'project-root' });
  });
});
