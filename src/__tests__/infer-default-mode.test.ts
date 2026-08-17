import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { inferDefaultMode } from '../commands/helpers.js';

describe('inferDefaultMode', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-infer-mode-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should return the tool name for a project configured with a newer registry-only tool', async () => {
    // codebuddy was added to the adapter registry long after the top-level
    // CLI dispatch was hand-written; a project that only has codebuddy
    // entries must still resolve to a usable mode.
    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), {
      codebuddy: { rules: { style: 'https://example.com/repo.git' } }
    });

    expect(await inferDefaultMode(tempDir)).toBe('codebuddy');
  });

  it('should return "agents-md" (matching the adapter tool name), not the raw configPath key "agentsMd"', async () => {
    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), {
      agentsMd: { file: { AGENTS: 'https://example.com/repo.git' } }
    });

    expect(await inferDefaultMode(tempDir)).toBe('agents-md');
  });

  it('should return "ambiguous" when a legacy tool and a newer registry-only tool are both configured', async () => {
    await fs.writeJson(path.join(tempDir, 'ai-rules-sync.json'), {
      cursor: { rules: { style: 'https://example.com/repo.git' } },
      codebuddy: { rules: { style: 'https://example.com/repo.git' } }
    });

    expect(await inferDefaultMode(tempDir)).toBe('ambiguous');
  });
});
