/**
 * Shell completion scripts for bash, zsh, and fish
 * Generated from shared completion metadata to reduce drift.
 */

interface CompletionEntry {
  name: string;
  description: string;
}

interface ToolCompletionSpec {
  tool: string;
  description: string;
  rootSubcommands: CompletionEntry[];
  nestedSubcommands: Record<string, CompletionEntry[]>;
  rootAddCompletionType?: string;
  nestedAddCompletionTypes?: Record<string, string>;
}

const COMMAND_ALIASES: Record<string, string[]> = {
  list: ['ls'],
  remove: ['rm']
};

const TOOL_SPECS: ToolCompletionSpec[] = [
  {
    tool: 'cursor',
    description: 'Manage Cursor rules, commands, and skills',
    rootSubcommands: [
      { name: 'add', description: 'Add a Cursor rule' },
      { name: 'remove', description: 'Remove a Cursor rule' },
      { name: 'install', description: 'Install all Cursor entries' },
      { name: 'import', description: 'Import entry to repository' },
      { name: 'rules', description: 'Manage rules explicitly' },
      { name: 'commands', description: 'Manage commands' },
      { name: 'skills', description: 'Manage skills' },
      { name: 'agents', description: 'Manage agents' }
    ],
    nestedSubcommands: {
      rules: [
        { name: 'add', description: 'Add a Cursor rule' },
        { name: 'remove', description: 'Remove a Cursor rule' },
        { name: 'install', description: 'Install all Cursor rules' },
        { name: 'import', description: 'Import rule to repository' }
      ],
      commands: [
        { name: 'add', description: 'Add a Cursor command' },
        { name: 'remove', description: 'Remove a Cursor command' },
        { name: 'install', description: 'Install all Cursor commands' },
        { name: 'import', description: 'Import command to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Cursor skill' },
        { name: 'remove', description: 'Remove a Cursor skill' },
        { name: 'install', description: 'Install all Cursor skills' },
        { name: 'import', description: 'Import skill to repository' }
      ],
      agents: [
        { name: 'add', description: 'Add a Cursor agent' },
        { name: 'remove', description: 'Remove a Cursor agent' },
        { name: 'install', description: 'Install all Cursor agents' },
        { name: 'import', description: 'Import agent to repository' }
      ]
    },
    rootAddCompletionType: 'cursor',
    nestedAddCompletionTypes: {
      rules: 'cursor',
      commands: 'cursor-commands',
      skills: 'cursor-skills',
      agents: 'cursor-agents'
    }
  },
  {
    tool: 'copilot',
    description: 'Manage GitHub Copilot instructions',
    rootSubcommands: [
      { name: 'instructions', description: 'Manage GitHub Copilot instructions' },
      { name: 'prompts', description: 'Manage GitHub Copilot prompt files' },
      { name: 'skills', description: 'Manage GitHub Copilot skills' },
      { name: 'agents', description: 'Manage GitHub Copilot custom agents' },
      { name: 'install', description: 'Install all GitHub Copilot entries' }
    ],
    nestedSubcommands: {
      instructions: [
        { name: 'add', description: 'Add a GitHub Copilot instruction' },
        { name: 'remove', description: 'Remove a GitHub Copilot instruction' },
        { name: 'install', description: 'Install all GitHub Copilot instructions' },
        { name: 'import', description: 'Import instruction to repository' }
      ],
      prompts: [
        { name: 'add', description: 'Add a GitHub Copilot prompt' },
        { name: 'remove', description: 'Remove a GitHub Copilot prompt' },
        { name: 'install', description: 'Install all GitHub Copilot prompts' },
        { name: 'import', description: 'Import prompt to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a GitHub Copilot skill' },
        { name: 'remove', description: 'Remove a GitHub Copilot skill' },
        { name: 'install', description: 'Install all GitHub Copilot skills' },
        { name: 'import', description: 'Import skill to repository' }
      ],
      agents: [
        { name: 'add', description: 'Add a GitHub Copilot agent' },
        { name: 'remove', description: 'Remove a GitHub Copilot agent' },
        { name: 'install', description: 'Install all GitHub Copilot agents' },
        { name: 'import', description: 'Import agent to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      instructions: 'copilot-instructions',
      prompts: 'copilot-prompts',
      skills: 'copilot-skills',
      agents: 'copilot-agents'
    }
  },
  {
    tool: 'claude',
    description: 'Manage Claude skills, agents, and plugins',
    rootSubcommands: [
      { name: 'rules', description: 'Manage Claude rules' },
      { name: 'skills', description: 'Manage Claude skills' },
      { name: 'agents', description: 'Manage Claude agents' },
      { name: 'install', description: 'Install all Claude components' }
    ],
    nestedSubcommands: {
      rules: [
        { name: 'add', description: 'Add a Claude rule' },
        { name: 'remove', description: 'Remove a Claude rule' },
        { name: 'install', description: 'Install all Claude rules' },
        { name: 'import', description: 'Import rule to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Claude skill' },
        { name: 'remove', description: 'Remove a Claude skill' },
        { name: 'install', description: 'Install all Claude skills' },
        { name: 'import', description: 'Import skill to repository' }
      ],
      agents: [
        { name: 'add', description: 'Add a Claude agent' },
        { name: 'remove', description: 'Remove a Claude agent' },
        { name: 'install', description: 'Install all Claude agents' },
        { name: 'import', description: 'Import agent to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      rules: 'claude-rules',
      skills: 'claude-skills',
      agents: 'claude-agents'
    }
  },
  {
    tool: 'trae',
    description: 'Manage Trae rules and skills',
    rootSubcommands: [
      { name: 'rules', description: 'Manage Trae rules' },
      { name: 'skills', description: 'Manage Trae skills' },
      { name: 'install', description: 'Install all Trae entries' }
    ],
    nestedSubcommands: {
      rules: [
        { name: 'add', description: 'Add a Trae rule' },
        { name: 'remove', description: 'Remove a Trae rule' },
        { name: 'install', description: 'Install all Trae rules' },
        { name: 'import', description: 'Import rule to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Trae skill' },
        { name: 'remove', description: 'Remove a Trae skill' },
        { name: 'install', description: 'Install all Trae skills' },
        { name: 'import', description: 'Import skill to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      rules: 'trae-rules',
      skills: 'trae-skills'
    }
  },
  {
    tool: 'opencode',
    description: 'Manage OpenCode agents, skills, commands, and tools',
    rootSubcommands: [
      { name: 'commands', description: 'Manage OpenCode commands' },
      { name: 'skills', description: 'Manage OpenCode skills' },
      { name: 'agents', description: 'Manage OpenCode agents' },
      { name: 'tools', description: 'Manage OpenCode tools' },
      { name: 'install', description: 'Install all OpenCode entries' },
      { name: 'import', description: 'Import entry to repository' }
    ],
    nestedSubcommands: {
      commands: [
        { name: 'add', description: 'Add an OpenCode command' },
        { name: 'remove', description: 'Remove an OpenCode command' },
        { name: 'install', description: 'Install all OpenCode commands' },
        { name: 'import', description: 'Import command to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add an OpenCode skill' },
        { name: 'remove', description: 'Remove an OpenCode skill' },
        { name: 'install', description: 'Install all OpenCode skills' },
        { name: 'import', description: 'Import skill to repository' }
      ],
      agents: [
        { name: 'add', description: 'Add an OpenCode agent' },
        { name: 'remove', description: 'Remove an OpenCode agent' },
        { name: 'install', description: 'Install all OpenCode agents' },
        { name: 'import', description: 'Import agent to repository' }
      ],
      tools: [
        { name: 'add', description: 'Add an OpenCode tool' },
        { name: 'remove', description: 'Remove an OpenCode tool' },
        { name: 'install', description: 'Install all OpenCode tools' },
        { name: 'import', description: 'Import tool to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      commands: 'opencode-commands',
      skills: 'opencode-skills',
      agents: 'opencode-agents',
      tools: 'opencode-tools'
    }
  },
  {
    tool: 'codex',
    description: 'Manage Codex rules and skills',
    rootSubcommands: [
      { name: 'rules', description: 'Manage Codex rules' },
      { name: 'skills', description: 'Manage Codex skills' },
      { name: 'install', description: 'Install all Codex entries' },
      { name: 'import', description: 'Import entry to repository' }
    ],
    nestedSubcommands: {
      rules: [
        { name: 'add', description: 'Add a Codex rule' },
        { name: 'remove', description: 'Remove a Codex rule' },
        { name: 'install', description: 'Install all Codex rules' },
        { name: 'import', description: 'Import rule to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Codex skill' },
        { name: 'remove', description: 'Remove a Codex skill' },
        { name: 'install', description: 'Install all Codex skills' },
        { name: 'import', description: 'Import skill to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      rules: 'codex-rules',
      skills: 'codex-skills'
    }
  },
  {
    tool: 'gemini',
    description: 'Manage Gemini CLI commands, skills, and agents',
    rootSubcommands: [
      { name: 'commands', description: 'Manage Gemini commands' },
      { name: 'skills', description: 'Manage Gemini skills' },
      { name: 'agents', description: 'Manage Gemini agents' },
      { name: 'install', description: 'Install all Gemini entries' },
      { name: 'add-all', description: 'Add all Gemini entries' },
      { name: 'import', description: 'Import entry to repository' }
    ],
    nestedSubcommands: {
      commands: [
        { name: 'add', description: 'Add a Gemini command' },
        { name: 'remove', description: 'Remove a Gemini command' },
        { name: 'install', description: 'Install all Gemini commands' },
        { name: 'import', description: 'Import command to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Gemini skill' },
        { name: 'remove', description: 'Remove a Gemini skill' },
        { name: 'install', description: 'Install all Gemini skills' },
        { name: 'import', description: 'Import skill to repository' }
      ],
      agents: [
        { name: 'add', description: 'Add a Gemini agent' },
        { name: 'remove', description: 'Remove a Gemini agent' },
        { name: 'install', description: 'Install all Gemini agents' },
        { name: 'import', description: 'Import agent to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      commands: 'gemini-commands',
      skills: 'gemini-skills',
      agents: 'gemini-agents'
    }
  },
  {
    tool: 'warp',
    description: 'Manage Warp agent skills',
    rootSubcommands: [
      { name: 'skills', description: 'Manage Warp skills' },
      { name: 'install', description: 'Install all Warp entries' },
      { name: 'import', description: 'Import entry to repository' }
    ],
    nestedSubcommands: {
      skills: [
        { name: 'add', description: 'Add a Warp skill' },
        { name: 'remove', description: 'Remove a Warp skill' },
        { name: 'install', description: 'Install all Warp skills' },
        { name: 'import', description: 'Import skill to repository' }
      ]
    },
    nestedAddCompletionTypes: {
      skills: 'warp-skills'
    }
  },
  {
    tool: 'windsurf',
    description: 'Manage Windsurf rules and skills',
    rootSubcommands: [
      { name: 'add', description: 'Add a Windsurf rule' },
      { name: 'remove', description: 'Remove a Windsurf rule' },
      { name: 'install', description: 'Install all Windsurf entries' },
      { name: 'add-all', description: 'Add all Windsurf entries' },
      { name: 'import', description: 'Import entry to repository' },
      { name: 'rules', description: 'Manage Windsurf rules' },
      { name: 'skills', description: 'Manage Windsurf skills' }
    ],
    nestedSubcommands: {
      rules: [
        { name: 'add', description: 'Add a Windsurf rule' },
        { name: 'remove', description: 'Remove a Windsurf rule' },
        { name: 'install', description: 'Install all Windsurf rules' },
        { name: 'import', description: 'Import rule to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Windsurf skill' },
        { name: 'remove', description: 'Remove a Windsurf skill' },
        { name: 'install', description: 'Install all Windsurf skills' },
        { name: 'import', description: 'Import skill to repository' }
      ]
    },
    rootAddCompletionType: 'windsurf-rules',
    nestedAddCompletionTypes: {
      rules: 'windsurf-rules',
      skills: 'windsurf-skills'
    }
  },
  {
    tool: 'cline',
    description: 'Manage Cline rules and skills',
    rootSubcommands: [
      { name: 'add', description: 'Add a Cline rule' },
      { name: 'remove', description: 'Remove a Cline rule' },
      { name: 'install', description: 'Install all Cline entries' },
      { name: 'add-all', description: 'Add all Cline entries' },
      { name: 'import', description: 'Import entry to repository' },
      { name: 'rules', description: 'Manage Cline rules' },
      { name: 'skills', description: 'Manage Cline skills' }
    ],
    nestedSubcommands: {
      rules: [
        { name: 'add', description: 'Add a Cline rule' },
        { name: 'remove', description: 'Remove a Cline rule' },
        { name: 'install', description: 'Install all Cline rules' },
        { name: 'import', description: 'Import rule to repository' }
      ],
      skills: [
        { name: 'add', description: 'Add a Cline skill' },
        { name: 'remove', description: 'Remove a Cline skill' },
        { name: 'install', description: 'Install all Cline skills' },
        { name: 'import', description: 'Import skill to repository' }
      ]
    },
    rootAddCompletionType: 'cline-rules',
    nestedAddCompletionTypes: {
      rules: 'cline-rules',
      skills: 'cline-skills'
    }
  },
  {
    tool: 'agents-md',
    description: 'Manage AGENTS.md files (agents.md standard)',
    rootSubcommands: [
      { name: 'add', description: 'Add an AGENTS.md file' },
      { name: 'remove', description: 'Remove an AGENTS.md file' },
      { name: 'install', description: 'Install AGENTS.md' },
      { name: 'import', description: 'Import AGENTS.md to repository' }
    ],
    nestedSubcommands: {},
    rootAddCompletionType: 'agents-md'
  }
];

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
    if (spec.rootAddCompletionType) {
      lines.push(`  # ${spec.tool} add`);
      lines.push(`  if [[ "$pprev" == "${spec.tool}" && "$prev" == "add" ]]; then`);
      lines.push(`    COMPREPLY=( $(compgen -W "$(ais _complete ${spec.rootAddCompletionType} 2>/dev/null)" -- "$cur") )`);
      lines.push('    return 0');
      lines.push('  fi');
      lines.push('');
    }
  }

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
    if (spec.rootAddCompletionType) {
      lines.push('            add)');
      lines.push(...buildZshCompleteTypeBlock(spec.rootAddCompletionType, '              '));
      lines.push('              ;;');
    }

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
    if (!spec.rootAddCompletionType && !hasNestedCompletions) {
      continue;
    }

    lines.push(`        ${spec.tool})`);
    lines.push('          case "$words[3]" in');

    if (spec.rootAddCompletionType) {
      lines.push('            add)');
      lines.push(...buildZshCompleteTypeBlock(spec.rootAddCompletionType, '              '));
      lines.push('              ;;');
    }

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
    if (spec.rootAddCompletionType) {
      lines.push(`complete -c ais -n "__fish_seen_subcommand_from ${spec.tool}; and __fish_seen_subcommand_from add" -a "(ais _complete ${spec.rootAddCompletionType} 2>/dev/null)"`);
    }
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
