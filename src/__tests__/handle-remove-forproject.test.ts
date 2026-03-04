import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';
import { handleRemove } from '../commands/handlers.js';
import { createBaseAdapter, createSuffixAwareTargetResolver } from '../adapters/base.js';

const CONFIG_FILENAME = 'ai-rules-sync.json';
const LOCAL_CONFIG_FILENAME = 'ai-rules-sync.local.json';

function createCopilotInstructionsAdapter() {
  return createBaseAdapter({
    name: 'copilot-instructions',
    tool: 'copilot',
    subtype: 'instructions',
    configPath: ['copilot', 'instructions'],
    defaultSourceDir: '.github/instructions',
    targetDir: '.github/instructions',
    mode: 'file',
    fileSuffixes: ['.instructions.md'],
    resolveTargetName: createSuffixAwareTargetResolver(['.instructions.md'])
  });
}

describe('handleRemove forProject mode', () => {
  it('removes ignore entries using actual targetDir and suffix-aware filename', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-remove-forproject-'));
    const adapter = createCopilotInstructionsAdapter();
    const alias = 'security';
    const targetDir = '.custom/instructions';

    const mainConfigPath = path.join(projectPath, CONFIG_FILENAME);
    await fs.writeJson(mainConfigPath, {
      copilot: {
        instructions: {
          [alias]: {
            url: 'https://example.com/repo.git',
            rule: 'security',
            targetDir
          }
        }
      }
    }, { spaces: 2 });

    const targetPath = path.join(projectPath, targetDir, `${alias}.instructions.md`);
    const sourceFilePath = path.join(projectPath, 'tmp-source.md');
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeFile(sourceFilePath, '# source');
    await fs.symlink(sourceFilePath, targetPath);

    const relEntry = path.relative(path.resolve(projectPath), targetPath);
    await fs.writeFile(path.join(projectPath, '.gitignore'), `${relEntry}\n`);

    const result = await handleRemove(adapter, projectPath, alias, false);

    expect(result.removedFrom).toEqual([CONFIG_FILENAME]);
    const gitignore = await fs.readFile(path.join(projectPath, '.gitignore'), 'utf-8');
    expect(gitignore).not.toContain(relEntry);
  });

  it('reports removedFrom based on the actual config file (local config)', async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-remove-local-config-'));
    const adapter = createCopilotInstructionsAdapter();
    const alias = 'local-only';

    const localConfigPath = path.join(projectPath, LOCAL_CONFIG_FILENAME);
    await fs.writeJson(localConfigPath, {
      copilot: {
        instructions: {
          [alias]: 'https://example.com/repo.git'
        }
      }
    }, { spaces: 2 });

    const result = await handleRemove(adapter, projectPath, alias, false);

    expect(result.removedFrom).toEqual([LOCAL_CONFIG_FILENAME]);
  });
});
