import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getRepoSourceConfig, getSourceDir, getSourceFileOverride, getSourceDirOverride, getTargetFileOverride, getTargetNameOverride } from '../project-config.js';
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

  it('should parse sourceDir object format with dir, sourceFile, targetFile', async () => {
    const config: ProjectConfig = {
      rootPath: 'rules-root',
      sourceDir: {
        claude: {
          md: { dir: 'common', sourceFile: 'AGENTS.md', targetFile: 'CLAUDE.md' }
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect(repoConfig.claude?.md).toEqual({ dir: 'common', sourceFile: 'AGENTS.md', targetFile: 'CLAUDE.md' });

    const sourceDir = getSourceDir(repoConfig, 'claude', 'md', '.claude');
    expect(sourceDir).toBe(path.join('rules-root', 'common'));

    expect(getSourceFileOverride(repoConfig, 'claude', 'md')).toBe('AGENTS.md');
    expect(getTargetFileOverride(repoConfig, 'claude', 'md')).toBe('CLAUDE.md');
  });

  it('should return undefined for overrides when sourceDir is string', async () => {
    const config: ProjectConfig = {
      sourceDir: {
        claude: { md: '.claude' }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });
    const repoConfig = await getRepoSourceConfig(tempDir);

    expect(getSourceFileOverride(repoConfig, 'claude', 'md')).toBeUndefined();
    expect(getTargetFileOverride(repoConfig, 'claude', 'md')).toBeUndefined();
  });

  it('should parse sourceDir object format with dir, sourceDir, targetName (directory mode)', async () => {
    const config: ProjectConfig = {
      rootPath: 'rules-root',
      sourceDir: {
        cursor: {
          rules: { dir: 'common', sourceDir: 'shared-rules', targetName: 'cursor-rules' }
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect(repoConfig.cursor?.rules).toEqual({ dir: 'common', sourceDir: 'shared-rules', targetName: 'cursor-rules' });

    const sourceDir = getSourceDir(repoConfig, 'cursor', 'rules', '.cursor/rules');
    expect(sourceDir).toBe(path.join('rules-root', 'common'));

    expect(getSourceDirOverride(repoConfig, 'cursor', 'rules')).toBe('shared-rules');
    expect(getTargetNameOverride(repoConfig, 'cursor', 'rules')).toBe('cursor-rules');
  });

  it('should return undefined for sourceDir/targetName overrides when not set', async () => {
    const config: ProjectConfig = {
      sourceDir: {
        cursor: { rules: { dir: 'common' } }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });
    const repoConfig = await getRepoSourceConfig(tempDir);

    expect(getSourceDirOverride(repoConfig, 'cursor', 'rules')).toBeUndefined();
    expect(getTargetNameOverride(repoConfig, 'cursor', 'rules')).toBeUndefined();
  });
});
