import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { claudeMdAdapter } from '../adapters/claude-md.js';
import { adapterRegistry } from '../adapters/index.js';

describe('claude-md adapter', () => {
  it('should have correct basic properties', () => {
    expect(claudeMdAdapter.name).toBe('claude-md');
    expect(claudeMdAdapter.tool).toBe('claude');
    expect(claudeMdAdapter.subtype).toBe('md');
    expect(claudeMdAdapter.defaultSourceDir).toBe('.claude');
    expect(claudeMdAdapter.targetDir).toBe('.claude');
    expect(claudeMdAdapter.mode).toBe('file');
    expect(claudeMdAdapter.fileSuffixes).toEqual(['.md']);
  });

  it('should have resolveSource and resolveTargetName hooks', () => {
    expect(claudeMdAdapter.resolveSource).toBeDefined();
    expect(claudeMdAdapter.resolveTargetName).toBeDefined();
  });

  it('should be registered in adapterRegistry', () => {
    expect(adapterRegistry.get('claude', 'md')).toBe(claudeMdAdapter);
  });

  describe('resolveSource with sourceFileOverride', () => {
    let repoDir: string;

    beforeEach(async () => {
      repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-claude-md-'));
    });

    afterEach(async () => {
      await fs.remove(repoDir);
    });

    it('should resolve common/AGENTS.md when sourceFileOverride is set', async () => {
      await fs.ensureDir(path.join(repoDir, 'common'));
      await fs.writeFile(path.join(repoDir, 'common', 'AGENTS.md'), '# AGENTS.md content');

      const resolved = await claudeMdAdapter.resolveSource!(
        repoDir,
        'common',
        'any-name',
        { sourceFileOverride: 'AGENTS.md' }
      );

      expect(resolved.sourceName).toBe('AGENTS.md');
      expect(resolved.sourcePath).toBe(path.join(repoDir, 'common', 'AGENTS.md'));
      expect(resolved.suffix).toBe('.md');
    });

    it('should resolve common/AGENTS.md with nested path', async () => {
      await fs.ensureDir(path.join(repoDir, 'common'));
      await fs.writeFile(path.join(repoDir, 'common', 'AGENTS.md'), '# content');

      const resolved = await claudeMdAdapter.resolveSource!(
        repoDir,
        'common',
        'CLAUDE',
        { sourceFileOverride: 'AGENTS.md' }
      );

      expect(resolved.sourcePath).toBe(path.join(repoDir, 'common', 'AGENTS.md'));
    });

    it('should throw when sourceFileOverride points to non-existent file', async () => {
      await fs.ensureDir(path.join(repoDir, 'common'));

      await expect(
        claudeMdAdapter.resolveSource!(repoDir, 'common', 'x', { sourceFileOverride: 'MISSING.md' })
      ).rejects.toThrow(/not found/);
    });

    it('should use default resolver when no sourceFileOverride', async () => {
      await fs.ensureDir(path.join(repoDir, '.claude'));
      await fs.writeFile(path.join(repoDir, '.claude', 'CLAUDE.md'), '# CLAUDE content');

      const resolved = await claudeMdAdapter.resolveSource!(repoDir, '.claude', 'CLAUDE');

      expect(resolved.sourceName).toBe('CLAUDE.md');
      expect(resolved.sourcePath).toBe(path.join(repoDir, '.claude', 'CLAUDE.md'));
    });
  });
});
