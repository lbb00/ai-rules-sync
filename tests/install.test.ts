import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { installEntriesForAdapter, installEntriesForTool } from '../src/commands/install.js';
import { getAdapter, adapterRegistry } from '../src/adapters/index.js';

describe('installEntriesForAdapter', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-install-'));
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it('prints "No X Y found" and returns false when quiet is not set', async () => {
    const adapter = getAdapter('claude', 'rules');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const hadEntries = await installEntriesForAdapter(adapter, projectPath);
      expect(hadEntries).toBe(false);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No claude rules found'));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('suppresses the "No X Y found" line and still returns false when quiet is set', async () => {
    const adapter = getAdapter('claude', 'rules');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const hadEntries = await installEntriesForAdapter(adapter, projectPath, { quiet: true });
      expect(hadEntries).toBe(false);
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });
});

describe('installEntriesForTool', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-install-tool-'));
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it('prints exactly one summary line across every adapter when nothing is configured', async () => {
    // Regression: this used to call installEntriesForAdapter once per adapter
    // with no quiet option, printing one "No X Y found" line per adapter
    // (~80 lines across the full registry) instead of a single summary.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await installEntriesForTool(adapterRegistry.all(), projectPath);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No entries found'));
    } finally {
      logSpy.mockRestore();
    }
  });
});
