import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

export const clineCommandsAdapter = createBaseAdapter({
  name: 'cline-commands',
  tool: 'cline',
  subtype: 'commands',
  configPath: ['cline', 'commands'],
  defaultSourceDir: '.clinerules/workflows',
  targetDir: '.clinerules/workflows',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});