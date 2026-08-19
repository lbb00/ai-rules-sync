import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { describe, expect, it, vi } from 'vitest';
import { handleAdd, CommandContext, AddOptions } from '../commands/handlers.js';
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

describe('handleAdd user mode', () => {
  it('refuses to overwrite a real (non-symlink) file/directory at the target and does not record a user config dependency', async () => {
    const fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-add-user-conflict-'));
    userConfigPath = path.join(fakeHome, 'user.json');
    const name = 'my-skill';

    // Real repo with the entry available to link. GitSource treats an
    // already-`.git`-initialized cloneDir as "already cloned" and skips the
    // network clone (see GitSource.ensureCloned in dotany/sources/git.ts).
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-add-user-repo-'));
    await execa('git', ['init'], { cwd: repoPath });
    await fs.ensureDir(path.join(repoPath, opencodeSkillsAdapter.defaultSourceDir, name));
    await fs.writeFile(path.join(repoPath, opencodeSkillsAdapter.defaultSourceDir, name, 'SKILL.md'), '# skill');

    // Real (non-ais-managed) content already sits at the user target path.
    const userTargetPath = path.join(fakeHome, opencodeSkillsAdapter.userTargetDir!, name);
    await fs.ensureDir(userTargetPath);
    await fs.writeFile(path.join(userTargetPath, 'real-content.txt'), 'do not touch me');

    const ctx: CommandContext = {
      projectPath: fakeHome,
      repo: { name: 'test-repo', url: 'https://example.com/repo.git', path: repoPath },
      isLocal: false,
      user: true,
      skipIgnore: true,
    };
    const options: AddOptions = { user: true };

    const result = await handleAdd(opencodeSkillsAdapter, ctx, name, undefined, options);

    expect(result.linked).toBe(false);

    // The real content must survive untouched.
    expect(await fs.pathExists(path.join(userTargetPath, 'real-content.txt'))).toBe(true);
    const stats = await fs.lstat(userTargetPath);
    expect(stats.isSymbolicLink()).toBe(false);

    // No dependency should be recorded for an entry that was never actually linked.
    expect(await fs.pathExists(userConfigPath)).toBe(false);
  });
});
