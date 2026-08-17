import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, vi } from 'vitest';
import { handleRemove } from '../commands/handlers.js';
import { opencodeSkillsAdapter } from '../adapters/opencode-skills.js';

// Points to a temp user.json for the duration of a test; set before each call.
let userConfigPath: string;

vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config.js')>();
  return {
    ...actual,
    getUserConfigPath: vi.fn(async () => userConfigPath),
    getUserProjectConfig: vi.fn(async () => {
      if (await fs.pathExists(userConfigPath)) {
        return fs.readJson(userConfigPath);
      }
      return {};
    }),
    saveUserProjectConfig: vi.fn(async (config: unknown) => {
      await fs.ensureDir(path.dirname(userConfigPath));
      await fs.writeJson(userConfigPath, config, { spaces: 2 });
    }),
  };
});

describe('handleRemove user mode', () => {
  it('removes the symlink at the adapter userTargetDir location, not the project targetDir', async () => {
    const fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-remove-user-'));
    userConfigPath = path.join(fakeHome, 'user.json');
    const alias = 'my-skill';

    await fs.writeJson(userConfigPath, {
      opencode: { skills: { [alias]: 'https://example.com/repo.git' } }
    }, { spaces: 2 });

    // Real user-level location per opencodeSkillsAdapter.userTargetDir (.config/opencode/skills),
    // distinct from the project-mode targetDir (.opencode/skills).
    const userTargetPath = path.join(fakeHome, opencodeSkillsAdapter.userTargetDir!, alias);
    const sourceDir = path.join(fakeHome, 'source-skill');
    await fs.ensureDir(sourceDir);
    await fs.ensureDir(path.dirname(userTargetPath));
    await fs.symlink(sourceDir, userTargetPath);

    // Sanity: the wrong (project-style) path must not already exist for this alias.
    const wrongPath = path.join(fakeHome, opencodeSkillsAdapter.targetDir, alias);
    expect(await fs.pathExists(wrongPath)).toBe(false);

    const result = await handleRemove(opencodeSkillsAdapter, fakeHome, alias, true);

    const stats = await fs.lstat(userTargetPath).catch(() => null);
    expect(stats).toBeNull();
    expect(result.removedFrom).toEqual(['user.json']);
  });
});
