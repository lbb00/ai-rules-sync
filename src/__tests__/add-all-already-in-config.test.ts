import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { discoverEntriesForAdapter } from '../commands/add-all.js';
import { agentsMdAdapter } from '../adapters/agents-md.js';
import { cursorRulesAdapter } from '../adapters/cursor-rules.js';
import { RepoConfig } from '../config.js';

describe('discoverEntriesForAdapter alreadyInConfig detection', () => {
  it('detects agentsMd entries already configured, despite tool name / configPath key mismatch', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-repo-agentsmd-'));
    await fs.writeFile(path.join(repoDir, 'AGENTS.md'), '# hi');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-agentsmd-'));
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      // configPath is ['agentsMd', 'file'] even though adapter.tool is 'agents-md'
      agentsMd: { file: { AGENTS: 'https://example.com/repo.git' } }
    });

    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
    const entries = await discoverEntriesForAdapter(agentsMdAdapter, repo, projectPath);

    const agentsEntry = entries.find(e => e.entryName === 'AGENTS');
    expect(agentsEntry).toBeDefined();
    expect(agentsEntry?.alreadyInConfig).toBe(true);
  });

  it('detects entries configured under the wildcard "*" tool key', async () => {
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-repo-wildcard-'));
    await fs.ensureDir(path.join(repoDir, '.cursor', 'rules', 'react'));
    await fs.writeFile(path.join(repoDir, '.cursor', 'rules', 'react', 'index.md'), '# hi');

    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-project-wildcard-'));
    await fs.writeJson(path.join(projectPath, 'ai-rules-sync.json'), {
      version: 1,
      '*': { rules: { react: 'https://example.com/repo.git' } }
    });

    const repo: RepoConfig = { name: 'repo', url: 'https://example.com/repo.git', path: repoDir };
    const entries = await discoverEntriesForAdapter(cursorRulesAdapter, repo, projectPath);

    const reactEntry = entries.find(e => e.entryName === 'react');
    expect(reactEntry).toBeDefined();
    expect(reactEntry?.alreadyInConfig).toBe(true);
  });
});
