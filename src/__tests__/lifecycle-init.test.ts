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
});
