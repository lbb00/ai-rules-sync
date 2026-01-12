import { createBaseAdapter } from './base.js';

export const claudePluginsAdapter = createBaseAdapter({
  name: 'claude-plugins',
  tool: 'claude',
  subtype: 'plugins',
  configPath: ['claude', 'plugins'],
  defaultSourceDir: 'plugins',
  targetDir: 'plugins',
  mode: 'directory',
});