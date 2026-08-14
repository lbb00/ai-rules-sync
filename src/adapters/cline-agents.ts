import { createBaseAdapter } from './base.js';

export const clineAgentsAdapter = createBaseAdapter({
  name: 'cline-agents',
  tool: 'cline',
  subtype: 'agents',
  configPath: ['cline', 'agents'],
  defaultSourceDir: '.cline/agents',
  targetDir: '.cline/agents',
  mode: 'file',
  fileSuffixes: ['.yaml', '.yml'],
});