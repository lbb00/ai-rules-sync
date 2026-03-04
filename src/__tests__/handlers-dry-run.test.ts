import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, vi } from 'vitest';
import { handleRemove } from '../commands/handlers.js';
import { SyncAdapter } from '../adapters/types.js';

describe('handleRemove dry-run', () => {
  it('should preview without unlinking or mutating config', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-remove-dry-run-'));
    await fs.ensureDir(path.join(projectPath, '.cursor', 'rules'));

    const adapter: SyncAdapter = {
      name: 'cursor-rules',
      tool: 'cursor',
      subtype: 'rules',
      configPath: ['cursor', 'rules'],
      defaultSourceDir: '.cursor/rules',
      targetDir: '.cursor/rules',
      mode: 'hybrid',
      hybridFileSuffixes: ['.md', '.mdc'],
      forProject: vi.fn(() => {
        throw new Error('forProject should not be called in dry-run');
      }) as any,
      addDependency: vi.fn(async () => {}),
      removeDependency: vi.fn(async () => ({ removedFrom: [] })),
      link: vi.fn(async () => ({ sourceName: 'rule', targetName: 'rule', linked: true })),
      unlink: vi.fn(async () => {})
    };

    const result = await handleRemove(adapter, projectPath, 'react', false, { dryRun: true });

    expect(result).toEqual({ removedFrom: [] });
    expect(adapter.unlink).not.toHaveBeenCalled();
    expect(adapter.removeDependency).not.toHaveBeenCalled();
  });
});
