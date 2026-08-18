import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { detectImportAdapter } from '../src/cli/tool-group.js';
import { getAdapter } from '../src/adapters/index.js';

describe('detectImportAdapter', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-tool-group-'));
  });

  afterEach(async () => {
    await fs.remove(projectPath);
  });

  it('matches a file-mode adapter for a name without its suffix', async () => {
    const claudeRules = getAdapter('claude', 'rules'); // mode: 'file', fileSuffixes: ['.md']
    await fs.ensureDir(path.join(projectPath, claudeRules.targetDir));
    await fs.writeFile(path.join(projectPath, claudeRules.targetDir, 'my-rule.md'), '# rule');

    const found = await detectImportAdapter([claudeRules], projectPath, 'my-rule');
    expect(found).toBe(claudeRules);
  });

  it('matches a file-mode adapter when the caller already passed the suffixed name', async () => {
    const claudeRules = getAdapter('claude', 'rules');
    await fs.ensureDir(path.join(projectPath, claudeRules.targetDir));
    await fs.writeFile(path.join(projectPath, claudeRules.targetDir, 'my-rule.md'), '# rule');

    const found = await detectImportAdapter([claudeRules], projectPath, 'my-rule.md');
    expect(found).toBe(claudeRules);
  });

  // cursor-rules is the only hybrid adapter (mode:'hybrid', hybridFileSuffixes:
  // ['.mdc', '.md']) — the hybrid branch used to be a bare fs.pathExists on
  // the un-suffixed path, so it always missed suffixed entries.
  it('matches a hybrid-mode adapter for a name stored under a hybridFileSuffixes candidate', async () => {
    const cursorRules = getAdapter('cursor', 'rules');
    await fs.ensureDir(path.join(projectPath, cursorRules.targetDir));
    await fs.writeFile(path.join(projectPath, cursorRules.targetDir, 'my-rule.mdc'), '# rule');

    const found = await detectImportAdapter([cursorRules], projectPath, 'my-rule');
    expect(found).toBe(cursorRules);
  });

  it('matches a hybrid-mode adapter given as a directory', async () => {
    const cursorRules = getAdapter('cursor', 'rules');
    await fs.ensureDir(path.join(projectPath, cursorRules.targetDir, 'my-rule-dir'));
    await fs.writeFile(path.join(projectPath, cursorRules.targetDir, 'my-rule-dir', 'index.mdc'), '# rule');

    const found = await detectImportAdapter([cursorRules], projectPath, 'my-rule-dir');
    expect(found).toBe(cursorRules);
  });

  it('returns null when no adapter matches', async () => {
    const claudeRules = getAdapter('claude', 'rules');
    await fs.ensureDir(path.join(projectPath, claudeRules.targetDir));

    const found = await detectImportAdapter([claudeRules], projectPath, 'missing-rule');
    expect(found).toBeNull();
  });
});
