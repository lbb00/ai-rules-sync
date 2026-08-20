import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { GitSource } from '../src/dotany/sources/git.js';

describe('GitSource.resolve()', () => {
  let cloneDir: string;

  beforeEach(async () => {
    cloneDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-git-source-'));
  });

  afterEach(async () => {
    await fs.remove(cloneDir);
  });

  it('resolves an entry from a repo that has no upstream tracking branch, instead of throwing on git pull', async () => {
    // A repo that's `git init`'d locally but never pushed/tracked (the
    // common case for a purely-local rules repo) has nothing to pull —
    // ensureCloned() used to run a bare `git pull` unconditionally, which
    // fails with "no tracking information for the current branch" instead
    // of being a no-op, unlike src/git.ts's cloneOrUpdateRepo which already
    // guards this with a `git rev-parse --abbrev-ref @{u}` check first.
    await fs.ensureDir(path.join(cloneDir, 'skills', 'my-skill'));
    await fs.writeFile(path.join(cloneDir, 'skills', 'my-skill', 'SKILL.md'), '# skill');
    await execa('git', ['init', '-q'], { cwd: cloneDir });
    await execa('git', ['add', '-A'], { cwd: cloneDir });
    await execa('git', ['-c', 'user.email=test@test.com', '-c', 'user.name=test', 'commit', '-qm', 'init'], { cwd: cloneDir });

    const source = new GitSource(cloneDir, cloneDir, 'skills');
    const resolved = await source.resolve('my-skill');
    expect(resolved.path).toBe(path.join(cloneDir, 'skills', 'my-skill'));
  });
});
