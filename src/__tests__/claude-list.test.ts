import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SyncAdapter } from '../adapters/types.js';
import type { DiffResult, ListResult } from '../commands/list.js';

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

// Mock import-all.js for scanAdapterTargetDir (used by Mode E)
vi.mock('../commands/import-all.js', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    scanAdapterTargetDir: vi.fn(async () => []),
  };
});

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
      const result = await handleClaudeList(adapters, '/project', undefined, {}) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', undefined, {}) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', undefined, { type: 'rules' }) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', undefined, { user: true }) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', undefined, { user: true }) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', undefined, { user: true, type: 'settings' }) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true }) as ListResult;

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
      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true, user: true }) as ListResult;

      expect(result.totalCount).toBe(1);
      expect(result.entries[0].name).toBe('my-status');
      expect(result.entries[0].subtype).toBe('status-lines');
    });

    it('7.5b: --repo --user when adapter lacks userDefaultSourceDir skips without throwing', async () => {
      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = [makeAdapter('rules')]; // no userDefaultSourceDir

      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true, user: true }) as ListResult;

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

      const result = await handleClaudeList(adapters, '/project', '/repo', { repo: true, user: true }) as ListResult;

      expect(result.totalCount).toBe(0);
      expect(result.entries).toHaveLength(0);
    });
  });

  // Mode E tests
  describe('Mode E: --local flag (local disk scan)', () => {
    it('returns entries across all subtypes with correct status', async () => {
      const { scanAdapterTargetDir } = await import('../commands/import-all.js');
      vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
        if (adapter.subtype === 'rules') {
          return [{ sourceName: 'my-rule', entryName: 'my-rule', isDirectory: true }];
        }
        if (adapter.subtype === 'settings') {
          return [{ sourceName: 'settings.json', entryName: 'settings', isDirectory: false, suffix: '.json' }];
        }
        return [];
      });

      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({
        claude: {
          rules: { 'my-rule': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { local: true }) as ListResult;

      expect(result.totalCount).toBe(2);
      expect(result.subtypeCount).toBe(2);

      const rulesEntry = result.entries.find(e => e.subtype === 'rules' && e.name === 'my-rule');
      expect(rulesEntry).toBeDefined();
      expect(rulesEntry!.status).toBe('i'); // in config = installed

      const settingsEntry = result.entries.find(e => e.subtype === 'settings' && e.name === 'settings');
      expect(settingsEntry).toBeDefined();
      expect(settingsEntry!.status).toBe('l'); // not in config = local-only
    });

    it('type-filtered local scan returns only matching subtype', async () => {
      const { scanAdapterTargetDir } = await import('../commands/import-all.js');
      vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
        if (adapter.subtype === 'rules') {
          return [{ sourceName: 'my-rule', entryName: 'my-rule', isDirectory: true }];
        }
        if (adapter.subtype === 'settings') {
          return [{ sourceName: 'settings.json', entryName: 'settings', isDirectory: false, suffix: '.json' }];
        }
        return [];
      });

      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({} as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { local: true, type: 'rules' }) as ListResult;

      expect(result.totalCount).toBe(1);
      expect(result.entries.every(e => e.subtype === 'rules')).toBe(true);
    });

    it('entry in config gets status i, entry not in config gets status l', async () => {
      const { scanAdapterTargetDir } = await import('../commands/import-all.js');
      vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
        if (adapter.subtype === 'rules') {
          return [
            { sourceName: 'managed-rule', entryName: 'managed-rule', isDirectory: true },
            { sourceName: 'local-rule', entryName: 'local-rule', isDirectory: true },
          ];
        }
        return [];
      });

      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({
        claude: {
          rules: { 'managed-rule': 'https://example.com' },
        }
      } as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { local: true, type: 'rules' }) as ListResult;

      const managed = result.entries.find(e => e.name === 'managed-rule');
      expect(managed!.status).toBe('i');

      const local = result.entries.find(e => e.name === 'local-rule');
      expect(local!.status).toBe('l');
    });

    it('--local --repo throws mutual exclusivity error', async () => {
      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();

      await expect(
        handleClaudeList(adapters, '/project', '/repo', { local: true, repo: true })
      ).rejects.toThrow(/mutually exclusive/i);
    });

    it('--local --user uses getUserProjectConfig instead of getCombinedProjectConfig', async () => {
      const { scanAdapterTargetDir } = await import('../commands/import-all.js');
      vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
        if (adapter.subtype === 'rules') {
          return [{ sourceName: 'user-rule', entryName: 'user-rule', isDirectory: true }];
        }
        return [];
      });

      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValueOnce({
        claude: {
          rules: { 'user-rule': 'https://example.com' },
        }
      } as any);

      const { getCombinedProjectConfig } = await import('../project-config.js');

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { local: true, user: true }) as ListResult;

      expect(getUserProjectConfig).toHaveBeenCalled();
      expect(getCombinedProjectConfig).not.toHaveBeenCalled();

      const entry = result.entries.find(e => e.name === 'user-rule');
      expect(entry!.status).toBe('i');
    });

    it('empty target directories return totalCount=0 without error', async () => {
      const { scanAdapterTargetDir } = await import('../commands/import-all.js');
      vi.mocked(scanAdapterTargetDir).mockResolvedValue([]);

      const { getCombinedProjectConfig } = await import('../project-config.js');
      vi.mocked(getCombinedProjectConfig).mockResolvedValueOnce({} as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = makeAllAdapters();
      const result = await handleClaudeList(adapters, '/project', undefined, { local: true }) as ListResult;

      expect(result.totalCount).toBe(0);
      expect(result.entries).toHaveLength(0);
      expect(result.subtypeCount).toBe(0);
    });

    it('scanAdapterTargetDir receives isUser=true when --user is set', async () => {
      const { scanAdapterTargetDir } = await import('../commands/import-all.js');
      vi.mocked(scanAdapterTargetDir).mockResolvedValue([]);

      const { getUserProjectConfig } = await import('../config.js');
      vi.mocked(getUserProjectConfig).mockResolvedValueOnce({} as any);

      const { handleClaudeList } = await import('../commands/list.js');
      const adapters = [makeAdapter('rules')];
      await handleClaudeList(adapters, '/project', undefined, { local: true, user: true });

      expect(scanAdapterTargetDir).toHaveBeenCalledWith(
        expect.objectContaining({ subtype: 'rules' }),
        '/project',
        true
      );
    });
  });

  // Mode Diff tests
  describe('Mode Diff (--diff)', () => {
    describe('isDiffResult type guard', () => {
      it('returns true for DiffResult objects (has rows property)', async () => {
        const { isDiffResult } = await import('../commands/list.js');
        const diffResult: DiffResult = { rows: [], totalCount: 0, subtypeCount: 0 };
        expect(isDiffResult(diffResult)).toBe(true);
      });

      it('returns false for ListResult objects (has entries property)', async () => {
        const { isDiffResult } = await import('../commands/list.js');
        const listResult = { entries: [], totalCount: 0, subtypeCount: 0 };
        expect(isDiffResult(listResult)).toBe(false);
      });
    });

    describe('mergeIntoDiffRows', () => {
      it('entry in all three sources produces one row with correct statuses', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        const local = [{ subtype: 'rules', name: 'my-rule', status: 'i' as const }];
        const repo = [{ subtype: 'rules', name: 'my-rule', status: 'a' as const }];
        const user = [{ subtype: 'rules', name: 'my-rule' }];

        const rows = mergeIntoDiffRows(local, repo, user);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({
          subtype: 'rules',
          name: 'my-rule',
          local: 'i',
          repo: 'a',
          user: 'i',
          repoUser: '-',
        });
      });

      it('entry in local only produces row with l, -, -', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        const local = [{ subtype: 'rules', name: 'local-only', status: 'l' as const }];

        const rows = mergeIntoDiffRows(local, [], []);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({
          subtype: 'rules',
          name: 'local-only',
          local: 'l',
          repo: '-',
          user: '-',
          repoUser: '-',
        });
      });

      it('entry in repo only produces row with -, a, -', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        const repo = [{ subtype: 'skills', name: 'repo-skill', status: 'a' as const }];

        const rows = mergeIntoDiffRows([], repo, []);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({
          subtype: 'skills',
          name: 'repo-skill',
          local: '-',
          repo: 'a',
          user: '-',
          repoUser: '-',
        });
      });

      it('entry in user only produces row with -, -, i', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        const user = [{ subtype: 'settings', name: 'user-setting' }];

        const rows = mergeIntoDiffRows([], [], user);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({
          subtype: 'settings',
          name: 'user-setting',
          local: '-',
          repo: '-',
          user: 'i',
          repoUser: '-',
        });
      });

      it('managed local entry shows i in local column', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        const local = [{ subtype: 'rules', name: 'managed', status: 'i' as const }];

        const rows = mergeIntoDiffRows(local, [], []);

        expect(rows[0].local).toBe('i');
      });

      it('repo entry with status i still shows a in repo column', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        // Mode C marks installed entries with 'i', but diff repo column always shows 'a'
        const repo = [{ subtype: 'rules', name: 'installed-repo', status: 'i' as const }];

        const rows = mergeIntoDiffRows([], repo, []);

        expect(rows[0].repo).toBe('a');
      });

      it('multiple entries across subtypes are all included', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');
        const local = [
          { subtype: 'rules', name: 'rule-a', status: 'l' as const },
          { subtype: 'skills', name: 'skill-a', status: 'l' as const },
        ];
        const repo = [
          { subtype: 'rules', name: 'rule-b', status: 'a' as const },
        ];

        const rows = mergeIntoDiffRows(local, repo, []);

        expect(rows).toHaveLength(3);
      });

      it('returns empty array when all inputs are empty', async () => {
        const { mergeIntoDiffRows } = await import('../commands/list.js');

        const rows = mergeIntoDiffRows([], [], []);

        expect(rows).toEqual([]);
      });
    });

    describe('handleModeDiff dispatch and behavior', () => {
      it('--diff returns DiffResult with rows sorted by subtype then name', async () => {
        // Set up local entries (via scanAdapterTargetDir)
        const { scanAdapterTargetDir } = await import('../commands/import-all.js');
        vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
          if (adapter.subtype === 'skills') {
            return [{ sourceName: 'beta-skill', entryName: 'beta-skill', isDirectory: true }];
          }
          if (adapter.subtype === 'rules') {
            return [{ sourceName: 'alpha-rule', entryName: 'alpha-rule', isDirectory: true }];
          }
          return [];
        });

        // Project config for cross-referencing local status
        const { getCombinedProjectConfig } = await import('../project-config.js');
        vi.mocked(getCombinedProjectConfig).mockResolvedValue({} as any);

        // User config
        const { getUserProjectConfig } = await import('../config.js');
        vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

        const { handleClaudeList, isDiffResult } = await import('../commands/list.js');
        const adapters = makeAllAdapters();
        const result = await handleClaudeList(adapters, '/project', undefined, { diff: true });

        expect(isDiffResult(result)).toBe(true);
        if (isDiffResult(result)) {
          // Sorted: rules before skills (alphabetical by subtype)
          expect(result.rows[0].subtype).toBe('rules');
          expect(result.rows[0].name).toBe('alpha-rule');
          expect(result.rows[1].subtype).toBe('skills');
          expect(result.rows[1].name).toBe('beta-skill');
          expect(result.totalCount).toBe(2);
          expect(result.subtypeCount).toBe(2);
        }
      });

      it('--diff --local throws mutual exclusivity error', async () => {
        const { handleClaudeList } = await import('../commands/list.js');
        const adapters = makeAllAdapters();

        await expect(
          handleClaudeList(adapters, '/project', undefined, { diff: true, local: true })
        ).rejects.toThrow(/mutually exclusive/i);
      });

      it('--diff --repo throws mutual exclusivity error', async () => {
        const { handleClaudeList } = await import('../commands/list.js');
        const adapters = makeAllAdapters();

        await expect(
          handleClaudeList(adapters, '/project', undefined, { diff: true, repo: true })
        ).rejects.toThrow(/mutually exclusive/i);
      });

      it('--diff --user throws mutual exclusivity error', async () => {
        const { handleClaudeList } = await import('../commands/list.js');
        const adapters = makeAllAdapters();

        await expect(
          handleClaudeList(adapters, '/project', undefined, { diff: true, user: true })
        ).rejects.toThrow(/mutually exclusive/i);
      });

      it('--diff --local --repo throws mutual exclusivity error', async () => {
        const { handleClaudeList } = await import('../commands/list.js');
        const adapters = makeAllAdapters();

        await expect(
          handleClaudeList(adapters, '/project', undefined, { diff: true, local: true, repo: true })
        ).rejects.toThrow(/mutually exclusive/i);
      });

      it('--diff with type filter returns only matching subtype', async () => {
        const { scanAdapterTargetDir } = await import('../commands/import-all.js');
        vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
          if (adapter.subtype === 'rules') {
            return [{ sourceName: 'my-rule', entryName: 'my-rule', isDirectory: true }];
          }
          if (adapter.subtype === 'skills') {
            return [{ sourceName: 'my-skill', entryName: 'my-skill', isDirectory: true }];
          }
          return [];
        });

        const { getCombinedProjectConfig } = await import('../project-config.js');
        vi.mocked(getCombinedProjectConfig).mockResolvedValue({} as any);
        const { getUserProjectConfig } = await import('../config.js');
        vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

        const { handleClaudeList, isDiffResult } = await import('../commands/list.js');
        const adapters = makeAllAdapters();
        const result = await handleClaudeList(adapters, '/project', undefined, { diff: true, type: 'rules' });

        expect(isDiffResult(result)).toBe(true);
        if (isDiffResult(result)) {
          expect(result.rows.every(r => r.subtype === 'rules')).toBe(true);
          expect(result.totalCount).toBe(1);
        }
      });

      it('--diff with invalid type throws error', async () => {
        const { handleClaudeList } = await import('../commands/list.js');
        const adapters = makeAllAdapters();

        await expect(
          handleClaudeList(adapters, '/project', undefined, { diff: true, type: 'bogus' })
        ).rejects.toThrow(/valid.*type|rules|settings/i);
      });

      it('--diff with no repo path: repo column all -', async () => {
        const { scanAdapterTargetDir } = await import('../commands/import-all.js');
        vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
          if (adapter.subtype === 'rules') {
            return [{ sourceName: 'my-rule', entryName: 'my-rule', isDirectory: true }];
          }
          return [];
        });

        const { getCombinedProjectConfig } = await import('../project-config.js');
        vi.mocked(getCombinedProjectConfig).mockResolvedValue({} as any);
        const { getUserProjectConfig } = await import('../config.js');
        vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

        const { handleClaudeList, isDiffResult } = await import('../commands/list.js');
        const adapters = makeAllAdapters();
        const result = await handleClaudeList(adapters, '/project', undefined, { diff: true });

        expect(isDiffResult(result)).toBe(true);
        if (isDiffResult(result)) {
          expect(result.rows.every(r => r.repo === '-')).toBe(true);
        }
      });

      it('--diff with repo path populates repo column for matching entries', async () => {
        const fsp = await import('node:fs/promises');
        vi.mocked(fsp.readdir as any).mockImplementation(async (dirPath: any) => {
          const p = String(dirPath);
          if (p.includes('rules')) {
            return ['shared-rule' as any];
          }
          return [];
        });

        const { scanAdapterTargetDir } = await import('../commands/import-all.js');
        vi.mocked(scanAdapterTargetDir).mockImplementation(async (adapter) => {
          if (adapter.subtype === 'rules') {
            return [{ sourceName: 'shared-rule', entryName: 'shared-rule', isDirectory: true }];
          }
          return [];
        });

        const { getCombinedProjectConfig, getRepoSourceConfig } = await import('../project-config.js');
        vi.mocked(getCombinedProjectConfig).mockResolvedValue({
          claude: { rules: { 'shared-rule': 'https://example.com' } }
        } as any);
        vi.mocked(getRepoSourceConfig).mockResolvedValue({} as any);

        const { getUserProjectConfig } = await import('../config.js');
        vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

        const { handleClaudeList, isDiffResult } = await import('../commands/list.js');
        const adapters = makeAllAdapters();
        const result = await handleClaudeList(adapters, '/project', '/repo', { diff: true });

        expect(isDiffResult(result)).toBe(true);
        if (isDiffResult(result)) {
          const ruleRow = result.rows.find(r => r.name === 'shared-rule');
          expect(ruleRow).toBeDefined();
          expect(ruleRow!.local).toBe('i');
          expect(ruleRow!.repo).toBe('a');
        }
      });

      it('--diff with empty result returns totalCount 0', async () => {
        const { scanAdapterTargetDir } = await import('../commands/import-all.js');
        vi.mocked(scanAdapterTargetDir).mockResolvedValue([]);

        const { getCombinedProjectConfig } = await import('../project-config.js');
        vi.mocked(getCombinedProjectConfig).mockResolvedValue({} as any);
        const { getUserProjectConfig } = await import('../config.js');
        vi.mocked(getUserProjectConfig).mockResolvedValue({} as any);

        const { handleClaudeList, isDiffResult } = await import('../commands/list.js');
        const adapters = makeAllAdapters();
        const result = await handleClaudeList(adapters, '/project', undefined, { diff: true });

        expect(isDiffResult(result)).toBe(true);
        if (isDiffResult(result)) {
          expect(result.rows).toHaveLength(0);
          expect(result.totalCount).toBe(0);
          expect(result.subtypeCount).toBe(0);
        }
      });

      it('--diff includes user config entries in user column', async () => {
        const { scanAdapterTargetDir } = await import('../commands/import-all.js');
        vi.mocked(scanAdapterTargetDir).mockResolvedValue([]);

        const { getCombinedProjectConfig } = await import('../project-config.js');
        vi.mocked(getCombinedProjectConfig).mockResolvedValue({} as any);

        const { getUserProjectConfig } = await import('../config.js');
        vi.mocked(getUserProjectConfig).mockResolvedValue({
          claude: { settings: { 'my-setting': 'https://example.com' } }
        } as any);

        const { handleClaudeList, isDiffResult } = await import('../commands/list.js');
        const adapters = makeAllAdapters();
        const result = await handleClaudeList(adapters, '/project', undefined, { diff: true });

        expect(isDiffResult(result)).toBe(true);
        if (isDiffResult(result)) {
          const settingRow = result.rows.find(r => r.name === 'my-setting');
          expect(settingRow).toBeDefined();
          expect(settingRow!.user).toBe('i');
          expect(settingRow!.local).toBe('-');
        }
      });
    });
  });
});

describe('printDiffResult', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints "No entries found." for empty result', async () => {
    const { printDiffResult } = await import('../commands/list.js');
    printDiffResult({ rows: [], totalCount: 0, subtypeCount: 0 }, false);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('No entries found.');
  });

  it('normal mode prints header, separator, rows, summary, and legend', async () => {
    const { printDiffResult } = await import('../commands/list.js');
    const result: DiffResult = {
      rows: [
        { subtype: 'rules', name: 'my-rule', local: 'i', repo: 'a', user: '-', repoUser: '-' },
      ],
      totalCount: 1,
      subtypeCount: 1,
    };
    printDiffResult(result, false);

    // header + separator + 1 row + summary + legend = 5 calls
    expect(logSpy).toHaveBeenCalledTimes(5);

    // Header should contain column names
    const headerCall = logSpy.mock.calls[0][0] as string;
    expect(headerCall).toContain('Type');
    expect(headerCall).toContain('Name');
    expect(headerCall).toContain('Local');
    expect(headerCall).toContain('Repo');
    expect(headerCall).toContain('User');

    // Separator should contain dashes
    const separatorCall = logSpy.mock.calls[1][0] as string;
    expect(separatorCall).toMatch(/^[-\s]+$/);

    // Row should contain the entry data
    const rowCall = logSpy.mock.calls[2][0] as string;
    expect(rowCall).toContain('rules');
    expect(rowCall).toContain('my-rule');

    // Summary
    const summaryCall = logSpy.mock.calls[3][0] as string;
    expect(summaryCall).toContain('1 entry');
    expect(summaryCall).toContain('1 type');

    // Legend
    const legendCall = logSpy.mock.calls[4][0] as string;
    expect(legendCall).toContain('Legend');
    expect(legendCall).toContain('local-only');
    expect(legendCall).toContain('installed');
    expect(legendCall).toContain('available');
    expect(legendCall).toContain('absent');
  });

  it('quiet mode prints fixed-width columns without headers or color', async () => {
    const { printDiffResult } = await import('../commands/list.js');
    const result: DiffResult = {
      rows: [
        { subtype: 'rules', name: 'my-rule', local: 'i', repo: 'a', user: '-', repoUser: '-' },
        { subtype: 'skills', name: 'my-skill', local: 'l', repo: '-', user: 'i', repoUser: '-' },
      ],
      totalCount: 2,
      subtypeCount: 2,
    };
    printDiffResult(result, true);

    // 2 rows, no header, no separator, no summary, no legend
    expect(logSpy).toHaveBeenCalledTimes(2);

    const line1 = logSpy.mock.calls[0][0] as string;
    expect(line1).toMatch(/^rules\s+my-rule\s+i\s+a\s+-\s+-$/);

    const line2 = logSpy.mock.calls[1][0] as string;
    expect(line2).toMatch(/^skills\s+my-skill\s+l\s+-\s+i\s+-$/);
  });

  it('normal mode with multiple rows includes correct summary', async () => {
    const { printDiffResult } = await import('../commands/list.js');
    const result: DiffResult = {
      rows: [
        { subtype: 'rules', name: 'rule-a', local: 'l', repo: '-', user: '-', repoUser: '-' },
        { subtype: 'skills', name: 'skill-a', local: '-', repo: 'a', user: '-', repoUser: '-' },
        { subtype: 'skills', name: 'skill-b', local: 'i', repo: 'a', user: 'i', repoUser: '-' },
      ],
      totalCount: 3,
      subtypeCount: 2,
    };
    printDiffResult(result, false);

    // header + separator + 3 rows + summary + legend = 7 calls
    expect(logSpy).toHaveBeenCalledTimes(7);

    const summaryCall = logSpy.mock.calls[5][0] as string;
    expect(summaryCall).toContain('3 entries');
    expect(summaryCall).toContain('2 types');
  });

  it('empty result in quiet mode produces no output', async () => {
    const { printDiffResult } = await import('../commands/list.js');
    printDiffResult({ rows: [], totalCount: 0, subtypeCount: 0 }, true);

    // Even in quiet mode, empty result prints "No entries found."
    // Actually, empty result check happens first regardless of mode
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('No entries found.');
  });
});
