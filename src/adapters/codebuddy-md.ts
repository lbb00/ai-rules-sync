import path from 'path';
import fs from 'fs-extra';
import { SyncAdapter, ResolvedSource } from './types.js';
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIX = '.md';

async function resolveCodebuddyMdSource(
  repoDir: string,
  rootPath: string,
  name: string,
  options?: { sourceFileOverride?: string }
): Promise<ResolvedSource> {
  if (options?.sourceFileOverride) {
    const sourcePath = path.join(repoDir, rootPath, options.sourceFileOverride);
    if (await fs.pathExists(sourcePath)) {
      return { sourceName: options.sourceFileOverride, sourcePath, suffix: SUFFIX };
    }
    throw new Error(`Source file "${options.sourceFileOverride}" not found at ${path.join(rootPath, options.sourceFileOverride)}`);
  }
  return createSingleSuffixResolver(SUFFIX, 'CODEBUDDY.md')(repoDir, rootPath, name);
}

export const codebuddyMdAdapter: SyncAdapter = createBaseAdapter({
  name: 'codebuddy-md',
  tool: 'codebuddy',
  subtype: 'md',
  configPath: ['codebuddy', 'md'],
  defaultSourceDir: '.codebuddy',
  targetDir: '.codebuddy',
  userTargetDir: '.codebuddy',
  mode: 'file',
  fileSuffixes: [SUFFIX],
  resolveSource: resolveCodebuddyMdSource,
  resolveTargetName: createSuffixAwareTargetResolver([SUFFIX]),
});