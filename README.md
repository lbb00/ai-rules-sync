# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md)

**AI Rules Sync (AIS)**
*Synchronize, manage, and share your agent rules (Cursor rules, Cursor commands, Cursor skills, Cursor agents, Copilot instructions, Claude skills and agents, Trae rules and skills, OpenCode agents, skills, commands, and tools, plus universal AGENTS.md support) with ease.*

AIS allows you to centrally manage rules in Git repositories and synchronize them across projects using symbolic links. Say goodbye to copy-pasting `.mdc` files and drifting configurations.

### Why AIS?

- **🧩 Multi-Repository & Decentralized**: Mix and match rules from various sources—company standards, team-specific protocols, or open-source collections—without conflict.
- **🔄 Sync Once, Update Everywhere**: Define your rules in one place. AIS ensures every project stays in sync with the latest standards automatically.
- **🤝 Seamless Team Alignment**: Enforce shared coding standards and behaviors across your entire team. Onboard new members instantly with a single command.
- **🔒 Privacy First**: Need project-specific overrides or private rules? Use `ai-rules-sync.local.json` to keep sensitive rules out of version control.
- **🛠️ Integrated Git Management**: Manage your rule repositories directly through the CLI. Pull updates, check status, or switch branches without leaving your project context using `ais git`.
- **🔌 Plugin Architecture**: Built with a modular adapter system, making it easy to add support for new AI tools in the future.

## Supported Sync Types

| Tool | Type | Mode | Default Source Directory | File Suffixes | Links |
|------|------|------|--------------------------|---------------|-------|
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [Cursor Rules](https://docs.cursor.com/context/rules-for-ai) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [Cursor Commands](https://docs.cursor.com/context/rules-for-ai#commands) |
| Cursor | Skills | directory | `.cursor/skills/` | - | [Cursor Skills](https://docs.cursor.com/context/rules-for-ai#skills) |
| Cursor | Agents | directory | `.cursor/agents/` | - | [Cursor Agents](https://docs.cursor.com/context/rules-for-ai#agents) |
| Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [Copilot Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) |
| Claude | Skills | directory | `.claude/skills/` | - | [Claude Code Skills](https://docs.anthropic.com/en/docs/agents/claude-code) |
| Claude | Agents | directory | `.claude/agents/` | - | [Claude Code Agents](https://docs.anthropic.com/en/docs/agents/claude-code) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [Trae AI](https://trae.ai/) |
| Trae | Skills | directory | `.trae/skills/` | - | [Trae AI](https://trae.ai/) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [OpenCode](https://opencode.ing/) |
| OpenCode | Skills | directory | `.opencode/skills/` | - | [OpenCode](https://opencode.ing/) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [OpenCode](https://opencode.ing/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [OpenCode](https://opencode.ing/) |
| **Universal** | **AGENTS.md** | file | `.` (root) | `.md` | [agents.md standard](https://agents.md/) |

**Modes:**
- **directory**: Links entire directories (skills, agents)
- **file**: Links individual files with automatic suffix resolution
- **hybrid**: Links both files and directories (e.g., Cursor rules can be `.mdc` files or rule directories)

## Install

```bash
npm install -g ai-rules-sync
```

## Create a rules repository

By default, AIS looks for rules in the official tool configuration paths:
- `.cursor/rules/` for Cursor rules
- `.cursor/commands/` for Cursor commands
- `.cursor/skills/` for Cursor skills
- `.cursor/agents/` for Cursor agents
- `.github/instructions/` for Copilot instructions
- `.claude/skills/` for Claude skills
- `.claude/agents/` for Claude agents
- `.trae/rules/` for Trae rules
- `.trae/skills/` for Trae skills
- `.opencode/agents/` for OpenCode agents
- `.opencode/skills/` for OpenCode skills
- `.opencode/commands/` for OpenCode commands
- `.opencode/tools/` for OpenCode tools
- Repository root (`.`) for AGENTS.md files (universal)

You can customize these paths by adding an `ai-rules-sync.json` file to your rules repository:

```json
{
  "rootPath": "src",
  "sourceDir": {
    "cursor": {
      "rules": ".cursor/rules",
      "commands": ".cursor/commands",
      "skills": ".cursor/skills",
      "agents": ".cursor/agents"
    },
    "copilot": {
      "instructions": ".github/instructions"
    },
    "claude": {
      "skills": ".claude/skills",
      "agents": ".claude/agents"
    },
    "trae": {
      "rules": ".trae/rules",
      "skills": ".trae/skills"
    },
    "opencode": {
      "agents": ".opencode/agents",
      "skills": ".opencode/skills",
      "commands": ".opencode/commands",
      "tools": ".opencode/tools"
    },
    "agentsMd": {
      "file": "agents-md"
    }
  }
}
```

- `rootPath`: Optional global prefix applied to all source directories (default: empty, meaning repository root)
- `sourceDir.cursor.rules`: Source directory for Cursor rules (default: `.cursor/rules`)
- `sourceDir.cursor.commands`: Source directory for Cursor commands (default: `.cursor/commands`)
- `sourceDir.cursor.skills`: Source directory for Cursor skills (default: `.cursor/skills`)
- `sourceDir.cursor.agents`: Source directory for Cursor agents (default: `.cursor/agents`)
- `sourceDir.copilot.instructions`: Source directory for Copilot instructions (default: `.github/instructions`)
- `sourceDir.claude.skills`: Source directory for Claude skills (default: `.claude/skills`)
- `sourceDir.claude.agents`: Source directory for Claude agents (default: `.claude/agents`)
- `sourceDir.trae.rules`: Source directory for Trae rules (default: `.trae/rules`)
- `sourceDir.trae.skills`: Source directory for Trae skills (default: `.trae/skills`)
- `sourceDir.opencode.agents`: Source directory for OpenCode agents (default: `.opencode/agents`)
- `sourceDir.opencode.skills`: Source directory for OpenCode skills (default: `.opencode/skills`)
- `sourceDir.opencode.commands`: Source directory for OpenCode commands (default: `.opencode/commands`)
- `sourceDir.opencode.tools`: Source directory for OpenCode tools (default: `.opencode/tools`)
- `sourceDir.agentsMd.file`: Source directory for AGENTS.md files (default: `.` - repository root)

> **Note**: The old flat format (`cursor.rules` as string) is still supported for backward compatibility.

## Global Options

All commands support the following global options:

- `-t, --target <repo>`: Specify the target rule repository to use (name or URL).

## Commands

### Config rules git repository

```bash
ais use [git repository url | repo name]
```

If `[git repository url]` is not provided, it will search the repo name in the `~/.config/ai-rules-sync/config.json` file.

### List all configured repositories

```bash
ais list
```

### Sync Cursor rules to project

```bash
ais cursor add [rule name] [alias]
# or explicitly:
ais cursor rules add [rule name] [alias]
```

This command must be run in the root of your project.

Cursor rules support **hybrid mode** - you can sync both individual rule files (`.mdc`, `.md`) and rule directories:

```bash
# Sync a rule directory
ais cursor add my-rule-dir

# Sync a .mdc file (with or without extension)
ais cursor add coding-standards
ais cursor add coding-standards.mdc

# Sync a .md file
ais cursor add readme.md
```

It will generate a symbolic link from the rules git repository `.cursor/rules/[rule name]` to the project `.cursor/rules/[rule name]`.

If you provide an `[alias]`, it will be linked to `.cursor/rules/[alias]`. This is useful for renaming rules or handling conflicts.

**Adding Private Rules:**

Use the `-l` or `--local` flag to add a rule to `ai-rules-sync.local.json` instead of `ai-rules-sync.json`. This is useful for rules that you don't want to commit to git.

```bash
ais cursor add react --local
```

This command will also automatically add `ai-rules-sync.local.json` to your `.gitignore` file.

Examples:

```bash
# Add 'react' rule as 'react'
ais cursor add react

# Add 'react' rule as 'react-v1'
ais cursor add react react-v1

# Add 'react' rule from a specific repo as 'react-v2'
ais cursor add react react-v2 -t other-repo

# Add 'react' rule directly from a Git URL
ais cursor add react -t https://github.com/user/rules-repo.git
```

### Sync Cursor commands to project

```bash
ais cursor commands add [command name] [alias]
```

This syncs command files from the rules repository `.cursor/commands/` directory to `.cursor/commands/` in your project.

```bash
# Add 'deploy-docs' command
ais cursor commands add deploy-docs

# Add command with alias
ais cursor commands add deploy-docs deploy-docs-v2

# Remove a command
ais cursor commands remove deploy-docs-v2

# Install all commands from config
ais cursor commands install
```

### Sync Cursor skills to project

```bash
ais cursor skills add [skill name] [alias]
```

This syncs skill directories from the rules repository `.cursor/skills/` directory to `.cursor/skills/` in your project.

```bash
# Add 'code-review' skill
ais cursor skills add code-review

# Add skill with alias
ais cursor skills add code-review my-review

# Remove a skill
ais cursor skills remove my-review

# Install all skills from config
ais cursor skills install
```

### Sync Cursor agents to project

```bash
ais cursor agents add [agent name] [alias]
```

This syncs agent directories from the rules repository `.cursor/agents/` directory to `.cursor/agents/` in your project. Cursor agents are subagents defined with Markdown files containing YAML frontmatter.

```bash
# Add 'code-analyzer' agent
ais cursor agents add code-analyzer

# Add agent with alias
ais cursor agents add code-analyzer my-analyzer

# Remove an agent
ais cursor agents remove my-analyzer

# Install all agents from config
ais cursor agents install
```

### Sync Copilot instructions to project

```bash
ais copilot add [name] [alias]
```

Default mapping: rules repo `.github/instructions/<name>` → project `.github/instructions/<alias|name>`.

Suffix matching:
- You may pass `foo`, `foo.md`, or `foo.instructions.md`.
- If both `foo.md` and `foo.instructions.md` exist in the rules repo, AIS will error and you must specify the suffix explicitly.
- If `alias` has no suffix, AIS preserves the source suffix (e.g. `ais copilot add foo y` may create `y.instructions.md`).

### Sync Claude skills to project

```bash
ais claude skills add [skillName] [alias]
```

Default mapping: rules repo `.claude/skills/<skillName>` → project `.claude/skills/<alias|skillName>`.

### Sync Claude agents to project

```bash
ais claude agents add [agentName] [alias]
```

Default mapping: rules repo `.claude/agents/<agentName>` → project `.claude/agents/<alias|agentName>`.

### Sync Trae rules to project

```bash
ais trae rules add [ruleName] [alias]
```

Default mapping: rules repo `.trae/rules/<ruleName>` → project `.trae/rules/<alias|ruleName>`.

### Sync Trae skills to project

```bash
ais trae skills add [skillName] [alias]
```

Default mapping: rules repo `.trae/skills/<skillName>` → project `.trae/skills/<alias|skillName>`.

### Sync AGENTS.md to project

```bash
ais agents-md add [name] [alias]
```

**Universal AGENTS.md support** following the [agents.md standard](https://agents.md/). This adapter is tool-agnostic and syncs AGENTS.md files from your repository to the project root, making agent definitions available to any AI coding tool that supports the agents.md format.

**Flexible path resolution** - supports multiple patterns:
- **Root level**: `ais agents-md add .` or `ais agents-md add AGENTS` → links `repo/AGENTS.md`
- **Directory**: `ais agents-md add frontend` → links `repo/frontend/AGENTS.md`
- **Nested path**: `ais agents-md add docs/team` → links `repo/docs/team/AGENTS.md`
- **Explicit file**: `ais agents-md add backend/AGENTS.md` → links `repo/backend/AGENTS.md`

All patterns link to project `AGENTS.md`. Use aliases to distinguish multiple AGENTS.md files:
```bash
ais agents-md add frontend fe-agents
ais agents-md add backend be-agents
```

### Sync OpenCode agents to project

```bash
ais opencode agents add [agentName] [alias]
```

Default mapping: rules repo `.opencode/agents/<agentName>` → project `.opencode/agents/<alias|agentName>`.

### Sync OpenCode skills to project

```bash
ais opencode skills add [skillName] [alias]
```

Default mapping: rules repo `.opencode/skills/<skillName>` → project `.opencode/skills/<alias|skillName>`.

### Sync OpenCode commands to project

```bash
ais opencode commands add [commandName] [alias]
```

Default mapping: rules repo `.opencode/commands/<commandName>` → project `.opencode/commands/<alias|commandName>`.

### Sync OpenCode tools to project

```bash
ais opencode tools add [toolName] [alias]
```

Default mapping: rules repo `.opencode/tools/<toolName>` → project `.opencode/tools/<alias|toolName>`.


### Remove entries

```bash
# Remove a Cursor rule
ais cursor remove [alias]

# Remove a Cursor command
ais cursor commands remove [alias]

# Remove a Cursor skill
ais cursor skills remove [alias]

# Remove a Cursor agent
ais cursor agents remove [alias]

# Remove a Copilot instruction
ais copilot remove [alias]

# Remove a Claude skill
ais claude skills remove [alias]

# Remove a Claude agent
ais claude agents remove [alias]

# Remove a Trae rule
ais trae rules remove [alias]

# Remove a Trae skill
ais trae skills remove [alias]

# Remove an AGENTS.md file
ais agents-md remove [alias]

# Remove an OpenCode agent
ais opencode agents remove [alias]

# Remove an OpenCode skill
ais opencode skills remove [alias]

# Remove an OpenCode command
ais opencode commands remove [alias]

# Remove an OpenCode tool
ais opencode tools remove [alias]

```

This command removes the symbolic link, the ignore entry, and the dependency from `ai-rules-sync.json` (or `ai-rules-sync.local.json`).

### Import entries to rules repository

Import existing files/directories from your project to the rules repository:

```bash
# Import a Cursor rule
ais import cursor rules [name]
# or
ais cursor rules import [name]

# Import a Cursor command
ais import cursor commands [name]

# Import a Cursor skill
ais import cursor skills [name]

# Import a Cursor agent
ais import cursor agents [name]

# Import a Copilot instruction
ais import copilot instructions [name]

# Import a Claude skill
ais import claude skills [name]

# Import a Claude agent
ais import claude agents [name]

# Import a Trae rule
ais import trae rules [name]

# Import a Trae skill
ais import trae skills [name]

# Import an AGENTS.md file
ais import agents-md [name]

# Import an OpenCode agent
ais import opencode agents [name]

# Import an OpenCode skill
ais import opencode skills [name]

# Import an OpenCode command
ais import opencode commands [name]

# Import an OpenCode tool
ais import opencode tools [name]
```

**Options:**
- `-m, --message <message>`: Custom git commit message
- `-f, --force`: Overwrite if entry already exists in repository
- `-p, --push`: Push to remote repository after commit
- `-l, --local`: Add to ai-rules-sync.local.json (private)

**Examples:**

```bash
# Import a local rule to the rules repository
ais import cursor rules my-custom-rule

# Import with custom commit message and push
ais import cursor rules my-rule -m "Add my custom rule" --push

# Overwrite existing entry in repository
ais cursor rules import my-rule --force
```

The import command will:
1. Copy the entry from your project to the rules repository
2. Create a git commit with the entry
3. Optionally push to remote (with `--push`)
4. Replace the original with a symbolic link
5. Add the dependency to your project config

### ai-rules-sync.json structure

The `ai-rules-sync.json` file stores Cursor rules, commands, and Copilot instructions separately. It supports both simple string values (repo URL) and object values for aliased entries.

```json
{
  "cursor": {
    "rules": {
      "react": "https://github.com/user/repo.git",
      "react-v2": { "url": "https://github.com/user/another-repo.git", "rule": "react" }
    },
    "commands": {
      "deploy-docs": "https://github.com/user/repo.git"
    },
    "skills": {
      "code-review": "https://github.com/user/repo.git"
    },
    "agents": {
      "code-analyzer": "https://github.com/user/repo.git"
    }
  },
  "copilot": {
    "instructions": {
      "general": "https://github.com/user/repo.git"
    }
  },
  "claude": {
    "skills": {
      "code-review": "https://github.com/user/repo.git"
    },
    "agents": {
      "debugger": "https://github.com/user/repo.git"
    }
  },
  "trae": {
    "rules": {
      "project-rules": "https://github.com/user/repo.git"
    },
    "skills": {
      "ai-rules-adapter-builder": "https://github.com/user/repo.git"
    }
  },
  "opencode": {
    "rules": {
      "coding-standards": "https://github.com/user/repo.git"
    },
    "agents": {
      "code-reviewer": "https://github.com/user/repo.git"
    },
    "skills": {
      "refactor-helper": "https://github.com/user/repo.git"
    },
    "commands": {
      "build-optimizer": "https://github.com/user/repo.git"
    },
    "custom-tools": {
      "project-analyzer": "https://github.com/user/repo.git"
    }
  }
}
```

### Local/Private Rules

You can use `ai-rules-sync.local.json` to add private rules/instructions that are not committed to git. This file uses the same structure as `ai-rules-sync.json` and is merged with the main configuration (local takes precedence).

### Install from configuration

If you have an `ai-rules-sync.json` file in your project, you can install all entries with one command:

```bash
# Install all Cursor rules, commands, and skills
ais cursor install

# Install all Copilot instructions
ais copilot install

# Install all Claude skills and agents
ais claude install

# Install all Trae rules and skills
ais trae install

# Install AGENTS.md files
ais agents-md install

# Install all OpenCode agents, skills, commands, and tools
ais opencode install

# Install everything from all tools (smart dispatch)
ais install

# Install everything (Cursor, Copilot, Claude, and Trae)
ais install
```

If your project has only one type (Cursor or Copilot) in the config file, you can omit the mode:

```bash
ais install
ais add <name>
ais remove <alias>
```

This will automatically configure repositories and link entries.

### Git Commands

Use git commands to manage the rules git repository.

```bash
ais git [command]
```

Example: check status of a specific repository:

```bash
ais git status -t [repo name]
```

### Legacy compatibility

- If `ai-rules-sync*.json` does not exist but `cursor-rules*.json` exists, AIS will read it temporarily (Cursor rules only).
- Once you run a write command (e.g. `ais cursor add/remove`), it will migrate and write `ai-rules-sync*.json` for easy future removal of legacy code.

### Tab Completion

AIS supports shell tab completion for bash, zsh, and fish.

#### Automatic Installation (Recommended)

On first run, AIS will detect your shell and offer to install tab completion automatically:

```
🔧 Detected first run of ais
   Shell: zsh (~/.zshrc)

Would you like to install shell tab completion?
[Y]es / [n]o / [?] help:
```

You can also install completion manually at any time:

```bash
ais completion install
```

#### Manual Installation

If you prefer to add it manually:

**Bash** (add to `~/.bashrc`):

```bash
eval "$(ais completion)"
```

**Zsh** (add to `~/.zshrc`):

```bash
eval "$(ais completion)"
```

**Fish** (add to `~/.config/fish/config.fish`):

```fish
ais completion fish | source
```

After enabling, you can use Tab to complete rule names:

```bash
ais cursor add <Tab>         # Lists available rules
ais cursor commands add <Tab>   # Lists available commands
ais cursor skills add <Tab>  # Lists available skills
ais cursor agents add <Tab>  # Lists available agents
ais copilot add <Tab>        # Lists available instructions
ais claude skills add <Tab>  # Lists available skills
ais claude agents add <Tab>  # Lists available agents
ais trae rules add <Tab>     # Lists available rules
ais trae skills add <Tab>    # Lists available skills
```

**Note**: If you encounter `compdef: command not found` errors, ensure your shell has completion initialized. For zsh, add this to your `~/.zshrc` before the ais completion line:

```bash
# Initialize zsh completion system (if not already done)
autoload -Uz compinit && compinit
```

## Architecture

AIS uses a plugin-based adapter architecture with unified operations:

```
CLI Layer
    ↓
Adapter Registry & Lookup (findAdapterForAlias)
    ↓
Unified Operations (addDependency, removeDependency, link, unlink)
    ↓
Sync Engine (linkEntry, unlinkEntry)
    ↓
Config Layer (ai-rules-sync.json via addDependencyGeneric, removeDependencyGeneric)
```

**Key Design Principles:**

1. **Unified Interface**: All adapters (cursor-rules, cursor-commands, cursor-skills, cursor-agents, copilot-instructions, claude-skills, claude-agents, trae-rules, trae-skills) implement the same operations
2. **Auto-Routing**: The `findAdapterForAlias()` function automatically finds the correct adapter based on where an alias is configured
3. **Generic Functions**: `addDependencyGeneric()` and `removeDependencyGeneric()` work with any adapter via `configPath` property
4. **Extensible**: Adding new AI tools only requires creating a new adapter and registering it in the adapter registry

This modular design makes it easy to add support for new AI tools (MCP, Windsurf, etc.) in the future without duplicating add/remove logic.

## Adding a New AI Tool Adapter

To add support for a new AI tool, follow these steps:

1. **Create a new adapter file** (`src/adapters/my-tool.ts`):

```typescript
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

// For directory mode (skills, agents):
export const myToolSkillsAdapter = createBaseAdapter({
  name: 'my-tool-skills',
  tool: 'my-tool',
  subtype: 'skills',
  configPath: ['myTool', 'skills'],
  defaultSourceDir: '.my-tool/skills',
  targetDir: '.my-tool/skills',
  mode: 'directory',
});

// For file mode (single suffix):
export const myToolRulesAdapter = createBaseAdapter({
  name: 'my-tool-rules',
  tool: 'my-tool',
  subtype: 'rules',
  configPath: ['myTool', 'rules'],
  defaultSourceDir: '.my-tool/rules',
  targetDir: '.my-tool/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createSingleSuffixResolver('.md', 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});
```

**Available helper functions:**
- `createSingleSuffixResolver(suffix, entityName)` - For file adapters with one suffix
- `createMultiSuffixResolver(suffixes, entityName)` - For hybrid adapters with multiple suffixes
- `createSuffixAwareTargetResolver(suffixes)` - Ensures target names have proper suffixes

1. **Register the adapter** in `src/adapters/index.ts`:

```typescript
import { myToolAdapter } from './my-tool.js';

// In DefaultAdapterRegistry constructor:
this.register(myToolAdapter);
```

1. **Update ProjectConfig** in `src/project-config.ts` to include your tool's config section:

```typescript
export interface ProjectConfig {
  // ... existing fields ...
  myTool?: {
    configs?: Record<string, RuleEntry>;
  };
}
```

That's it! Your new adapter will automatically support `add`, `remove`, `link`, and `unlink` operations through the unified interface.
