import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentsMdAdapter } from '../adapters/agents-md.js';
import { adapterRegistry } from '../adapters/index.js';
import { runStandardAdapterContract } from './helpers/adapter-contract.js';

describe('agents-md adapter', () => {
  runStandardAdapterContract({
    adapter: agentsMdAdapter,
    registry: adapterRegistry,
    expected: {
      name: 'agents-md-file',
      tool: 'agents-md',
      subtype: 'file',
      defaultSourceDir: '.',
      targetDir: '.',
      mode: 'file',
      configPath: ['agentsMd', 'file'],
      fileSuffixes: ['.md'],
    },
  });
});

describe('agents-md resolveSource', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-agents-md-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should resolve AGENTS.md at root when name is "." ', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Agents');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', '.');
    expect(result.sourceName).toBe('AGENTS.md');
    expect(result.suffix).toBe('.md');
  });

  it('should resolve AGENTS.md at root when name is empty', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Agents');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', '');
    expect(result.sourceName).toBe('AGENTS.md');
  });

  it('should resolve lowercase agents.md at root', async () => {
    await fs.writeFile(path.join(tmpDir, 'agents.md'), '# Agents');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', '.');
    expect(result.sourceName).toBe('agents.md');
  });

  it('should throw when AGENTS.md not found at root', async () => {
    await expect(agentsMdAdapter.resolveSource!(tmpDir, '.', '.')).rejects.toThrow(
      'AGENTS.md not found at repository root'
    );
  });

  it('should resolve explicit .md path (pattern 1)', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'AGENTS.md'), '# Docs agents');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'docs/AGENTS.md');
    expect(result.sourceName).toBe('docs/AGENTS.md');
  });

  it('should throw for non-AGENTS .md file', async () => {
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# Readme');
    await expect(agentsMdAdapter.resolveSource!(tmpDir, '.', 'README.md')).rejects.toThrow(
      'Only AGENTS.md files are supported'
    );
  });

  it('should throw when explicit .md path not found', async () => {
    await expect(agentsMdAdapter.resolveSource!(tmpDir, '.', 'missing/AGENTS.md')).rejects.toThrow(
      'AGENTS.md file not found at'
    );
  });

  it('should resolve directory path with slash (pattern 2)', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs', 'team'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'team', 'AGENTS.md'), '# Team');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'docs/team');
    expect(result.sourceName).toBe(path.join('docs/team', 'AGENTS.md'));
  });

  it('should resolve directory path with lowercase agents.md', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs', 'team'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'team', 'agents.md'), '# Team');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'docs/team');
    expect(result.sourceName).toBe(path.join('docs/team', 'agents.md'));
  });

  it('should throw when directory path has no AGENTS.md (pattern 2)', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs', 'team'));
    await expect(agentsMdAdapter.resolveSource!(tmpDir, '.', 'docs/team')).rejects.toThrow(
      'AGENTS.md not found in directory'
    );
  });

  it('should resolve "AGENTS" as root AGENTS.md (pattern 3)', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Root');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'AGENTS');
    expect(result.sourceName).toBe('AGENTS.md');
  });

  it('should resolve simple name as subdirectory (pattern 3)', async () => {
    await fs.ensureDir(path.join(tmpDir, 'frontend'));
    await fs.writeFile(path.join(tmpDir, 'frontend', 'AGENTS.md'), '# Frontend');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'frontend');
    expect(result.sourceName).toBe(path.join('frontend', 'AGENTS.md'));
  });

  it('should fallback to root AGENTS.md for simple name (pattern 3)', async () => {
    await fs.writeFile(path.join(tmpDir, 'AGENTS.md'), '# Root');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'something');
    expect(result.sourceName).toBe('AGENTS.md');
  });

  it('should throw when simple name not found anywhere (pattern 3)', async () => {
    await expect(agentsMdAdapter.resolveSource!(tmpDir, '.', 'nonexistent')).rejects.toThrow(
      'AGENTS.md not found for: nonexistent'
    );
  });

  it('should handle backslash normalization', async () => {
    await fs.ensureDir(path.join(tmpDir, 'docs', 'team'));
    await fs.writeFile(path.join(tmpDir, 'docs', 'team', 'AGENTS.md'), '# Team');
    const result = await agentsMdAdapter.resolveSource!(tmpDir, '.', 'docs\\team');
    expect(result.sourceName).toBe(path.join('docs/team', 'AGENTS.md'));
  });
});

describe('agents-md resolveTargetName', () => {
  it('should always return AGENTS.md', () => {
    expect(agentsMdAdapter.resolveTargetName!('anything')).toBe('AGENTS.md');
    expect(agentsMdAdapter.resolveTargetName!('anything', 'alias')).toBe('AGENTS.md');
    expect(agentsMdAdapter.resolveTargetName!('anything', undefined, '.md')).toBe('AGENTS.md');
  });
});

describe('agents-md addDependency', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-agents-md-dep-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should write simple string entry to flat agentsMd config', async () => {
    await agentsMdAdapter.addDependency(tmpDir, 'root', 'https://repo.git');

    const config = await fs.readJson(path.join(tmpDir, 'ai-rules-sync.json'));
    expect(config.agentsMd.root).toBe('https://repo.git');
  });

  it('should write object entry with alias', async () => {
    await agentsMdAdapter.addDependency(tmpDir, 'original', 'https://repo.git', 'my-alias');

    const config = await fs.readJson(path.join(tmpDir, 'ai-rules-sync.json'));
    expect(config.agentsMd['my-alias']).toEqual({
      url: 'https://repo.git',
      rule: 'original',
    });
  });

  it('should write object entry with targetDir', async () => {
    await agentsMdAdapter.addDependency(tmpDir, 'root', 'https://repo.git', undefined, false, 'frontend');

    const config = await fs.readJson(path.join(tmpDir, 'ai-rules-sync.json'));
    expect(config.agentsMd.root).toEqual({
      url: 'https://repo.git',
      targetDir: 'frontend',
    });
  });

  it('should write to local config when isLocal is true', async () => {
    await agentsMdAdapter.addDependency(tmpDir, 'root', 'https://repo.git', undefined, true);

    const config = await fs.readJson(path.join(tmpDir, 'ai-rules-sync.local.json'));
    expect(config.agentsMd.root).toBe('https://repo.git');
  });

  it('should preserve existing config entries', async () => {
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.json'), {
      agentsMd: { existing: 'https://other.git' },
    });

    await agentsMdAdapter.addDependency(tmpDir, 'new-entry', 'https://repo.git');

    const config = await fs.readJson(path.join(tmpDir, 'ai-rules-sync.json'));
    expect(config.agentsMd.existing).toBe('https://other.git');
    expect(config.agentsMd['new-entry']).toBe('https://repo.git');
  });
});

describe('agents-md removeDependency', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-agents-md-rm-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should remove entry from main config', async () => {
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.json'), {
      agentsMd: { root: 'https://repo.git' },
    });

    const result = await agentsMdAdapter.removeDependency(tmpDir, 'root');

    expect(result.removedFrom).toEqual(['ai-rules-sync.json']);
    const config = await fs.readJson(path.join(tmpDir, 'ai-rules-sync.json'));
    expect(config.agentsMd.root).toBeUndefined();
  });

  it('should remove entry from local config', async () => {
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.local.json'), {
      agentsMd: { root: 'https://repo.git' },
    });

    const result = await agentsMdAdapter.removeDependency(tmpDir, 'root');

    expect(result.removedFrom).toEqual(['ai-rules-sync.local.json']);
  });

  it('should remove from both configs', async () => {
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.json'), {
      agentsMd: { root: 'https://repo.git' },
    });
    await fs.writeJson(path.join(tmpDir, 'ai-rules-sync.local.json'), {
      agentsMd: { root: 'https://local.git' },
    });

    const result = await agentsMdAdapter.removeDependency(tmpDir, 'root');

    expect(result.removedFrom).toContain('ai-rules-sync.json');
    expect(result.removedFrom).toContain('ai-rules-sync.local.json');
  });

  it('should return empty array when alias not found', async () => {
    const result = await agentsMdAdapter.removeDependency(tmpDir, 'nonexistent');
    expect(result.removedFrom).toEqual([]);
  });
});
