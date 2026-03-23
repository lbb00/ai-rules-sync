import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SyncAdapter } from '../adapters/types.js';

// Mock project-config for config reads
vi.mock('../project-config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getCombinedProjectConfig: vi.fn(async () => ({})),
    getRepoSourceConfig: vi.fn(async () => ({})),
    getSourceDir: vi.fn((_config: unknown, _tool: string, _subtype: string, defaultDir: string) => defaultDir),
  };
});

// Mock config.js for user config reads
vi.mock('../config.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getUserProjectConfig: vi.fn(async () => ({})),
  };
});

// Mock node:fs/promises for readdir (list.ts uses this for ESM named export compatibility)
vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(async () => [] as string[]),
}));

function makeAdapter(subtype: string, overrides: Partial<SyncAdapter> = {}): SyncAdapter {
  return {
    name: `claude-${subtype}`,
    tool: 'claude',
    subtype,
    configPath: ['claude', subtype] as [string, string],
    defaultSourceDir: `.claude/${subtype}`,
    targetDir: `.claude/${subtype}`,
    mode: 'directory',
    forProject: vi.fn() as any,
    addDependency: vi.fn(async () => {}),
    removeDependency: vi.fn(async () => ({ removedFrom: [] })),
    link: vi.fn(async () => ({ sourceName: '', targetName: '', linked: true })),
    unlink: vi.fn(async () => {}),
    ...overrides,
  };
}

const CLAUDE_SUBTYPES = ['rules', 'skills', 'agents', 'commands', 'md', 'status-lines', 'agent-memory', 'settings'];

function makeAllAdapters(): SyncAdapter[] {
  return CLAUDE_SUBTYPES.map(s => makeAdapter(s));
}

describe('handleClaudeList', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Restore default readdir to return empty array after each reset
    const fsp = await import('node:fs/promises');
    vi.mocked(fsp.readdir as any).mockResolvedValue([]);
  });

  // Mode A tests
  describe('Mode A: no flags (installed entries from project config)', () => {
    it('7.2a: returns grouped entries from project config across all subtypes', async () => {
      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({
        claude: {
          rules: { 'my-rule': 'https://example.com' },
          settings: { 'settings.json': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, {});

      const rulesEntries = result.entries.filter(e => e.subtype === 'rules');
      const settingsEntries = result.entries.filter(e => e.subtype === 'settings');
      expect(rulesEntries).toHaveLength(1);
      expect(rulesEntries[0].name).toBe('my-rule');
      expect(settingsEntries).toHaveLength(1);
      expect(settingsEntries[0].name).toBe('settings.json');
      expect(result.totalCount).toBe(2);
      expect(result.subtypeCount).toBe(2);
    });

    it('7.2b: missing config file yields totalCount=0', async () => {
      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({});

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, {});

      expect(result.totalCount).toBe(0);
      expect(result.entries).toHaveLength(0);
    });

    it('7.2c: type filter returns only matching subtype entries', async () => {
      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({
        claude: {
          rules: { 'my-rule': 'https://example.com' },
          settings: { 'settings.json': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { type: 'rules' });

      expect(result.entries.every(e => e.subtype === 'rules')).toBe(true);
      expect(result.totalCount).toBe(1);
    });

    it('7.2d: invalid type throws error with valid type list', async () => {
      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();

      await expect(
        handleClaudeList(adapters, '/project', undefined, { type: 'invalid-type' })
      ).rejects.toThrow(/valid.*type|rules|settings/i);
    });
  });

  // Mode B tests
  describe('Mode B: --user flag (user-level installed entries)', () => {
    it('7.3a: --user with entries in user.json returns user entries', async () => {
      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValueOnce({
        claude: {
          settings: { 'settings.json': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { user: true });

      const settingsEntries = result.entries.filter(e => e.subtype === 'settings');
      expect(settingsEntries).toHaveLength(1);
      expect(settingsEntries[0].name).toBe('settings.json');
      expect(result.totalCount).toBe(1);
    });

    it('7.3b: --user with empty user.json returns totalCount=0', async () => {
      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValueOnce({} as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { user: true });

      expect(result.totalCount).toBe(0);
      expect(result.entries).toHaveLength(0);
    });

    it('7.3c: type filter with --user returns only matching user entries', async () => {
      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValueOnce({
        claude: {
          rules: { 'my-rule': 'https://example.com' },
          settings: { 'settings.json': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { user: true, type: 'settings' });

      expect(result.entries.every(e => e.subtype === 'settings')).toBe(true);
      expect(result.totalCount).toBe(1);
    });
  });

  // Mode C tests
  describe('Mode C: --repo flag (repo source entries)', () => {
    it('7.4a: --repo sets entry.installed based on project config', async () => {
      const fsp = await import('node:fs/promises');
      vi.mocked(fsp.readdir as any).mockImplementation(async (dirPath: any) => {
        if (String(dirPath).includes('rules')) {
          return ['my-rule' as any];
        }
        return [];
      });

      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValue({
        claude: {
          rules: { 'my-rule': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true });

      const installed = result.entries.find(e => e.subtype === 'rules' && e.name === 'my-rule');
      expect(installed).toBeDefined();
      expect(installed?.status).toBe('i');
    });

    it('7.4b: --repo when repo path is inaccessible throws with descriptive error', async () => {
      const fsp = await import('node:fs/promises');
      vi.mocked(fsp.readdir as any).mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = [makeAdapter('rules')];

      await expect(
        handleClaudeList(adapters, '/project', '/nonexistent-repo', { repo: true, type: 'rules' })
      ).rejects.toThrow(/repo|inaccessible|not found|ENOENT/i);
    });
  });

  // Mode D tests
  describe('Mode D: --repo --user flags (repo user-source entries)', () => {
    it('7.5a: --repo --user reads adapter.userDefaultSourceDir', async () => {
      const fsp = await import('node:fs/promises');
      vi.mocked(fsp.readdir as any).mockImplementation(async (dirPath: any) => {
        if (String(dirPath).includes('.claude/user/status-lines')) {
          return ['my-status' as any];
        }
        return [];
      });

      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = [
        makeAdapter('status-lines', { userDefaultSourceDir: '.claude/user/status-lines' }),
      ];
      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true, user: true });

      expect(result.totalCount).toBe(1);
      expect(result.entries[0].name).toBe('my-status');
      expect(result.entries[0].subtype).toBe('status-lines');
    });

    it('7.5b: --repo --user when adapter lacks userDefaultSourceDir skips without throwing', async () => {
      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = [makeAdapter('rules')]; // no userDefaultSourceDir

      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true, user: true });

      expect(result.totalCount).toBe(0);
      expect(result.entries).toHaveLength(0);
    });

    it('7.5c: --repo --user when userDefaultSourceDir dir is missing returns empty without throwing', async () => {
      const fsp = await import('node:fs/promises');
      const enoentErr = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
      vi.mocked(fsp.readdir as any).mockRejectedValue(enoentErr);

      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = [makeAdapter('settings', { userDefaultSourceDir: '.claude/user' })];

      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true, user: true });

      expect(result.totalCount).toBe(0);
      expect(result.entries).toHaveLength(0);
    });
  });
});
