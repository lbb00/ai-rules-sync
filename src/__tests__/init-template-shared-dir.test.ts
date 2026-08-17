import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { initRulesRepository } from '../commands/lifecycle.js';
import { discoverEntriesForAdapter } from '../commands/add-all.js';
import { codexAgentsAdapter } from '../adapters/codex-agents.js';
import { claudeAgentsAdapter } from '../adapters/claude-agents.js';
import { RepoConfig } from '../config.js';

/**
 * §3.4 integration acceptance: an `ais init`-generated repo puts multiple
 * tools' content for a shareable subtype in one flat directory. Content
 * inside that shared directory must still be disambiguated per adapter by
 * mode/fileSuffixes — a file that doesn't match a given adapter's expected
 * shape must not be silently treated as a hit for that adapter.
 *
 * codex-agents (mode: 'file', fileSuffixes: ['.toml']) is used here instead
 * of the design doc's suggested cursor-rules/.mdc example: cursor-rules
 * actually accepts both '.mdc' and '.md' (see src/adapters/cursor-rules.ts),
 * so a loose '.md' file would NOT reproduce a mismatch there. codex-agents
 * only accepts '.toml', which does reproduce it.
 */
describe('ais init shared template directory - per-adapter disambiguation', () => {
  it('generates a wildcard "agents" entry shared by claude and codex', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-shared-agents-'));
    const result = await initRulesRepository({ cwd, name: 'shared-agents-repo' });

    const config = await fs.readJson(result.configPath);
    expect(config.sourceDir['*'].agents).toBe('agents');
  });

  it('does not let a mismatched file in the shared directory count as a codex-agents hit', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-shared-agents-repo-'));
    const repoResult = await initRulesRepository({ cwd, name: 'shared-agents-repo' });
    const repoDir = repoResult.projectPath;

    // A well-formed codex-agents entry (matches fileSuffixes: ['.toml'])...
    await fs.writeFile(path.join(repoDir, 'agents', 'reviewer.toml'), '# codex agent config');
    // ...and a file that only makes sense for a different adapter (claude-agents
    // is directory-mode; this is neither a .toml file nor a directory claude
    // would use, it's here purely to prove codex-agents' suffix filter works).
    await fs.writeFile(path.join(repoDir, 'agents', 'notes.md'), '# not a codex agent');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-shared-agents-'));
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    const entries = await discoverEntriesForAdapter(codexAgentsAdapter, repo, projectPath);
    const entryNames = entries.map(e => e.entryName);

    expect(entryNames).toContain('reviewer');
    expect(entryNames).not.toContain('notes');
  });

  it('lets claude-agents (directory mode) discover a subdirectory in the same shared directory', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-init-shared-agents-dir-'));
    const repoResult = await initRulesRepository({ cwd, name: 'shared-agents-repo' });
    const repoDir = repoResult.projectPath;

    await fs.ensureDir(path.join(repoDir, 'agents', 'code-reviewer'));
    await fs.writeFile(path.join(repoDir, 'agents', 'code-reviewer', 'prompt.md'), '# agent');
    // A loose file (codex's shape) sitting alongside it in the same shared dir.
    await fs.writeFile(path.join(repoDir, 'agents', 'reviewer.toml'), '# codex agent config');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-shared-agents-dir-'));
    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };

    const entries = await discoverEntriesForAdapter(claudeAgentsAdapter, repo, projectPath);
    const entryNames = entries.map(e => e.entryName);

    expect(entryNames).toContain('code-reviewer');
    expect(entryNames).not.toContain('reviewer.toml');
  });
});
