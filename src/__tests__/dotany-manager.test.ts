import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { promises as nodeFs } from 'fs';
import { describe, expect, it } from 'vitest';
import { DotfileManager } from '../dotany/manager.js';

describe('DotfileManager', () => {
  it('removes dangling symlink targets during remove()', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-dotany-remove-'));
    const targetDir = '.cursor/rules';
    const alias = 'dangling';
    const targetPath = path.join(projectPath, targetDir, alias);

    await fs.ensureDir(path.dirname(targetPath));
    await nodeFs.symlink(path.join(projectPath, 'missing-source'), targetPath);

    const manager = new DotfileManager({
      name: 'test',
      source: {
        async resolve() {
          throw new Error('resolve() should not be called in remove() test');
        }
      },
      targetRoot: projectPath,
      targetDir
    });

    await manager.remove(alias);

    const statAfter = await fs.lstat(targetPath).catch(() => null);
    expect(statAfter).toBeNull();
  });
});
