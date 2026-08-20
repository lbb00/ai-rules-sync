import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { runDoctor } from '../src/commands/doctor.js';
import { getAdapter } from '../src/adapters/index.js';
import { RepoConfig } from '../src/config.js';

describe('runDoctor', () => {
  let repoDir: string;
  let projectPath: string;
  const adapter = getAdapter('cursor', 'rules'); // mode: 'hybrid', hybridFileSuffixes: ['.mdc', '.md']

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-doctor-repo-'));
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-doctor-proj-'));
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'react.mdc'), '# react');
  });

  afterEach(async () => {
    await fs.remove(repoDir);
    await fs.remove(projectPath);
  });

  function repo(): RepoConfig {
    return { name: 'doctor-test-repo', url: repoDir, path: repoDir };
  }

  function repos(): Record<string, RepoConfig> {
    return { [repo().name]: repo() };
  }

  async function writeEntry(alias: string, sourceName: string) {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      cursor: { rules: { [alias]: { url: repoDir, rule: sourceName } } }
    });
  }

  async function writeShorthandEntry(name: string) {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      cursor: { rules: { [name]: repoDir } }
    });
  }

  it('reports "ok" for a healthy relative symlink pointing at the real source', async () => {
    // linkany creates relative symlinks (not absolute) — this is the exact
    // shape that used to false-positive as "stale" before the diff() fix in
    // src/dotany/manager.ts (relative readlink() compared raw against an
    // absolute expectedSource, so every healthy entry failed the comparison).
    await writeEntry('react.mdc', 'react');
    const targetDir = path.join(projectPath, adapter.targetDir);
    await fs.ensureDir(targetDir);
    const targetPath = path.join(targetDir, 'react.mdc');
    const sourcePath = path.join(repoDir, adapter.defaultSourceDir, 'react.mdc');
    await fs.symlink(path.relative(path.dirname(targetPath), sourcePath), targetPath);

    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.counts).toEqual({ ok: 1, missing: 0, conflict: 0, stale: 0 });
    expect(result.entries[0].status).toBe('ok');
  });

  it('reports "ok" for a healthy absolute symlink too', async () => {
    await writeEntry('react.mdc', 'react');
    const targetDir = path.join(projectPath, adapter.targetDir);
    await fs.ensureDir(targetDir);
    const targetPath = path.join(targetDir, 'react.mdc');
    const sourcePath = path.join(repoDir, adapter.defaultSourceDir, 'react.mdc');
    await fs.symlink(sourcePath, targetPath);

    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.entries[0].status).toBe('ok');
  });

  it('reports "missing" when the target path has nothing at all', async () => {
    await writeEntry('react.mdc', 'react');

    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.entries[0].status).toBe('missing');
    expect(result.counts.missing).toBe(1);
  });

  it('reports "conflict" when a real file sits where the symlink should be', async () => {
    await writeEntry('react.mdc', 'react');
    const targetDir = path.join(projectPath, adapter.targetDir);
    await fs.ensureDir(targetDir);
    await fs.writeFile(path.join(targetDir, 'react.mdc'), 'not a symlink');

    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.entries[0].status).toBe('conflict');
    expect(result.counts.conflict).toBe(1);
  });

  it('reports "stale" when the symlink points at a different file than the manifest expects', async () => {
    await writeEntry('react.mdc', 'react');
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'decoy.mdc'), '# decoy');
    const targetDir = path.join(projectPath, adapter.targetDir);
    await fs.ensureDir(targetDir);
    const targetPath = path.join(targetDir, 'react.mdc');
    await fs.symlink(path.join(repoDir, adapter.defaultSourceDir, 'decoy.mdc'), targetPath);

    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.entries[0].status).toBe('stale');
    expect(result.counts.stale).toBe(1);
  });

  it('reports "stale" (not a crash) when the source repo is not registered locally', async () => {
    await writeEntry('react.mdc', 'react');
    const targetDir = path.join(projectPath, adapter.targetDir);
    await fs.ensureDir(targetDir);
    const targetPath = path.join(targetDir, 'react.mdc');
    await fs.symlink(path.join(repoDir, adapter.defaultSourceDir, 'react.mdc'), targetPath);

    // Empty repos map: doctor must not attempt to clone anything, just
    // report the entry as needing attention.
    const result = await runDoctor([adapter], projectPath, {});
    expect(result.entries[0].status).toBe('stale');
  });

  it('reports "ok" for a shorthand-format entry whose alias lacks the suffix the adapter appends', async () => {
    // Documented string-shorthand config format ("react": "<repo-url>") stores
    // the manifest alias without a suffix, but a hybrid adapter appends one
    // (.mdc) when it actually links the file — so the real on-disk name is
    // "react.mdc", not "react". status()/diff() must resolve that, not just
    // check the bare alias.
    await writeShorthandEntry('react');
    const targetDir = path.join(projectPath, adapter.targetDir);
    await fs.ensureDir(targetDir);
    const targetPath = path.join(targetDir, 'react.mdc');
    const sourcePath = path.join(repoDir, adapter.defaultSourceDir, 'react.mdc');
    await fs.symlink(path.relative(path.dirname(targetPath), sourcePath), targetPath);

    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.entries[0].status).toBe('ok');
    expect(result.counts).toEqual({ ok: 1, missing: 0, conflict: 0, stale: 0 });
  });

  it('skips adapters with no configured entries', async () => {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), { version: 1 });
    const result = await runDoctor([adapter], projectPath, repos());
    expect(result.entries).toEqual([]);
  });

  it('does not check user-scope entries unless options.user is set', async () => {
    await writeEntry('react.mdc', 'react');
    const result = await runDoctor([adapter], projectPath, repos(), { user: false });
    // project entry still shows up; this just asserts no crash/extra work
    // happens for user scope when not requested.
    expect(result.entries.every(e => e.scope === 'project')).toBe(true);
  });
});
