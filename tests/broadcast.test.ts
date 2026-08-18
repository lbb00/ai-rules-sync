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

describe('buildAddPreviewRow already-configured detection with suffix variants', () => {
  // manager.add() writes the project manifest under the suffix-resolved
  // targetName ("ts-style.md"), so re-checking "already configured" with the
  // bare un-suffixed name the user typed used to always report false — dry-run
  // said "will-add" forever, even after a successful add.
  let repoDir: string;
  let projectPath: string;
  let originalCwd: string;
  const adapter = getAdapter('claude', 'rules'); // mode: 'file', fileSuffixes: ['.md']

  beforeEach(async () => {
    originalCwd = process.cwd();
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-configured-'));
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-configured-proj-'));
    process.chdir(projectPath);
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'ts-style.md'), '# rule');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(repoDir);
    await fs.remove(projectPath);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('reports "skip: already-configured" when the config key carries the suffix but the query name does not', async () => {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      claude: { rules: { 'ts-style.md': repo().url } }
    });

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.action).toBe('skip: already-configured');
  });

  it('still reports "will-add" when truly not configured', async () => {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), { version: 1 });

    const row = await buildAddPreviewRow(adapter, repo(), 'ts-style', undefined, false);
    expect(row.action).toBe('will-add');
  });
});

describe('buildAddPreviewRow file-mode adapter using createMultiSuffixResolver', () => {
  // cline-rules is mode:'file' but uses createMultiSuffixResolver (multiple
  // fileSuffixes + directory-entry support), not createSingleSuffixResolver
  // — a hand-rolled repoHasEntry keyed only on adapter.mode would treat it
  // like every other file-mode adapter and never check for a directory.
  // Delegating straight to adapter.resolveSource sidesteps that distinction.
  let repoDir: string;
  const adapter = getAdapter('cline', 'rules');

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-multisuffix-'));
  });

  afterEach(async () => {
    await fs.remove(repoDir);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('finds a directory-shaped entry even though the adapter is mode:"file"', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir, 'my-rule-dir'));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'my-rule-dir', 'index.md'), '# rule');

    const row = await buildAddPreviewRow(adapter, repo(), 'my-rule-dir', undefined, false);
    expect(row.hit).toBe(true);
    expect(row.action).toBe('will-add');
  });
});

describe('buildAddPreviewRow file-mode entry detection without a resolveSource', () => {
  // ~30 file-mode adapters (e.g. cline-commands) declare `fileSuffixes` but no
  // `resolveSource`, so their real add resolves through the generic
  // GitRepoSource path -> GitSource.resolve(), an exact un-suffixed match with
  // no suffix awareness. repoHasEntry used to always try appending
  // fileSuffixes regardless, so dry-run could say "will-add" for a name the
  // real add would then fail to find.
  let repoDir: string;
  const adapter = getAdapter('cline', 'commands'); // mode: 'file', fileSuffixes: ['.md'], no resolveSource

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-nosuffix-'));
  });

  afterEach(async () => {
    await fs.remove(repoDir);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('does not confirm an unsuffixed name reads a stored file that only exists suffixed', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'my-workflow.md'), '# workflow');

    const row = await buildAddPreviewRow(adapter, repo(), 'my-workflow', undefined, false);
    expect(row.hit).toBe(false);
    expect(row.action).toBe('skip: not-in-repo');
  });

  it('confirms the exact stored (already-suffixed) name', async () => {
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'my-workflow.md'), '# workflow');

    const row = await buildAddPreviewRow(adapter, repo(), 'my-workflow.md', undefined, false);
    expect(row.hit).toBe(true);
    expect(row.action).toBe('will-add');
  });
});

describe('buildAddPreviewRow honors sourceFileOverride', () => {
  // claude-md has a custom resolveSource that reads sourceDir's sourceFile
  // override (e.g. use a shared "common/AGENTS.md" as CLAUDE.md's source).
  // repoHasEntry used to check only "<dir>/<name><suffix>" directly, ignoring
  // the override entirely, so dry-run reported "skip: not-in-repo" even
  // though the real add (which calls resolveSource) would succeed.
  let repoDir: string;
  const adapter = getAdapter('claude', 'md');

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-override-'));
  });

  afterEach(async () => {
    await fs.remove(repoDir);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('finds the entry at the overridden sourceFile, not the un-overridden name', async () => {
    await fs.writeJson(path.join(repoDir, 'ai-rules-sync.json'), {
      version: 1,
      sourceDir: { claude: { md: { mode: 'file', dir: 'common', sourceFile: 'AGENTS.md' } } }
    });
    await fs.ensureDir(path.join(repoDir, 'common'));
    await fs.writeFile(path.join(repoDir, 'common', 'AGENTS.md'), '# shared');
    // no CLAUDE.md written anywhere

    const row = await buildAddPreviewRow(adapter, repo(), 'CLAUDE', undefined, false);
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

describe('buildAddPreviewRow agents-md config-key detection', () => {
  // agents-md is the one adapter whose `tool`/`subtype` ('agents-md'/'file')
  // differ from its `configPath` (['agentsMd', 'file']) — the project
  // manifest is written under configPath, so an already-configured check
  // keyed by tool/subtype always missed it and reported "will-add" forever.
  let repoDir: string;
  let projectPath: string;
  let originalCwd: string;
  const adapter = getAdapter('agents-md', 'file');

  beforeEach(async () => {
    originalCwd = process.cwd();
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-agentsmd-'));
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-agentsmd-proj-'));
    process.chdir(projectPath);
    await fs.writeFile(path.join(repoDir, 'AGENTS.md'), '# agents');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(repoDir);
    await fs.remove(projectPath);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('reports "skip: already-configured" when the entry is stored under configPath (agentsMd.file), not tool/subtype', async () => {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      agentsMd: { file: { 'AGENTS.md': repo().url } }
    });

    const row = await buildAddPreviewRow(adapter, repo(), 'AGENTS.md', undefined, false);
    expect(row.action).toBe('skip: already-configured');
  });

  it('still reports "will-add" when truly not configured', async () => {
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), { version: 1 });

    const row = await buildAddPreviewRow(adapter, repo(), 'AGENTS.md', undefined, false);
    expect(row.action).toBe('will-add');
  });
});

describe('buildAddPreviewRow surfaces the real resolveSource error instead of a generic "not found"', () => {
  // repoHasEntry used to swallow every resolveSource rejection as a bare
  // "not found", including errors that mean the entry DOES exist but is
  // ambiguous (copilot: both suffix variants present) or invalid (agents-md:
  // name doesn't look like an AGENTS.md file) — masking an actionable error
  // behind a misleading "not in repository" message.
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-broadcast-resolve-error-'));
  });

  afterEach(async () => {
    await fs.remove(repoDir);
  });

  function repo(): RepoConfig {
    return { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
  }

  it('surfaces the suffix-ambiguity error when both copilot instruction variants exist', async () => {
    const adapter = getAdapter('copilot', 'instructions');
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'my-rule.instructions.md'), '# a');
    await fs.writeFile(path.join(repoDir, adapter.defaultSourceDir, 'my-rule.md'), '# b');

    const row = await buildAddPreviewRow(adapter, repo(), 'my-rule', undefined, false);
    expect(row.hit).toBe(false);
    expect(row.action).toBe('skip: not-in-repo');
    expect(row.error).toMatch(/specify the suffix explicitly/);
  });

  it('surfaces the agents-md validation error for a non-AGENTS.md name, instead of a bare "not found"', async () => {
    const adapter = getAdapter('agents-md', 'file');

    const row = await buildAddPreviewRow(adapter, repo(), 'other-file.md', undefined, false);
    expect(row.hit).toBe(false);
    expect(row.action).toBe('skip: not-in-repo');
    expect(row.error).toMatch(/Only AGENTS.md files are supported/);
  });

  it('leaves error unset for a genuine not-found case', async () => {
    const adapter = getAdapter('claude', 'rules');
    await fs.ensureDir(path.join(repoDir, adapter.defaultSourceDir));

    const row = await buildAddPreviewRow(adapter, repo(), 'missing-rule', undefined, false);
    expect(row.hit).toBe(false);
    expect(row.error).toBeUndefined();
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
