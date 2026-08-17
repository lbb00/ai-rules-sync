import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { initRulesRepository } from '../commands/lifecycle.js';
import { WILDCARD_TOOL, getRepoSourceConfig, resolveSourceDir } from '../project-config.js';

describe('initRulesRepository', () => {
  it('should create a repository template with sourceDir config', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-'));
    const result = await initRulesRepository({
      cwd,
      name: 'rules-template'
    });

    const configExists = await fs.pathExists(result.configPath);
    expect(configExists).toBe(true);

    const config = await fs.readJson(result.configPath);
    // Subtypes shared by >=2 tools collapse to a single wildcard entry.
    expect(config.sourceDir?.[WILDCARD_TOOL]?.skills).toBe('skills');
    expect(config.sourceDir?.[WILDCARD_TOOL]?.agents).toBe('agents');
    expect(config.sourceDir?.[WILDCARD_TOOL]?.rules).toBe('rules');
    expect(config.sourceDir?.[WILDCARD_TOOL]?.commands).toBe('commands');
    expect(config.sourceDir?.[WILDCARD_TOOL]?.prompts).toBe('prompts');
    // Tool-specific / content-diverging subtypes stay explicit per tool.
    expect(config.sourceDir?.copilot?.instructions).toBe('.github/instructions');
    expect(config.sourceDir?.claude?.md).toBe('.claude');
    expect(config.sourceDir?.codex?.md).toBe('.codex');
    // No tool ends up with an explicit entry for a shareable subtype.
    expect(config.sourceDir?.cursor?.rules).toBeUndefined();
    expect(config.sourceDir?.claude?.skills).toBeUndefined();

    const rulesDir = path.join(result.projectPath, 'rules');
    expect(await fs.pathExists(rulesDir)).toBe(true);
    const skillsDir = path.join(result.projectPath, 'skills');
    expect(await fs.pathExists(skillsDir)).toBe(true);
    const claudeMdDir = path.join(result.projectPath, '.claude');
    expect(await fs.pathExists(claudeMdDir)).toBe(true);
    expect(result.createdDirectories.length).toBeGreaterThan(0);
  });

  it('should resolve the generated wildcard entry via resolveSourceDir with origin "wildcard"', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-resolve-'));
    const result = await initRulesRepository({
      cwd,
      name: 'resolve-template'
    });

    const repoConfig = await getRepoSourceConfig(result.projectPath);
    const resolved = resolveSourceDir(repoConfig, 'claude', 'skills', '.claude/skills');
    expect(resolved.origin).toBe('wildcard');
    expect(resolved.dir).toBe('skills');
  });

  it('should fall back to explicit per-tool entries when a shareable subtype has only one tool left after filtering', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-only-single-'));
    const result = await initRulesRepository({
      cwd,
      name: 'only-claude-template',
      only: ['claude']
    });

    const config = await fs.readJson(result.configPath);
    expect(config.sourceDir?.[WILDCARD_TOOL]).toBeUndefined();
    expect(config.sourceDir?.claude?.skills).toBe('.claude/skills');
    expect(config.sourceDir?.claude?.agents).toBe('.claude/agents');
    expect(config.sourceDir?.claude?.rules).toBe('.claude/rules');
    expect(config.sourceDir?.claude?.md).toBe('.claude');
  });

  it('should build createDirs from the generated sourceDir config (wildcard -> shared dir, explicit -> per-tool dir)', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-createdirs-'));
    const result = await initRulesRepository({
      cwd,
      name: 'createdirs-template'
    });

    const config = await fs.readJson(result.configPath);
    const expectedDirs = new Set<string>();
    for (const toolSection of Object.values(config.sourceDir as Record<string, Record<string, unknown>>)) {
      for (const value of Object.values(toolSection)) {
        const dir = typeof value === 'string' ? value : (value as { dir: string }).dir;
        if (dir && dir !== '.') {
          expectedDirs.add(dir);
        }
      }
    }

    const actualDirs = new Set(
      result.createdDirectories.map(dir => path.relative(result.projectPath, dir))
    );
    expect(actualDirs).toEqual(expectedDirs);
  });

  it('should throw if ai-rules-sync.json exists and force is not enabled', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-force-'));
    const configPath = path.join(projectPath, 'ai-rules-sync.json');
    await fs.writeJson(configPath, { sourceDir: {} }, { spaces: 2 });

    await expect(initRulesRepository({ cwd: projectPath })).rejects.toThrow('already exists');
  });

  it('should only include specified tools when --only is used', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-only-'));
    const result = await initRulesRepository({
      cwd,
      name: 'only-test',
      only: ['cursor', 'claude']
    });

    const config = await fs.readJson(result.configPath);
    const tools = Object.keys(config.sourceDir);
    expect(tools).toContain('cursor');
    expect(tools).toContain('claude');
    expect(tools).not.toContain('copilot');
    expect(tools).not.toContain('trae');
    expect(tools).not.toContain('gemini');
  });

  it('should exclude specified tools when --exclude is used', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-exclude-'));
    const result = await initRulesRepository({
      cwd,
      name: 'exclude-test',
      exclude: ['cursor', 'copilot']
    });

    const config = await fs.readJson(result.configPath);
    const tools = Object.keys(config.sourceDir);
    expect(tools).not.toContain('cursor');
    expect(tools).not.toContain('copilot');
    expect(tools).toContain('claude');
  });

  it('should only create directories for filtered tools', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-dirs-'));
    const result = await initRulesRepository({
      cwd,
      name: 'dirs-test',
      only: ['cursor']
    });

    expect(result.createdDirectories.length).toBeGreaterThan(0);
    for (const dir of result.createdDirectories) {
      expect(dir).toContain('.cursor');
    }
  });
});
