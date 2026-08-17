/**
 * Shell completion scripts for bash, zsh, and fish
 *
 * Every tool now gets the same command tree (registerToolGroup in
 * src/cli/tool-group.ts): `ais <tool> <subtype> add/remove/install/import`,
 * plus a tool-wide `install`/`add-all`/`import`. There's no longer any
 * hand-written divergence between tools to describe, so TOOL_SPECS below is
 * derived directly from adapterRegistry (for the tool/subtype list) and
 * cliNameForTool (for the two tools — antigravity-cli/"agy" and
 * factorydroid/"droid" — whose CLI command word differs from adapter.tool).
 * See resolveCompletionAdapter() for the matching lookup used by the
 * `_complete` command.
 */

import { adapterRegistry } from '../adapters/index.js';
import { cliNameForTool } from '../adapters/cli-groups.js';
import { SyncAdapter } from '../adapters/types.js';

interface CompletionEntry {
  name: string;
  description: string;
}

interface ToolCompletionSpec {
  tool: string;
  description: string;
  rootSubcommands: CompletionEntry[];
  nestedSubcommands: Record<string, CompletionEntry[]>;
  nestedAddCompletionTypes?: Record<string, string>;
}

const COMMAND_ALIASES: Record<string, string[]> = {
  list: ['ls'],
  remove: ['rm']
};

function singularize(subtype: string): string {
  return subtype.endsWith('s') ? subtype.slice(0, -1) : subtype;
}

/** The uniform add/remove/install/import group registerAdapterCommands() wires up for every subtype. */
function buildEntityCommands(displayName: string, adapter: SyncAdapter): CompletionEntry[] {
  const entity = singularize(adapter.subtype);
  return [
    { name: 'add', description: `Add a ${displayName} ${entity}` },
    { name: 'remove', description: `Remove a ${displayName} ${entity}` },
    { name: 'install', description: `Install all ${displayName} ${adapter.subtype}` },
    { name: 'import', description: `Import ${entity} to repository` }
  ];
}

/**
 * Human-readable label for descriptions, derived from the CLI group name
 * (not the internal `tool` field) so it matches what the user actually
 * types. Mirrors humanize() in src/cli/tool-group.ts.
 */
function humanize(cliName: string): string {
  return cliName
    .split(/[-_]/)
    .map(part => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

/**
 * Every tool gets the same shape, generated straight from whatever adapters
 * adapterRegistry has for it (registerToolGroup in src/cli/tool-group.ts):
 * `ais <tool> install/add-all/import` plus one `<subtype>` subgroup per
 * adapter. The hidden `<tool> add`/`<tool> remove` stubs are deliberately
 * left off rootSubcommands — they're not real actions, so completion
 * shouldn't suggest them.
 */
function buildToolSpecs(): ToolCompletionSpec[] {
  const specs: ToolCompletionSpec[] = [];
  const tools = Array.from(new Set(adapterRegistry.all().map(adapter => adapter.tool)));

  for (const tool of tools) {
    const adapters = adapterRegistry.getForTool(tool);
    if (adapters.length === 0) continue;

    const cliName = cliNameForTool(tool);
    const displayName = humanize(cliName);

    const rootSubcommands: CompletionEntry[] = [
      { name: 'install', description: `Install all ${displayName} entries` },
      { name: 'add-all', description: `Add all ${displayName} entries from repository` },
      { name: 'import', description: `Import ${displayName} entry from project to repository` },
      ...adapters.map(adapter => ({ name: adapter.subtype, description: `Manage ${displayName} ${adapter.subtype}` }))
    ];

    const nestedSubcommands: Record<string, CompletionEntry[]> = {};
    const nestedAddCompletionTypes: Record<string, string> = {};
    for (const adapter of adapters) {
      nestedSubcommands[adapter.subtype] = buildEntityCommands(displayName, adapter);
      nestedAddCompletionTypes[adapter.subtype] = adapter.name;
    }

    specs.push({
      tool: cliName,
      description: `Manage ${displayName} assets in a project`,
      rootSubcommands,
      nestedSubcommands,
      nestedAddCompletionTypes
    });
  }

  return specs;
}

const TOOL_SPECS: ToolCompletionSpec[] = buildToolSpecs();

/**
 * Completion type strings used by shell completion scripts generated before
 * this file derived TOOL_SPECS from the adapter registry. Kept so already-
 * installed completion scripts (`ais completion install`) keep working until
 * the user re-installs them.
 */
const LEGACY_COMPLETION_ALIASES: Record<string, [tool: string, subtype: string]> = {
  cursor: ['cursor', 'rules'],
  copilot: ['copilot', 'instructions'],
  'agents-md': ['agents-md', 'file']
};

/**
 * Resolve an `ais _complete <type>` type string to the adapter it should list
 * entries for. Shared by scripts.ts (to know every type it can legitimately
 * emit) and the `_complete` command in src/index.ts, so the two can't drift
 * the way the old hand-written TOOL_SPECS and switch statement did.
 */
export function resolveCompletionAdapter(type: string): SyncAdapter | undefined {
  const legacy = LEGACY_COMPLETION_ALIASES[type];
  if (legacy) {
    return adapterRegistry.get(legacy[0], legacy[1]);
  }
  return adapterRegistry.getByName(type);
}

const EXTRA_TOP_LEVEL_COMMANDS: CompletionEntry[] = [
  { name: 'use', description: 'Configure rules repository' },
  { name: 'list', description: 'List configured repositories' },
  { name: 'git', description: 'Run git commands in rules repository' },
  { name: 'add', description: 'Add a rule (smart dispatch)' },
  { name: 'remove', description: 'Remove a rule (smart dispatch)' },
  { name: 'install', description: 'Install all rules (smart dispatch)' },
  { name: 'add-all', description: 'Install all entries from repository' },
  { name: 'import', description: 'Import entry to rules repository' },
  { name: 'status', description: 'Show repository and config status' },
  { name: 'search', description: 'Search entries in repository' },
  { name: 'check', description: 'Check repository update status' },
  { name: 'update', description: 'Update repositories and reinstall entries' },
  { name: 'init', description: 'Initialize a rules repository template' },
  { name: 'config', description: 'Manage repository configuration' },
  { name: 'user', description: 'Manage user-level AI config entries' },
  { name: 'completion', description: 'Output shell completion script' }
];

const TOP_LEVEL_COMMANDS: CompletionEntry[] = [
  ...TOOL_SPECS.map(spec => ({ name: spec.tool, description: spec.description })),
  ...EXTRA_TOP_LEVEL_COMMANDS
];

function toVarName(name: string): string {
  return name.replace(/-/g, '_');
}

function expandEntriesWithAliases(entries: CompletionEntry[]): CompletionEntry[] {
  const expanded: CompletionEntry[] = [];
  for (const entry of entries) {
    expanded.push(entry);
    const aliases = COMMAND_ALIASES[entry.name] || [];
    for (const alias of aliases) {
      expanded.push({
        name: alias,
        description: `Alias for ${entry.name}`
      });
    }
  }
  return expanded;
}

function quotedNames(entries: CompletionEntry[]): string {
  return expandEntriesWithAliases(entries).map(entry => entry.name).join(' ');
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

function buildZshDescribeItems(entries: CompletionEntry[]): string {
  return expandEntriesWithAliases(entries)
    .map(entry => `'${escapeSingleQuotes(entry.name)}:${escapeSingleQuotes(entry.description)}'`)
    .join(' ');
}

function buildZshCompleteTypeBlock(completeType: string, indent: string): string[] {
  return [
    `${indent}local -a items`,
    `${indent}items=(\${(f)"\$(ais _complete ${completeType} 2>/dev/null)"})`,
    `${indent}if (( \$#items )); then`,
    `${indent}  compadd "\$items[@]"`,
    `${indent}fi`
  ];
}

function buildBashScript(): string {
  const lines: string[] = [
    '# ais bash completion',
    '_ais_complete() {',
    '  local cur="${COMP_WORDS[COMP_CWORD]}"',
    '  local prev="${COMP_WORDS[COMP_CWORD-1]}"',
    '  local pprev="${COMP_WORDS[COMP_CWORD-2]}"',
    '  local ppprev="${COMP_WORDS[COMP_CWORD-3]}"',
    ''
  ];

  for (const spec of TOOL_SPECS) {
    if (!spec.nestedAddCompletionTypes) continue;
    for (const [subcommand, completeType] of Object.entries(spec.nestedAddCompletionTypes)) {
      lines.push(`  # ${spec.tool} ${subcommand} add`);
      lines.push(`  if [[ "$ppprev" == "${spec.tool}" && "$pprev" == "${subcommand}" && "$prev" == "add" ]]; then`);
      lines.push(`    COMPREPLY=( $(compgen -W "$(ais _complete ${completeType} 2>/dev/null)" -- "$cur") )`);
      lines.push('    return 0');
      lines.push('  fi');
      lines.push('');
    }
  }

  for (const spec of TOOL_SPECS) {
    for (const [nested, nestedSubcommands] of Object.entries(spec.nestedSubcommands)) {
      lines.push(`  # ${spec.tool} ${nested}`);
      lines.push(`  if [[ "$pprev" == "${spec.tool}" && "$prev" == "${nested}" ]]; then`);
      lines.push(`    COMPREPLY=( $(compgen -W "${quotedNames(nestedSubcommands)}" -- "$cur") )`);
      lines.push('    return 0');
      lines.push('  fi');
      lines.push('');
    }
  }

  for (const spec of TOOL_SPECS) {
    lines.push(`  # ${spec.tool}`);
    lines.push(`  if [[ "$prev" == "${spec.tool}" ]]; then`);
    lines.push(`    COMPREPLY=( $(compgen -W "${quotedNames(spec.rootSubcommands)}" -- "$cur") )`);
    lines.push('    return 0');
    lines.push('  fi');
    lines.push('');
  }

  lines.push('  if [[ ${COMP_CWORD} -eq 1 ]]; then');
  lines.push(`    COMPREPLY=( $(compgen -W "${quotedNames(TOP_LEVEL_COMMANDS)}" -- "$cur") )`);
  lines.push('    return 0');
  lines.push('  fi');
  lines.push('}');
  lines.push('complete -F _ais_complete ais');

  return lines.join('\n');
}

function buildZshScript(): string {
  const lines: string[] = [
    '# ais zsh completion',
    '_ais() {',
    '  local -a subcmds',
    '  subcmds=('
  ];

  for (const cmd of expandEntriesWithAliases(TOP_LEVEL_COMMANDS)) {
    lines.push(`    '${escapeSingleQuotes(cmd.name)}:${escapeSingleQuotes(cmd.description)}'`);
  }
  lines.push('  )');
  lines.push('');

  const variableNames: string[] = [];
  for (const spec of TOOL_SPECS) {
    const toolVar = `${toVarName(spec.tool)}_subcmds`;
    variableNames.push(toolVar);
    for (const nested of Object.keys(spec.nestedSubcommands)) {
      variableNames.push(`${toVarName(spec.tool)}_${toVarName(nested)}_subcmds`);
    }
  }

  lines.push(`  local -a ${variableNames.join(' ')}`);
  for (const spec of TOOL_SPECS) {
    const toolVar = `${toVarName(spec.tool)}_subcmds`;
    lines.push(`  ${toolVar}=(${buildZshDescribeItems(spec.rootSubcommands)})`);
    for (const [nested, nestedEntries] of Object.entries(spec.nestedSubcommands)) {
      const nestedVar = `${toVarName(spec.tool)}_${toVarName(nested)}_subcmds`;
      lines.push(`  ${nestedVar}=(${buildZshDescribeItems(nestedEntries)})`);
    }
  }
  lines.push('');

  lines.push('  _arguments -C \\');
  lines.push("    '1:command:->command' \\");
  lines.push("    '2:subcommand:->subcommand' \\");
  lines.push("    '3:subsubcommand:->subsubcommand' \\");
  lines.push("    '4:name:->name' \\");
  lines.push("    '*::arg:->args'");
  lines.push('');
  lines.push('  case "$state" in');
  lines.push('    command)');
  lines.push("      _describe 'command' subcmds");
  lines.push('      ;;');
  lines.push('    subcommand)');
  lines.push('      case "$words[2]" in');
  for (const spec of TOOL_SPECS) {
    const toolVar = `${toVarName(spec.tool)}_subcmds`;
    lines.push(`        ${spec.tool})`);
    lines.push(`          _describe 'subcommand' ${toolVar}`);
    lines.push('          ;;');
  }
  lines.push('      esac');
  lines.push('      ;;');
  lines.push('    subsubcommand)');
  lines.push('      case "$words[2]" in');

  for (const spec of TOOL_SPECS) {
    const toolVar = `${toVarName(spec.tool)}_subcmds`;
    lines.push(`        ${spec.tool})`);
    lines.push('          case "$words[3]" in');

    for (const nested of Object.keys(spec.nestedSubcommands)) {
      const nestedVar = `${toVarName(spec.tool)}_${toVarName(nested)}_subcmds`;
      lines.push(`            ${nested})`);
      lines.push(`              _describe 'subsubcommand' ${nestedVar}`);
      lines.push('              ;;');
    }

    lines.push('            *)');
    lines.push(`              _describe 'subsubcommand' ${toolVar}`);
    lines.push('              ;;');
    lines.push('          esac');
    lines.push('          ;;');
  }

  lines.push('      esac');
  lines.push('      ;;');
  lines.push('    name)');
  lines.push('      case "$words[2]" in');

  for (const spec of TOOL_SPECS) {
    const hasNestedCompletions = !!spec.nestedAddCompletionTypes && Object.keys(spec.nestedAddCompletionTypes).length > 0;
    if (!hasNestedCompletions) {
      continue;
    }

    lines.push(`        ${spec.tool})`);
    lines.push('          case "$words[3]" in');

    if (spec.nestedAddCompletionTypes) {
      for (const [nested, completeType] of Object.entries(spec.nestedAddCompletionTypes)) {
        lines.push(`            ${nested})`);
        lines.push('              case "$words[4]" in');
        lines.push('                add)');
        lines.push(...buildZshCompleteTypeBlock(completeType, '                  '));
        lines.push('                  ;;');
        lines.push('              esac');
        lines.push('              ;;');
      }
    }

    lines.push('          esac');
    lines.push('          ;;');
  }

  lines.push('      esac');
  lines.push('      ;;');
  lines.push('    args)');
  lines.push('      # Handle additional arguments');
  lines.push('      ;;');
  lines.push('  esac');
  lines.push('}');
  lines.push('');
  lines.push('# Only define completion if compdef is available (zsh completion initialized)');
  lines.push('command -v compdef >/dev/null 2>&1 && compdef _ais ais');

  return lines.join('\n');
}

function buildFishScript(): string {
  const lines: string[] = [
    '# ais fish completion',
    'complete -c ais -f',
    '',
    '# Top-level commands'
  ];

  for (const cmd of TOP_LEVEL_COMMANDS) {
    const entries = expandEntriesWithAliases([cmd]);
    for (const entry of entries) {
      lines.push(`complete -c ais -n "__fish_use_subcommand" -a "${entry.name}" -d "${entry.description}"`);
    }
  }
  lines.push('');

  for (const spec of TOOL_SPECS) {
    const rootEntries = expandEntriesWithAliases(spec.rootSubcommands);
    const allRoot = rootEntries.map(entry => entry.name).join(' ');
    lines.push(`# ${spec.tool} subcommands`);
    for (const subcommand of rootEntries) {
      lines.push(`complete -c ais -n "__fish_seen_subcommand_from ${spec.tool}; and not __fish_seen_subcommand_from ${allRoot}" -a "${subcommand.name}" -d "${subcommand.description}"`);
    }
    lines.push('');
  }

  for (const spec of TOOL_SPECS) {
    for (const [nested, nestedEntries] of Object.entries(spec.nestedSubcommands)) {
      const expandedNestedEntries = expandEntriesWithAliases(nestedEntries);
      const nestedNames = expandedNestedEntries.map(entry => entry.name).join(' ');
      lines.push(`# ${spec.tool} ${nested} subcommands`);
      for (const subcommand of expandedNestedEntries) {
        lines.push(`complete -c ais -n "__fish_seen_subcommand_from ${spec.tool}; and __fish_seen_subcommand_from ${nested}; and not __fish_seen_subcommand_from ${nestedNames}" -a "${subcommand.name}" -d "${subcommand.description}"`);
      }
      lines.push('');
    }
  }

  for (const spec of TOOL_SPECS) {
    if (spec.nestedAddCompletionTypes) {
      for (const [nested, completeType] of Object.entries(spec.nestedAddCompletionTypes)) {
        lines.push(`complete -c ais -n "__fish_seen_subcommand_from ${spec.tool}; and __fish_seen_subcommand_from ${nested}; and __fish_seen_subcommand_from add" -a "(ais _complete ${completeType} 2>/dev/null)"`);
      }
    }
  }

  return lines.join('\n');
}

export const bashScript = buildBashScript();
export const zshScript = buildZshScript();
export const fishScript = buildFishScript();

/**
 * Get the completion script for a shell
 */
export function getCompletionScript(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'bash':
      return bashScript.trim();
    case 'zsh':
      return zshScript.trim();
    case 'fish':
      return fishScript.trim();
    default:
      throw new Error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
  }
}
