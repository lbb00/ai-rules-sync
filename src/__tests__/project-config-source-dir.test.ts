import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getRepoSourceConfig, getSourceDir, getSourceFileOverride, getSourceDirOverride, getTargetFileOverride, getTargetNameOverride, getEntryConfig, getRuleSection, getConfigSectionWithFallback, removeDependencyGeneric } from '../project-config.js';
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
    expect((repoConfig.windsurf as Record<string, unknown>)?.rules).toBe('.windsurf/rules');
    expect((repoConfig.windsurf as Record<string, unknown>)?.skills).toBe('.windsurf/skills');
    expect((repoConfig.cline as Record<string, unknown>)?.rules).toBe('.clinerules');
    expect((repoConfig.cline as Record<string, unknown>)?.skills).toBe('.cline/skills');
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
          md: { mode: 'file', dir: 'common', sourceFile: 'AGENTS.md', targetFile: 'CLAUDE.md' }
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect((repoConfig.claude as Record<string, unknown>)?.md).toEqual({ mode: 'file', dir: 'common', sourceFile: 'AGENTS.md', targetFile: 'CLAUDE.md' });

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
          rules: { mode: 'directory', dir: 'common', sourceDir: 'shared-rules', targetName: 'cursor-rules' }
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const repoConfig = await getRepoSourceConfig(tempDir);
    expect((repoConfig.cursor as Record<string, unknown>)?.rules).toEqual({ mode: 'directory', dir: 'common', sourceDir: 'shared-rules', targetName: 'cursor-rules' });

    const sourceDir = getSourceDir(repoConfig, 'cursor', 'rules', '.cursor/rules');
    expect(sourceDir).toBe(path.join('rules-root', 'common'));

    expect(getSourceDirOverride(repoConfig, 'cursor', 'rules')).toBe('shared-rules');
    expect(getTargetNameOverride(repoConfig, 'cursor', 'rules')).toBe('cursor-rules');
  });

  it('should return undefined for sourceDir/targetName overrides when not set', async () => {
    // Legacy format without mode field - tests backward compatibility
    const config = {
      sourceDir: {
        cursor: { rules: { dir: 'common' } }
      }
    } as unknown as ProjectConfig;

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });
    const repoConfig = await getRepoSourceConfig(tempDir);

    expect(getSourceDirOverride(repoConfig, 'cursor', 'rules')).toBeUndefined();
    expect(getTargetNameOverride(repoConfig, 'cursor', 'rules')).toBeUndefined();
  });
});

describe('wildcard (*) config fallback', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-wildcard-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should fallback to * for sourceDir when tool-specific config is missing', async () => {
    const config: ProjectConfig = {
      rootPath: 'rules-root',
      sourceDir: {
        '*': {
          skills: 'common/skills'
        },
        cursor: {
          rules: '.cursor/rules'
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });
    const repoConfig = await getRepoSourceConfig(tempDir);

    // cursor.skills not defined - should fallback to *.skills
    expect(getSourceDir(repoConfig, 'cursor', 'skills', '.cursor/skills')).toBe(path.join('rules-root', 'common/skills'));
    expect(getSourceDir(repoConfig, 'copilot', 'skills', '.github/skills')).toBe(path.join('rules-root', 'common/skills'));

    // cursor.rules is defined - should use it
    expect(getSourceDir(repoConfig, 'cursor', 'rules', '.cursor/rules')).toBe(path.join('rules-root', '.cursor/rules'));
  });

  it('should fallback to * for getEntryConfig when tool-specific config is missing', () => {
    const config: ProjectConfig = {
      '*': {
        skills: {
          'my-skill': 'https://example.com/skills.git'
        }
      },
      cursor: {
        rules: {
          'my-rule': 'https://example.com/rules.git'
        }
      }
    } as ProjectConfig;

    expect(getEntryConfig(config, 'cursor', 'skills', 'my-skill')).toBe('https://example.com/skills.git');
    expect(getEntryConfig(config, 'copilot', 'skills', 'my-skill')).toBe('https://example.com/skills.git');
    expect(getEntryConfig(config, 'cursor', 'rules', 'my-rule')).toBe('https://example.com/rules.git');
    expect(getEntryConfig(config, 'cursor', 'skills', 'nonexistent')).toBeUndefined();
  });

  it('should fallback to * for getRuleSection when tool-specific section is missing', () => {
    const config: ProjectConfig = {
      '*': {
        skills: {
          shared: 'https://example.com/shared.git'
        }
      },
      cursor: {
        rules: { local: 'https://example.com/local.git' }
      }
    } as ProjectConfig;

    expect(getRuleSection(config, ['cursor', 'skills'])).toEqual({ shared: 'https://example.com/shared.git' });
    expect(getRuleSection(config, ['cursor', 'rules'])).toEqual({ local: 'https://example.com/local.git' });
    expect(getRuleSection(config, ['copilot', 'skills'])).toEqual({ shared: 'https://example.com/shared.git' });
  });

  it('should remove from * when entry is in wildcard config', async () => {
    const config = {
      '*': {
        skills: {
          'wild-skill': 'https://example.com/wild.git'
        }
      }
    };

    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), config, { spaces: 2 });

    const { removedFrom } = await removeDependencyGeneric(tempDir, ['cursor', 'skills'], 'wild-skill');
    expect(removedFrom).toContain('ai-rules-sync.json');

    const after = await fs.readJson(path.join(tempDir, 'ai-rules-sync.json'));
    expect(after['*']?.skills?.['wild-skill']).toBeUndefined();
  });
});
