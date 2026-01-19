import fs from 'fs-extra';
import path from 'path';
import { SyncAdapter, ResolvedSource } from './types.js';
import { createBaseAdapter } from './base.js';

const SUFFIX_MD = '.md';

export const traeRulesAdapter: SyncAdapter = createBaseAdapter({
  name: 'trae-rules',
  tool: 'trae',
  subtype: 'rules',
  configPath: ['trae', 'rules'],
  defaultSourceDir: '.trae/rules',
  targetDir: '.trae/rules',
  mode: 'file',
  fileSuffixes: [SUFFIX_MD],

  async resolveSource(repoDir: string, rootPath: string, name: string): Promise<ResolvedSource> {
    if (name.endsWith(SUFFIX_MD)) {
      const sourcePath = path.join(repoDir, rootPath, name);
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`Rule "${name}" not found in repository.`);
      }
      return {
        sourceName: name,
        sourcePath,
        suffix: SUFFIX_MD
      };
    }

    const candName = `${name}${SUFFIX_MD}`;
    const candPath = path.join(repoDir, rootPath, candName);
    if (await fs.pathExists(candPath)) {
      return {
        sourceName: candName,
        sourcePath: candPath,
        suffix: SUFFIX_MD
      };
    }

    const exactPath = path.join(repoDir, rootPath, name);
    if (await fs.pathExists(exactPath)) {
      return {
        sourceName: name,
        sourcePath: exactPath,
        suffix: undefined
      };
    }

    throw new Error(`Rule "${name}" not found in repository.`);
  },

  resolveTargetName(name: string, alias?: string, sourceSuffix?: string): string {
    const base = alias || name;
    if (sourceSuffix && !base.endsWith(sourceSuffix)) {
      return `${base}${sourceSuffix}`;
    }
    return base;
  }
});
