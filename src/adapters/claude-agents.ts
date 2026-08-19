import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

// Claude Code subagents are single .md files with YAML frontmatter
// (.claude/agents/<name>.md) — not directories.
export const claudeAgentsAdapter = createBaseAdapter({
  name: 'claude-agents',
  tool: 'claude',
  subtype: 'agents',
  configPath: ['claude', 'agents'],
  defaultSourceDir: '.claude/agents',
  targetDir: '.claude/agents',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createMultiSuffixResolver(['.md'], 'Agent'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});