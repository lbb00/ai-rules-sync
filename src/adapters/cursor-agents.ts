import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

// Cursor subagents are single .md files with YAML frontmatter
// (.cursor/agents/<name>.md) — not directories.
export const cursorAgentsAdapter = createBaseAdapter({
  name: 'cursor-agents',
  tool: 'cursor',
  subtype: 'agents',
  configPath: ['cursor', 'agents'],
  defaultSourceDir: '.cursor/agents',
  targetDir: '.cursor/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});
