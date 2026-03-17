import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBaseAdapter,
  createSingleSuffixResolver,
  createMultiSuffixResolver,
  createSuffixAwareTargetResolver,
} from '../adapters/base.js';

describe('createBaseAdapter', () => {
  it('should create adapter with all config properties', () => {
    const adapter = createBaseAdapter({
      name: 'test-rules',
      tool: 'test',
      subtype: 'rules',
      configPath: ['test', 'rules'],
      defaultSourceDir: '.test/rules',
      targetDir: '.test/rules',
      mode: 'file',
      fileSuffixes: ['.md'],
    });

    expect(adapter.name).toBe('test-rules');
    expect(adapter.tool).toBe('test');
    expect(adapter.subtype).toBe('rules');
    expect(adapter.configPath).toEqual(['test', 'rules']);
    expect(adapter.defaultSourceDir).toBe('.test/rules');
    expect(adapter.targetDir).toBe('.test/rules');
    expect(adapter.mode).toBe('file');
    expect(adapter.fileSuffixes).toEqual(['.md']);
  });

  it('should set userTargetDir when provided', () => {
    const adapter = createBaseAdapter({
      name: 'test-rules',
      tool: 'test',
      subtype: 'rules',
      configPath: ['test', 'rules'],
      defaultSourceDir: '.test/rules',
      targetDir: '.test/rules',
      userTargetDir: '.global/test/rules',
      mode: 'file',
    });

    expect(adapter.userTargetDir).toBe('.global/test/rules');
  });

  it('should set hybridFileSuffixes when provided', () => {
    const adapter = createBaseAdapter({
      name: 'test-rules',
      tool: 'test',
      subtype: 'rules',
      configPath: ['test', 'rules'],
      defaultSourceDir: '.test/rules',
      targetDir: '.test/rules',
      mode: 'hybrid',
      hybridFileSuffixes: ['.md', '.mdc'],
    });

    expect(adapter.hybridFileSuffixes).toEqual(['.md', '.mdc']);
  });

  it('should pass resolveSource and resolveTargetName hooks', () => {
    const resolveSource = vi.fn();
    const resolveTargetName = vi.fn();
    const adapter = createBaseAdapter({
      name: 'test-rules',
      tool: 'test',
      subtype: 'rules',
      configPath: ['test', 'rules'],
      defaultSourceDir: '.test/rules',
      targetDir: '.test/rules',
      mode: 'file',
      resolveSource,
      resolveTargetName,
    });

    expect(adapter.resolveSource).toBe(resolveSource);
    expect(adapter.resolveTargetName).toBe(resolveTargetName);
  });
});

describe('createSingleSuffixResolver', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-resolver-'));
    await fs.ensureDir(path.join(tmpDir, 'src'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  const resolver = createSingleSuffixResolver('.md', 'Rule');

  it('should resolve when name already has suffix', async () => {
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.md'), '# Rule');
    const result = await resolver(tmpDir, 'src', 'my-rule.md');
    expect(result.sourceName).toBe('my-rule.md');
    expect(result.suffix).toBe('.md');
  });

  it('should throw when name has suffix but file not found', async () => {
    await expect(resolver(tmpDir, 'src', 'missing.md')).rejects.toThrow(
      'Rule "missing.md" not found in repository.'
    );
  });

  it('should resolve by appending suffix', async () => {
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.md'), '# Rule');
    const result = await resolver(tmpDir, 'src', 'my-rule');
    expect(result.sourceName).toBe('my-rule.md');
    expect(result.suffix).toBe('.md');
  });

  it('should resolve exact name as fallback (directory or exact file)', async () => {
    await fs.ensureDir(path.join(tmpDir, 'src', 'my-dir'));
    const result = await resolver(tmpDir, 'src', 'my-dir');
    expect(result.sourceName).toBe('my-dir');
    expect(result.suffix).toBeUndefined();
  });

  it('should throw when nothing matches', async () => {
    await expect(resolver(tmpDir, 'src', 'nonexistent')).rejects.toThrow(
      'Rule "nonexistent" not found in repository.'
    );
  });
});

describe('createMultiSuffixResolver', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-multi-resolver-'));
    await fs.ensureDir(path.join(tmpDir, 'src'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  const resolver = createMultiSuffixResolver(['.md', '.mdc'], 'Rule');

  it('should resolve directory when exact name is a directory', async () => {
    await fs.ensureDir(path.join(tmpDir, 'src', 'my-rule'));
    const result = await resolver(tmpDir, 'src', 'my-rule');
    expect(result.sourceName).toBe('my-rule');
    expect(result.suffix).toBeUndefined();
  });

  it('should resolve file with known suffix when exact name is a file', async () => {
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.md'), '# Rule');
    const result = await resolver(tmpDir, 'src', 'my-rule.md');
    expect(result.sourceName).toBe('my-rule.md');
    expect(result.suffix).toBe('.md');
  });

  it('should resolve by trying suffixes in order', async () => {
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.mdc'), '# Rule');
    const result = await resolver(tmpDir, 'src', 'my-rule');
    expect(result.sourceName).toBe('my-rule.mdc');
    expect(result.suffix).toBe('.mdc');
  });

  it('should prefer first suffix when multiple exist', async () => {
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.md'), '# Rule md');
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.mdc'), '# Rule mdc');
    const result = await resolver(tmpDir, 'src', 'my-rule');
    expect(result.sourceName).toBe('my-rule.md');
    expect(result.suffix).toBe('.md');
  });

  it('should throw when nothing matches', async () => {
    await expect(resolver(tmpDir, 'src', 'nonexistent')).rejects.toThrow(
      'Rule "nonexistent" not found in repository.'
    );
  });

  it('should resolve file without known suffix', async () => {
    await fs.writeFile(path.join(tmpDir, 'src', 'my-rule.txt'), '# Rule');
    const result = await resolver(tmpDir, 'src', 'my-rule.txt');
    expect(result.sourceName).toBe('my-rule.txt');
    expect(result.suffix).toBeUndefined(); // .txt is not in the suffix list
  });
});

describe('createSuffixAwareTargetResolver', () => {
  const resolver = createSuffixAwareTargetResolver(['.md', '.mdc']);

  it('should return name when no alias and no source suffix', () => {
    expect(resolver('my-rule')).toBe('my-rule');
  });

  it('should return alias when alias provided', () => {
    expect(resolver('my-rule', 'custom-alias')).toBe('custom-alias');
  });

  it('should append source suffix to alias when alias lacks suffix', () => {
    expect(resolver('my-rule.md', 'custom-alias', '.md')).toBe('custom-alias.md');
  });

  it('should not double-append suffix when alias already has it', () => {
    expect(resolver('my-rule.md', 'custom-alias.md', '.md')).toBe('custom-alias.md');
  });

  it('should append source suffix to name when name lacks suffix', () => {
    expect(resolver('my-rule', undefined, '.md')).toBe('my-rule.md');
  });

  it('should not append when name already has known suffix', () => {
    expect(resolver('my-rule.mdc', undefined, '.mdc')).toBe('my-rule.mdc');
  });
});
