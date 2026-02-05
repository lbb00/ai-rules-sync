import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getVersionInfo, formatVersionOutput, getFormattedVersion } from '../commands/version.js';
import fs from 'fs-extra';

// Mock fs-extra
vi.mock('fs-extra');

describe('version module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVersionInfo', () => {
    it('should read version information from package.json files', async () => {
      // Mock project package.json
      vi.mocked(fs.readJson).mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('node_modules/linkany')) {
          return Promise.resolve({ version: '0.0.3' });
        }
        return Promise.resolve({ version: '0.4.0' });
      });
      (vi.mocked(fs.pathExists) as any).mockResolvedValue(true);

      const result = await getVersionInfo();

      expect(result.projectVersion).toBe('0.4.0');
      expect(result.linkanyVersion).toBe('0.0.3');
    });

    it('should return unknown if linkany is not installed', async () => {
      vi.mocked(fs.readJson).mockResolvedValue({ version: '0.4.0' });
      (vi.mocked(fs.pathExists) as any).mockResolvedValue(false);

      const result = await getVersionInfo();

      expect(result.projectVersion).toBe('0.4.0');
      expect(result.linkanyVersion).toBe('unknown');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.readJson).mockRejectedValue(new Error('File not found'));

      const result = await getVersionInfo();

      expect(result.projectVersion).toBe('unknown');
      expect(result.linkanyVersion).toBe('unknown');
    });
  });

  describe('formatVersionOutput', () => {
    it('should format version output with powered by message', () => {
      const output = formatVersionOutput({
        projectVersion: '0.4.0',
        linkanyVersion: '0.0.3'
      });

      expect(output).toBe('ai-rules-sync 0.4.0 (powered by linkany 0.0.3)');
    });

    it('should handle unknown versions', () => {
      const output = formatVersionOutput({
        projectVersion: 'unknown',
        linkanyVersion: 'unknown'
      });

      expect(output).toBe('ai-rules-sync unknown (powered by linkany unknown)');
    });
  });

  describe('getFormattedVersion', () => {
    it('should return formatted version string', async () => {
      vi.mocked(fs.readJson).mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('linkany')) {
          return Promise.resolve({ version: '0.0.3' });
        }
        return Promise.resolve({ version: '0.4.0' });
      });
      (vi.mocked(fs.pathExists) as any).mockResolvedValue(true);

      const result = await getFormattedVersion();

      expect(result).toContain('ai-rules-sync');
      expect(result).toContain('powered by linkany');
    });
  });
});
