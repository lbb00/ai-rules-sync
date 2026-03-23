import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs-extra')>();
  return {
    ...actual,
    default: {
      ...actual,
      pathExists: vi.fn(),
      readJson: vi.fn(),
      writeJson: vi.fn(),
      ensureDir: vi.fn(),
    },
  };
});

import fs from 'fs-extra';
import { JsonManifest } from '../dotany/manifest/json.js';

const mockedFs = vi.mocked(fs);

describe('JsonManifest', () => {
  const filePath = '/project/manifest.json';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('without namespace', () => {
    describe('readAll', () => {
      it('should return empty object when file does not exist', async () => {
        mockedFs.pathExists.mockResolvedValue(false as never);
        const manifest = new JsonManifest(filePath);
        const result = await manifest.readAll();
        expect(result).toEqual({});
      });

      it('should return all entries from file', async () => {
        const data = {
          rule1: { sourceName: 'rule1', meta: { repoUrl: 'https://repo.git' } },
          rule2: { sourceName: 'rule2', meta: { repoUrl: 'https://other.git' } },
        };
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(data);

        const manifest = new JsonManifest(filePath);
        const result = await manifest.readAll();
        expect(result).toEqual(data);
      });

      it('should return empty object for non-object content', async () => {
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(null);

        const manifest = new JsonManifest(filePath);
        const result = await manifest.readAll();
        expect(result).toEqual({});
      });
    });

    describe('write', () => {
      it('should create file with entry when file does not exist', async () => {
        mockedFs.pathExists.mockResolvedValue(false as never);
        mockedFs.ensureDir.mockResolvedValue(undefined as never);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath);
        const entry = { sourceName: 'rule1', meta: { repoUrl: 'https://repo.git' } };
        await manifest.write('rule1', entry);

        expect(mockedFs.writeJson).toHaveBeenCalledWith(
          filePath,
          { rule1: entry },
          { spaces: 2 }
        );
      });

      it('should merge entry into existing file', async () => {
        const existing = { rule1: { sourceName: 'rule1' } };
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(existing);
        mockedFs.ensureDir.mockResolvedValue(undefined as never);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath);
        const newEntry = { sourceName: 'rule2', meta: { repoUrl: 'https://repo.git' } };
        await manifest.write('rule2', newEntry);

        expect(mockedFs.writeJson).toHaveBeenCalledWith(
          filePath,
          { rule1: existing.rule1, rule2: newEntry },
          { spaces: 2 }
        );
      });
    });

    describe('delete', () => {
      it('should do nothing when file does not exist', async () => {
        mockedFs.pathExists.mockResolvedValue(false as never);
        const manifest = new JsonManifest(filePath);
        await manifest.delete('rule1');
        expect(mockedFs.writeJson).not.toHaveBeenCalled();
      });

      it('should remove entry and write back', async () => {
        const existing = {
          rule1: { sourceName: 'rule1' },
          rule2: { sourceName: 'rule2' },
        };
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(existing);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath);
        await manifest.delete('rule1');

        expect(mockedFs.writeJson).toHaveBeenCalledWith(
          filePath,
          { rule2: { sourceName: 'rule2' } },
          { spaces: 2 }
        );
      });
    });
  });

  describe('with namespace', () => {
    const ns = 'claude.rules';

    describe('readAll', () => {
      it('should return entries from namespace', async () => {
        const data = {
          'claude.rules': {
            rule1: { sourceName: 'rule1' },
          },
          'cursor.rules': {
            other: { sourceName: 'other' },
          },
        };
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(data);

        const manifest = new JsonManifest(filePath, ns);
        const result = await manifest.readAll();
        expect(result).toEqual({ rule1: { sourceName: 'rule1' } });
      });

      it('should return empty object when namespace does not exist', async () => {
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue({ other: {} });

        const manifest = new JsonManifest(filePath, ns);
        const result = await manifest.readAll();
        expect(result).toEqual({});
      });

      it('should return empty object when namespace is not an object', async () => {
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue({ [ns]: 'not-an-object' });

        const manifest = new JsonManifest(filePath, ns);
        const result = await manifest.readAll();
        expect(result).toEqual({});
      });
    });

    describe('write', () => {
      it('should create namespace section if not present', async () => {
        mockedFs.pathExists.mockResolvedValue(false as never);
        mockedFs.ensureDir.mockResolvedValue(undefined as never);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath, ns);
        const entry = { sourceName: 'rule1' };
        await manifest.write('rule1', entry);

        expect(mockedFs.writeJson).toHaveBeenCalledWith(
          filePath,
          { [ns]: { rule1: entry } },
          { spaces: 2 }
        );
      });

      it('should add to existing namespace', async () => {
        const existing = { [ns]: { rule1: { sourceName: 'rule1' } } };
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(existing);
        mockedFs.ensureDir.mockResolvedValue(undefined as never);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath, ns);
        const newEntry = { sourceName: 'rule2' };
        await manifest.write('rule2', newEntry);

        expect(mockedFs.writeJson).toHaveBeenCalledWith(
          filePath,
          { [ns]: { rule1: { sourceName: 'rule1' }, rule2: newEntry } },
          { spaces: 2 }
        );
      });

      it('should overwrite non-object namespace value', async () => {
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue({ [ns]: 'bad' });
        mockedFs.ensureDir.mockResolvedValue(undefined as never);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath, ns);
        const entry = { sourceName: 'rule1' };
        await manifest.write('rule1', entry);

        const written = (mockedFs.writeJson.mock.calls[0][1] as any)[ns];
        expect(written.rule1).toEqual(entry);
      });
    });

    describe('delete', () => {
      it('should remove entry from namespace', async () => {
        const data = {
          [ns]: { rule1: { sourceName: 'rule1' }, rule2: { sourceName: 'rule2' } },
        };
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue(data);
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath, ns);
        await manifest.delete('rule1');

        const written = (mockedFs.writeJson.mock.calls[0][1] as any)[ns];
        expect(written).toEqual({ rule2: { sourceName: 'rule2' } });
      });

      it('should handle delete when namespace does not exist', async () => {
        mockedFs.pathExists.mockResolvedValue(true as never);
        mockedFs.readJson.mockResolvedValue({ other: {} });
        mockedFs.writeJson.mockResolvedValue(undefined as never);

        const manifest = new JsonManifest(filePath, ns);
        await manifest.delete('rule1');
        // Should write back without error
        expect(mockedFs.writeJson).toHaveBeenCalled();
      });
    });
  });
});
