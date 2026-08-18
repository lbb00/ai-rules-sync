import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { resolveScopeAdapters, buildAddPreviewRow, selectStrictFailures } from '../src/cli/broadcast.js';
import { BROADCAST_GROUPS, cliNameForTool } from '../src/adapters/cli-groups.js';
import { adapterRegistry, getAdapter } from '../src/adapters/index.js';
import { RepoConfig } from '../src/config.js';

function groupMembers(groupName: keyof typeof BROADCAST_GROUPS) {
  const subtypes = BROADCAST_GROUPS[groupName];
  return adapterRegistry.all().filter(adapter => subtypes.includes(adapter.subtype));
}

describe('resolveScopeAdapters', () => {
  it('errors when neither --tools nor --all is given', () => {
    expect(() => resolveScopeAdapters('rules', groupMembers('rules'), undefined, undefined)).toThrow(
      /needs a target/
    );
  });

  it('errors when both --tools and --all are given', () => {
    expect(() => resolveScopeAdapters('rules', groupMembers('rules'), ['claude'], true)).toThrow(
      /mutually exclusive/
    );
  });

  it('returns every group member for --all', () => {
    const members = groupMembers('rules');
    expect(resolveScopeAdapters('rules', members, undefined, true)).toEqual(members);
  });

  it('resolves a valid --tools CLI name to its adapter', () => {
    const members = groupMembers('rules');
    const result = resolveScopeAdapters('rules', members, ['claude'], undefined);
    expect(result).toEqual([getAdapter('claude', 'rules')]);
  });

  it('hard-errors on an unknown tool name and suggests a close match', () => {
    const members = groupMembers('rules');
    expect(() => resolveScopeAdapters('rules', members, ['cursr'], undefined)).toThrow(
      /Did you mean: cursor/
    );
  });

  it('does not throw for an unknown name with no close match, and omits the suggestion line', () => {
    const members = groupMembers('rules');
    try {
      resolveScopeAdapters('rules', members, ['zzzzzzzzzzzzzzzzzzzz'], undefined);
      throw new Error('expected resolveScopeAdapters to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/Unknown tool "zzzzzzzzzzzzzzzzzzzz"/);
      expect(error.message).not.toMatch(/Did you mean/);
    }
  });

  it('hard-errors when a resolved tool has no adapter in this broadcast group, listing supported tools', () => {
    const members = groupMembers('rules');
    expect(() => resolveScopeAdapters('rules', members, ['pi'], undefined)).toThrow(
      /"pi" has no adapter for the "rules" broadcast group/
    );
  });

  it('gives an exact replacement command when CONCEPT_HINTS has an entry for the resolved tool', () => {
    const members = groupMembers('rules');
    try {
      resolveScopeAdapters('rules', members, ['copilot'], undefined, { verb: 'add', args: ['ts-style', undefined] });
      throw new Error('expected resolveScopeAdapters to throw');
    } catch (error: any) {
      expect(error.message).toMatch(/"copilot" has no adapter for the "rules" broadcast group/);
      expect(error.message).toMatch(/ais copilot instructions add ts-style/);
    }
  });
});

describe('buildAddPreviewRow origin resolution', () => {
  let repoDir: string;
  const adapter = getAdapter('claude', 'rules'); // mode: 'file', fileSuffixes: ['.md']

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-repo-'));
  });

  afterEach(async () => {
    await fs.remove(repoDir);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('reports origin "default" when nothing is configured', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'ts-style.md'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.origin).toBe('default');
    expect(row.action).toBe('will-add');
  });

  it('reports origin "wildcard" when the repo config has a "*" entry for rules', async () => {
    await fs.writeJson(path.join(repoDir, 'ai-rules-sync.json'), {
      version: 1,
      sourceDir: { '*': { rules: 'shared-rules' } }
    });
    await fs.ensureDir(path.join(repoDir, 'shared-rules'));
    await fs.writeFile(path.join(repoDir, 'shared-rules', 'ts-style.md'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.origin).toBe('wildcard');
    expect(row.action).toBe('will-add');
  });

  it('reports origin "explicit" when the repo config has a tool-specific entry, overriding the wildcard', async () => {
    await fs.writeJson(path.join(repoDir, 'ai-rules-sync.json'), {
      version: 1,
      sourceDir: {
        '*': { rules: 'shared-rules' },
        claude: { rules: 'claude-only-rules' }
      }
    });
    await fs.ensureDir(path.join(repoDir, 'claude-only-rules'));
    await fs.writeFile(path.join(repoDir, 'claude-only-rules', 'ts-style.md'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.origin).toBe('explicit');
    expect(row.action).toBe('will-add');
  });

  it('reports "skip: not-in-repo" when the resolved source dir has no matching entry', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    // no ts-style.md written

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.hit).toBe(false);
    expect(row.action).toBe('skip: not-in-repo');
  });

  it('finds a file-mode entry when the caller already passed the suffixed name', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'ts-style.md'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style.md', undefined, false);
    expect(row.hit).toBe(true);
    expect(row.action).toBe('will-add');
  });
});

describe('buildAddPreviewRow hybrid-mode entry detection', () => {
  // cursor-rules is the only hybrid adapter (mode:'hybrid', hybridFileSuffixes:
  // ['.mdc', '.md'], no plain `fileSuffixes`) — repoHasEntry's hybrid branch
  // used to be a bare fs.pathExists on the un-suffixed path, so it always
  // missed entries stored as "<name>.mdc" or "<name>.md".
  let repoDir: string;
  const adapter = getAdapter('cursor', 'rules');

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-hybrid-'));
  });

  afterEach(async () => {
    await fs.remove(repoDir);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('finds a hybrid entry stored under its first hybridFileSuffixes candidate (.mdc)', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'ts-style.mdc'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.hit).toBe(true);
    expect(row.action).toBe('will-add');
  });

  it('finds a hybrid entry stored under a later hybridFileSuffixes candidate (.md)', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'ts-style.md'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.hit).toBe(true);
    expect(row.action).toBe('will-add');
  });

  it('finds a hybrid entry given as a directory', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir, 'my-rule-dir'));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'my-rule-dir', 'index.mdc'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'my-rule-dir', undefined, false);
    expect(row.hit).toBe(true);
  });

  it('finds a hybrid entry when the caller already passed the suffixed name', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'ts-style.mdc'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style.mdc', undefined, false);
    expect(row.hit).toBe(true);
  });

  it('reports not-in-repo for a hybrid entry that truly does not exist', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));

    const row = await buildAddPreviewRow(adapter, repo(), 'missing-rule', undefined, false);
    expect(row.hit).toBe(false);
    expect(row.action).toBe('skip: not-in-repo');
  });
});

describe('selectStrictFailures', () => {
  it('keeps "skip: not-in-repo" rows as warnings when --strict is not given', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-strict-'));
    const adapter = getAdapter('claude', 'rules');
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir)); // no matching entry inside
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    const row = await buildAddPreviewRow(adapter, repo, 'missing-rule', undefined, false);
    expect(row.action).toBe('skip: not-in-repo');

    expect(selectStrictFailures([row], false)).toEqual([]);
    expect(selectStrictFailures([row], undefined)).toEqual([]);

    await fs.remove(repoDir);
  });

  it('turns "skip: not-in-repo" rows into failures when --strict is given', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-strict-'));
    const adapter = getAdapter('claude', 'rules');
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    const row = await buildAddPreviewRow(adapter, repo, 'missing-rule', undefined, false);

    expect(selectStrictFailures([row], true)).toEqual([row]);

    await fs.remove(repoDir);
  });

  it('never flags "will-add" or "skip: already-configured" rows, even under --strict', () => {
    const willAddRow = { action: 'will-add' } as any;
    const alreadyConfiguredRow = { action: 'skip: already-configured' } as any;
    expect(selectStrictFailures([willAddRow, alreadyConfiguredRow], true)).toEqual([]);
  });
});

describe('cliNameForTool sanity for broadcast group errors', () => {
  it('copilot has no CLI alias divergence, so CONCEPT_HINTS keys line up with its CLI name', () => {
    expect(cliNameForTool('copilot')).toBe('copilot');
  });
});
