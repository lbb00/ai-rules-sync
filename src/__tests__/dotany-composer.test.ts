import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DotfileComposer } from '../dotany/composer.js';
import type { DotfileManager } from '../dotany/manager.js';
import type { ApplyResult, StatusResult } from '../dotany/types.js';

function createMockManager(overrides: Partial<DotfileManager> = {}): DotfileManager {
  return {
    apply: vi.fn(),
    status: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    stow: vi.fn(),
    unstow: vi.fn(),
    restow: vi.fn(),
    diff: vi.fn(),
    import: vi.fn(),
    readManifest: vi.fn(),
    ...overrides,
  } as unknown as DotfileManager;
}

describe('DotfileComposer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('apply', () => {
    it('should apply all managers in order', async () => {
      const result1: ApplyResult = { linked: [], skipped: [] };
      const result2: ApplyResult = {
        linked: [{ sourceName: 'rule1', targetName: 'rule1', linked: true, targetPath: '/p/rule1' }],
        skipped: ['bad'],
      };
      const m1 = createMockManager({ apply: vi.fn().mockResolvedValue(result1) });
      const m2 = createMockManager({ apply: vi.fn().mockResolvedValue(result2) });

      const composer = new DotfileComposer([m1, m2]);
      const results = await composer.apply();

      expect(results).toEqual([result1, result2]);
      expect(m1.apply).toHaveBeenCalledTimes(1);
      expect(m2.apply).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for no managers', async () => {
      const composer = new DotfileComposer([]);
      const results = await composer.apply();
      expect(results).toEqual([]);
    });
  });

  describe('status', () => {
    it('should get status from all managers in order', async () => {
      const status1: StatusResult = { entries: [] };
      const status2: StatusResult = {
        entries: [
          { alias: 'rule1', sourceName: 'rule1', targetPath: '/p/rule1', status: 'linked' },
        ],
      };
      const m1 = createMockManager({ status: vi.fn().mockResolvedValue(status1) });
      const m2 = createMockManager({ status: vi.fn().mockResolvedValue(status2) });

      const composer = new DotfileComposer([m1, m2]);
      const results = await composer.status();

      expect(results).toEqual([status1, status2]);
      expect(m1.status).toHaveBeenCalledTimes(1);
      expect(m2.status).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for no managers', async () => {
      const composer = new DotfileComposer([]);
      const results = await composer.status();
      expect(results).toEqual([]);
    });
  });
});
