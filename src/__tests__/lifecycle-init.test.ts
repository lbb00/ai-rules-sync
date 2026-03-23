import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { initRulesRepository } from '../commands/lifecycle.js';

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
    expect(config.sourceDir?.cursor?.rules).toBe('.cursor/rules');
    expect(config.sourceDir?.copilot?.instructions).toBe('.github/instructions');

    const cursorDir = path.join(result.projectPath, '.cursor', 'rules');
    expect(await fs.pathExists(cursorDir)).toBe(true);
    expect(result.createdDirectories.length).toBeGreaterThan(0);
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
