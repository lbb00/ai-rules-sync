import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { copilotAgentsAdapter } from '../adapters/copilot-agents.js';
import { copilotPromptsAdapter } from '../adapters/copilot-prompts.js';
import { copilotInstructionsAdapter, stripCopilotSuffix, hasCopilotSuffix } from '../adapters/copilot-instructions.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-copilot-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

// ---------- copilot-agents resolveSource ----------

describe('copilot-agents resolveSource', () => {
  const resolveSource = copilotAgentsAdapter.resolveSource!;

  it('resolves a name ending with .agent.md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    const name = 'deploy.agent.md';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, name), 'content');

    const result = await resolveSource(repoDir, rootPath, name);
    expect(result.sourceName).toBe(name);
    expect(result.suffix).toBe('.agent.md');
  });

  it('resolves a name ending with .md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    const name = 'deploy.md';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, name), 'content');

    const result = await resolveSource(repoDir, rootPath, name);
    expect(result.sourceName).toBe(name);
    expect(result.suffix).toBe('.md');
  });

  it('throws when .agent.md file not found', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'missing.agent.md')).rejects.toThrow('not found');
  });

  it('throws when .md file not found', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'missing.md')).rejects.toThrow('not found');
  });

  it('auto-resolves name without suffix to .agent.md when only that exists', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'deploy.agent.md'), 'content');

    const result = await resolveSource(repoDir, rootPath, 'deploy');
    expect(result.sourceName).toBe('deploy.agent.md');
    expect(result.suffix).toBe('.agent.md');
  });

  it('auto-resolves name without suffix to .md when only that exists', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'deploy.md'), 'content');

    const result = await resolveSource(repoDir, rootPath, 'deploy');
    expect(result.sourceName).toBe('deploy.md');
    expect(result.suffix).toBe('.md');
  });

  it('throws when both .agent.md and .md exist', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'deploy.agent.md'), 'a');
    await fs.writeFile(path.join(repoDir, rootPath, 'deploy.md'), 'b');

    await expect(resolveSource(repoDir, rootPath, 'deploy')).rejects.toThrow('specify the suffix explicitly');
  });

  it('throws when neither suffix exists for bare name', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/agents';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'nonexistent')).rejects.toThrow('not found');
  });
});

// ---------- copilot-agents resolveTargetName ----------

describe('copilot-agents resolveTargetName', () => {
  const resolve = copilotAgentsAdapter.resolveTargetName!;

  it('returns base as-is when it already ends with .agent.md', () => {
    expect(resolve('deploy.agent.md')).toBe('deploy.agent.md');
  });

  it('returns base as-is when it already ends with .md', () => {
    expect(resolve('deploy.md')).toBe('deploy.md');
  });

  it('appends source suffix when base has no suffix', () => {
    expect(resolve('deploy', undefined, '.agent.md')).toBe('deploy.agent.md');
  });

  it('returns base as-is when no source suffix', () => {
    expect(resolve('deploy')).toBe('deploy');
  });

  it('uses alias over name', () => {
    expect(resolve('deploy', 'custom', '.agent.md')).toBe('custom.agent.md');
  });

  it('returns alias as-is when it already has suffix', () => {
    expect(resolve('deploy', 'custom.md')).toBe('custom.md');
  });
});

// ---------- copilot-prompts resolveSource ----------

describe('copilot-prompts resolveSource', () => {
  const resolveSource = copilotPromptsAdapter.resolveSource!;

  it('resolves a name ending with .prompt.md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    const name = 'code-review.prompt.md';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, name), 'content');

    const result = await resolveSource(repoDir, rootPath, name);
    expect(result.sourceName).toBe(name);
    expect(result.suffix).toBe('.prompt.md');
  });

  it('resolves a name ending with .md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    const name = 'review.md';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, name), 'content');

    const result = await resolveSource(repoDir, rootPath, name);
    expect(result.sourceName).toBe(name);
    expect(result.suffix).toBe('.md');
  });

  it('throws when .prompt.md file not found', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'missing.prompt.md')).rejects.toThrow('not found');
  });

  it('throws when .md file not found', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'missing.md')).rejects.toThrow('not found');
  });

  it('auto-resolves bare name to .prompt.md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'review.prompt.md'), 'content');

    const result = await resolveSource(repoDir, rootPath, 'review');
    expect(result.sourceName).toBe('review.prompt.md');
    expect(result.suffix).toBe('.prompt.md');
  });

  it('auto-resolves bare name to .md when only that exists', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'review.md'), 'content');

    const result = await resolveSource(repoDir, rootPath, 'review');
    expect(result.sourceName).toBe('review.md');
    expect(result.suffix).toBe('.md');
  });

  it('throws when both .prompt.md and .md exist', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'review.prompt.md'), 'a');
    await fs.writeFile(path.join(repoDir, rootPath, 'review.md'), 'b');

    await expect(resolveSource(repoDir, rootPath, 'review')).rejects.toThrow('specify the suffix explicitly');
  });

  it('throws when neither suffix exists', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/prompts';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'nonexistent')).rejects.toThrow('not found');
  });
});

// ---------- copilot-prompts resolveTargetName ----------

describe('copilot-prompts resolveTargetName', () => {
  const resolve = copilotPromptsAdapter.resolveTargetName!;

  it('returns base as-is when it already ends with .prompt.md', () => {
    expect(resolve('review.prompt.md')).toBe('review.prompt.md');
  });

  it('returns base as-is when it ends with .md', () => {
    expect(resolve('review.md')).toBe('review.md');
  });

  it('appends source suffix when base has no suffix', () => {
    expect(resolve('review', undefined, '.prompt.md')).toBe('review.prompt.md');
  });

  it('returns base as-is when no source suffix', () => {
    expect(resolve('review')).toBe('review');
  });

  it('uses alias over name', () => {
    expect(resolve('review', 'custom', '.prompt.md')).toBe('custom.prompt.md');
  });
});

// ---------- copilot-instructions resolveSource ----------

describe('copilot-instructions resolveSource', () => {
  const resolveSource = copilotInstructionsAdapter.resolveSource!;

  it('resolves a name ending with .instructions.md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    const name = 'coding.instructions.md';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, name), 'content');

    const result = await resolveSource(repoDir, rootPath, name);
    expect(result.sourceName).toBe(name);
    expect(result.suffix).toBe('.instructions.md');
  });

  it('resolves a name ending with .md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    const name = 'coding.md';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, name), 'content');

    const result = await resolveSource(repoDir, rootPath, name);
    expect(result.sourceName).toBe(name);
    expect(result.suffix).toBe('.md');
  });

  it('throws when .instructions.md file not found', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'missing.instructions.md')).rejects.toThrow('not found');
  });

  it('throws when .md file not found', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'missing.md')).rejects.toThrow('not found');
  });

  it('auto-resolves bare name to .instructions.md', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'coding.instructions.md'), 'content');

    const result = await resolveSource(repoDir, rootPath, 'coding');
    expect(result.sourceName).toBe('coding.instructions.md');
    expect(result.suffix).toBe('.instructions.md');
  });

  it('auto-resolves bare name to .md when only that exists', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'coding.md'), 'content');

    const result = await resolveSource(repoDir, rootPath, 'coding');
    expect(result.sourceName).toBe('coding.md');
    expect(result.suffix).toBe('.md');
  });

  it('throws when both suffixes exist', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    await fs.ensureDir(path.join(repoDir, rootPath));
    await fs.writeFile(path.join(repoDir, rootPath, 'coding.instructions.md'), 'a');
    await fs.writeFile(path.join(repoDir, rootPath, 'coding.md'), 'b');

    await expect(resolveSource(repoDir, rootPath, 'coding')).rejects.toThrow('specify the suffix explicitly');
  });

  it('throws when neither suffix exists', async () => {
    const repoDir = tmpDir;
    const rootPath = '.github/instructions';
    await fs.ensureDir(path.join(repoDir, rootPath));

    await expect(resolveSource(repoDir, rootPath, 'nonexistent')).rejects.toThrow('not found');
  });
});

// ---------- copilot-instructions resolveTargetName ----------

describe('copilot-instructions resolveTargetName', () => {
  const resolve = copilotInstructionsAdapter.resolveTargetName!;

  it('returns base as-is when it ends with .instructions.md', () => {
    expect(resolve('coding.instructions.md')).toBe('coding.instructions.md');
  });

  it('returns base as-is when it ends with .md', () => {
    expect(resolve('coding.md')).toBe('coding.md');
  });

  it('appends source suffix when base has no suffix', () => {
    expect(resolve('coding', undefined, '.instructions.md')).toBe('coding.instructions.md');
  });

  it('returns base as-is when no source suffix', () => {
    expect(resolve('coding')).toBe('coding');
  });

  it('uses alias over name', () => {
    expect(resolve('coding', 'custom', '.instructions.md')).toBe('custom.instructions.md');
  });
});

// ---------- stripCopilotSuffix / hasCopilotSuffix ----------

describe('stripCopilotSuffix', () => {
  it('strips .instructions.md suffix', () => {
    expect(stripCopilotSuffix('coding.instructions.md')).toBe('coding');
  });

  it('strips .md suffix', () => {
    expect(stripCopilotSuffix('coding.md')).toBe('coding');
  });

  it('returns name unchanged when no recognized suffix', () => {
    expect(stripCopilotSuffix('coding')).toBe('coding');
    expect(stripCopilotSuffix('coding.txt')).toBe('coding.txt');
  });
});

describe('hasCopilotSuffix', () => {
  it('returns true for .instructions.md', () => {
    expect(hasCopilotSuffix('coding.instructions.md')).toBe(true);
  });

  it('returns true for .md', () => {
    expect(hasCopilotSuffix('coding.md')).toBe(true);
  });

  it('returns false for no recognized suffix', () => {
    expect(hasCopilotSuffix('coding')).toBe(false);
    expect(hasCopilotSuffix('coding.txt')).toBe(false);
  });
});
