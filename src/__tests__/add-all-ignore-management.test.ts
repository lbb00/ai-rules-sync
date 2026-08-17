import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, vi } from 'vitest';
import { installDiscoveredEntries } from '../commands/add-all.js';
import { SyncAdapter } from '../adapters/types.js';
import { RepoConfig } from '../config.js';

function makeCursorRulesAdapter(): SyncAdapter {
  return {
    name: 'cursor-rules',
    tool: 'cursor',
    subtype: 'rules',
    configPath: ['cursor', 'rules'],
    defaultSourceDir: '.cursor/rules',
    targetDir: '.cursor/rules',
    mode: 'hybrid',
    hybridFileSuffixes: ['.mdc', '.md'],
    forProject: vi.fn() as any,
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => ({ removedFrom: [] })),
    link: vi.fn(async () => ({ sourceName: 'react', targetName: 'react', linked: true })),
    unlink: vi.fn(async () => {})
  };
}

const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: '/repo' };

describe('installDiscoveredEntries ignore management', () => {
  it('adds newly linked entries to .gitignore, matching "ais <tool> add" behavior', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-add-all-ignore-'));
    const adapter = makeCursorRulesAdapter();

    await installDiscoveredEntries(
      projectPath,
      [{
        adapter,
        sourceName: 'react',
        entryName: 'react',
        sourcePath: '/repo/.cursor/rules/react',
        isDirectory: true,
        alreadyInConfig: false
      }],
      repo,
      { isLocal: false, quiet: true }
    );

    const gitignorePath = path.join(projectPath, '.gitignore');
    expect(await fs.pathExists(gitignorePath)).toBe(true);
    const gitignore = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignore).toContain(path.join('.cursor', 'rules', 'react'));
  });

  it('adds local entries to .git/info/exclude instead of .gitignore', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-add-all-ignore-local-'));
    await fs.ensureDir(path.join(projectPath, '.git', 'info'));
    const adapter = makeCursorRulesAdapter();

    await installDiscoveredEntries(
      projectPath,
      [{
        adapter,
        sourceName: 'react',
        entryName: 'react',
        sourcePath: '/repo/.cursor/rules/react',
        isDirectory: true,
        alreadyInConfig: false
      }],
      repo,
      { isLocal: true, quiet: true }
    );

    const excludePath = path.join(projectPath, '.git', 'info', 'exclude');
    const exclude = await fs.readFile(excludePath, 'utf-8');
    expect(exclude).toContain(path.join('.cursor', 'rules', 'react'));

    // Parity with "ais <tool> add --local": the private config file itself gets gitignored too.
    const gitignorePath = path.join(projectPath, '.gitignore');
    expect(await fs.pathExists(gitignorePath)).toBe(true);
    const gitignore = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignore).toContain('ai-rules-sync.local.json');
  });
});
