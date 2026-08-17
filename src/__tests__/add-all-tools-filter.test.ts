import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { discoverAllEntries } from '../commands/add-all.js';
import { adapterRegistry } from '../adapters/index.js';
import { RepoConfig } from '../config.js';

describe('discoverAllEntries --tools filter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the "agy" CLI group alias to the antigravity-cli adapter tool name', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-repo-agy-'));
    await fs.ensureDir(path.join(repoDir, '.agents', 'skills', 'demo-skill'));
    await fs.writeFile(path.join(repoDir, '.agents', 'skills', 'demo-skill', 'SKILL.md'), '# demo');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-agy-'));
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    const entries = await discoverAllEntries(projectPath, repo, adapterRegistry, { tools: ['agy'] });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(e => e.adapter.tool === 'antigravity-cli')).toBe(true);
  });

  it('resolves the "droid" CLI group alias to the factorydroid adapter tool name', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-repo-droid-'));
    await fs.ensureDir(path.join(repoDir, '.factory', 'skills', 'demo-skill'));
    await fs.writeFile(path.join(repoDir, '.factory', 'skills', 'demo-skill', 'SKILL.md'), '# demo');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-droid-'));
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    const entries = await discoverAllEntries(projectPath, repo, adapterRegistry, { tools: ['droid'] });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(e => e.adapter.tool === 'factorydroid')).toBe(true);
  });

  it('hard-errors when a --tools value matches no known adapter, aligned with broadcast groups', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-repo-typo-'));
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-typo-'));
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    await expect(
      discoverAllEntries(projectPath, repo, adapterRegistry, { tools: ['not-a-real-tool'] })
    ).rejects.toThrow(/Unknown tool "not-a-real-tool"/);
  });
});
