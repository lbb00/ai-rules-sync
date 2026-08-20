import { adapterRegistry } from './index.js';

/**
 * CLI command group name -> adapter.tool, for the cases where they diverge.
 * The literal word a user types at the root (`ais agy ...`) only differs from
 * the adapter registry's internal `tool` field for antigravity-cli ("agy")
 * and factorydroid ("droid") — every other tool's CLI group name equals its
 * `tool` field verbatim. This is the single source of truth for that fact;
 * it replaces the two previously-duplicated tables (TOOL_CLI_ALIASES in
 * commands/add-all.ts, TOOL_CLI_GROUPS in completion/scripts.ts).
 */
export const CLI_GROUP_TOOL_MAP: Record<string, string> = {
  agy: 'antigravity-cli',
  droid: 'factorydroid'
};

/** Reverse of CLI_GROUP_TOOL_MAP, built once: adapter.tool -> CLI group name. */
const TOOL_TO_CLI_GROUP: Record<string, string> = Object.fromEntries(
  Object.entries(CLI_GROUP_TOOL_MAP).map(([cliName, tool]) => [tool, cliName])
);

/**
 * Resolves a user-typed name — either a CLI group name (e.g. "agy") or a
 * native adapter tool name (e.g. "antigravity-cli") — to the adapter
 * registry's internal `tool` field. Returns undefined rather than throwing
 * so callers (broadcast --tools parsing, did-you-mean) can decide how to
 * report an unknown name.
 */
export function resolveToolByCliName(name: string): string | undefined {
  const trimmed = name.trim();
  if (Object.prototype.hasOwnProperty.call(CLI_GROUP_TOOL_MAP, trimmed)) {
    return CLI_GROUP_TOOL_MAP[trimmed];
  }
  return adapterRegistry.getForTool(trimmed).length > 0 ? trimmed : undefined;
}

/**
 * Reverse lookup: given an adapter's internal `tool` field, returns the
 * name the user should type at the CLI (for error messages / completion).
 * Tools without an alias use their native tool name as the CLI group name.
 */
export function cliNameForTool(tool: string): string {
  return TOOL_TO_CLI_GROUP[tool] ?? tool;
}

/**
 * Broadcast group name -> the subtype(s) it covers. Group membership is
 * every adapter whose subtype is in this list, across all tools. Only
 * subtypes shared by >=2 tools are worth a group; single-tool subtypes
 * (antigravity's "workflows", opencode's "tools") stay tool-scoped.
 */
export const BROADCAST_GROUPS: Record<string, readonly string[]> = {
  skills: ['skills'],
  agents: ['agents'],
  rules: ['rules'],
  commands: ['commands'],
  md: ['md', 'file'], // 'file' = agents-md's subtype; AGENTS.md is "the md file" to users
  prompts: ['prompts']
};

/** Reverse of BROADCAST_GROUPS, built once: subtype -> broadcast group name. */
const SUBTYPE_TO_BROADCAST_GROUP: Record<string, string> = Object.fromEntries(
  Object.entries(BROADCAST_GROUPS).flatMap(([groupName, subtypes]) =>
    subtypes.map(subtype => [subtype, groupName])
  )
);

/**
 * Resolves an adapter's subtype to the broadcast group that covers it (e.g.
 * 'file' -> 'md'), or undefined if that subtype has no group (single-tool
 * subtypes like antigravity's "workflows" stay tool-scoped only).
 */
export function broadcastGroupForSubtype(subtype: string): string | undefined {
  return SUBTYPE_TO_BROADCAST_GROUP[subtype];
}

/**
 * Concept near-synonym hints: when a broadcast group hard-errors because a
 * requested tool has no adapter for that subtype, but the tool has an
 * adjacent concept under a different subtype name, point at the real
 * command instead of leaving the user at a dead end. Kept minimal on
 * purpose — not an exhaustive map of every tool's naming quirks.
 */
export const CONCEPT_HINTS: Record<string, Record<string, string>> = {
  rules: { copilot: 'instructions' }
};

/** Top-level commands a broadcast group name must never collide with. */
const RESERVED_TOP_LEVEL_WORDS: readonly string[] = [
  'use', 'init', 'list', 'ls', 'status', 'search', 'check', 'doctor', 'update', 'config', 'install', 'add-all', 'import',
  'git', 'completion', '_complete'
];

/**
 * Throws if any broadcast group name collides with a tool's CLI group name
 * or a reserved top-level command word. Exported (in addition to being run
 * at module load below) so tests can exercise the check against fabricated
 * inputs without needing a real naming collision to exist in the registry.
 */
export function assertNoBroadcastGroupNameCollisions(
  broadcastGroupNames: Iterable<string>,
  cliGroupNames: Iterable<string>,
  reservedWords: Iterable<string> = RESERVED_TOP_LEVEL_WORDS
): void {
  const cliGroupNameSet = new Set(cliGroupNames);
  const reservedWordSet = new Set(reservedWords);
  for (const groupName of broadcastGroupNames) {
    if (cliGroupNameSet.has(groupName)) {
      throw new Error(
        `Broadcast group "${groupName}" collides with a tool's CLI command group name`
      );
    }
    if (reservedWordSet.has(groupName)) {
      throw new Error(
        `Broadcast group "${groupName}" collides with a reserved top-level command`
      );
    }
  }
}

// Run the collision check as a side effect of importing this module — a
// broadcast group name silently shadowing a tool group or reserved word
// must fail loudly and immediately, not at first invocation.
assertNoBroadcastGroupNameCollisions(
  Object.keys(BROADCAST_GROUPS),
  new Set(adapterRegistry.all().map(adapter => cliNameForTool(adapter.tool))),
  RESERVED_TOP_LEVEL_WORDS
);
