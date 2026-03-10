import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { handleImport, previewImport, ImportCommandOptions, CommandContext } from '../commands/handlers.js';
import { SyncAdapter } from '../adapters/types.js';

// Mock execa so git commands don't actually run
vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ stdout: '', stderr: '' }))
}));

// Mock project-config functions
vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(async () => ({})),
    getRepoSourceConfig: vi.fn(async () => ({})),
    getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
    getTargetDir: vi.fn((_config: unknown, _tool: string, _subtype: string, _name: string, defaultDir: string) => defaultDir),
    addUserDependency: vi.fn(async () => {}),
  };
});

// Mock config.js for getUserProjectConfig/getUserConfigPath
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getUserProjectConfig: vi.fn(async () => ({})),
    getUserConfigPath: vi.fn(async () => '/mock/user-config/user.json'),
  };
});

describe('import --user mode', () => {
  let tmpDir: string;
  let repoDir: string;
  let userHome: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-import-user-'));
    repoDir = path.join(tmpDir, 'repo');
    userHome = path.join(tmpDir, 'home');

    // Set up rules repo with .claude/agents source dir
    await fs.ensureDir(path.join(repoDir, '.claude', 'agents'));
    await fs.ensureDir(path.join(repoDir, '.git'));

    // Set up user home with an agent file
    await fs.ensureDir(path.join(userHome, '.claude', 'agents'));
    await fs.writeFile(
      path.join(userHome, '.claude', 'agents', 'my-agent.md'),
      '# My Agent\nDoes things.'
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  function createMockAdapter(): SyncAdapter {
    return {
      name: 'claude-agents',
      tool: 'claude',
      subtype: 'agents',
      configPath: ['claude', 'agents'],
      defaultSourceDir: '.claude/agents',
      targetDir: '.claude/agents',
      mode: 'file',
      fileSuffixes: ['.md'],
      forProject: vi.fn(() => ({
        add: vi.fn(),
        remove: vi.fn(),
        apply: vi.fn(),
        diff: vi.fn(),
        status: vi.fn(),
        readManifest: vi.fn(),
        import: vi.fn(async () => ({
          sourceName: 'my-agent.md',
          targetName: 'my-agent.md',
          linked: true,
          targetPath: path.join(userHome, '.claude', 'agents', 'my-agent.md'),
        })),
      })) as any,
      addDependency: vi.fn(async () => {}),
      removeDependency: vi.fn(async () => ({ removedFrom: [] })),
      link: vi.fn(async () => ({ sourceName: 'my-agent.md', targetName: 'my-agent.md', linked: true })),
      unlink: vi.fn(async () => {}),
    };
  }

  describe('previewImport', () => {
    it('should resolve source from user home when ctx.user is true', async () => {
      const adapter = createMockAdapter();
      const ctx: CommandContext = {
        projectPath: userHome,
        repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
        isLocal: false,
        user: true,
        skipIgnore: true,
      };

      const preview = await previewImport(adapter, ctx, 'my-agent.md', {});

      expect(preview.sourceExists).toBe(true);
      expect(preview.sourcePath).toContain(path.join(userHome, '.claude', 'agents', 'my-agent.md'));
      expect(preview.sourceIsSymlink).toBe(false);
    });

    it('should report source not found in user home when file is missing', async () => {
      const adapter = createMockAdapter();
      const ctx: CommandContext = {
        projectPath: userHome,
        repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
        isLocal: false,
        user: true,
        skipIgnore: true,
      };

      const preview = await previewImport(adapter, ctx, 'nonexistent.md', {});

      expect(preview.sourceExists).toBe(false);
    });
  });

  describe('handleImport', () => {
    it('should use user config instead of project config when ctx.user is true', async () => {
      const adapter = createMockAdapter();
      const { addUserDependency } = await import('../project-config.js');

      const ctx: CommandContext = {
        projectPath: userHome,
        repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
        isLocal: false,
        user: true,
        skipIgnore: true,
      };

      await handleImport(adapter, ctx, 'my-agent.md', {});

      // Should register in user config, not project config
      expect(addUserDependency).toHaveBeenCalledWith(
        ['claude', 'agents'],
        'my-agent.md',
        'https://github.com/test/repo.git',
        undefined,
        undefined,
      );

      // Should NOT call addDependency (project-level)
      expect(adapter.addDependency).not.toHaveBeenCalled();
    });

    it('should skip gitignore management when ctx.user is true', async () => {
      const adapter = createMockAdapter();

      const ctx: CommandContext = {
        projectPath: userHome,
        repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
        isLocal: false,
        user: true,
        skipIgnore: true,
      };

      await handleImport(adapter, ctx, 'my-agent.md', {});

      // Should not have created a .gitignore in user home
      const gitignoreExists = await fs.pathExists(path.join(userHome, '.gitignore'));
      expect(gitignoreExists).toBe(false);
    });

    it('should not use user config when ctx.user is falsy', async () => {
      const adapter = createMockAdapter();
      const projectPath = path.join(tmpDir, 'project');
      await fs.ensureDir(path.join(projectPath, '.claude', 'agents'));
      await fs.writeFile(
        path.join(projectPath, '.claude', 'agents', 'my-agent.md'),
        '# My Agent'
      );

      const ctx: CommandContext = {
        projectPath,
        repo: { name: 'test-repo', url: 'https://github.com/test/repo.git', path: repoDir },
        isLocal: false,
      };

      await handleImport(adapter, ctx, 'my-agent.md', {});

      // Should call addDependency (project-level), not addUserDependency
      expect(adapter.addDependency).toHaveBeenCalled();
    });
  });
});
