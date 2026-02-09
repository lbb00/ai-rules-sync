# Project Knowledge Base

## Project Overview
**AI Rules Sync (ais)** is a CLI tool designed to synchronize agent rules from a centralized Git repository to local projects using symbolic links. It supports **Cursor rules**, **Cursor commands**, **Cursor skills**, **Cursor agents**, **Copilot instructions**, **Claude Code skills/agents**, **Trae rules/skills**, **OpenCode agents/skills/commands/tools**, **Codex rules/skills**, and **universal AGENTS.md support**, keeping projects up-to-date across teams.

## Core Concepts
- **Rules Repository**: A Git repository containing rule definitions in official tool paths (`.cursor/rules/`, `.cursor/commands/`, `.cursor/skills/`, `.cursor/agents/`, `.github/instructions/`, `.claude/skills/`, `.claude/agents/`, `.trae/rules/`, `.trae/skills/`, `.opencode/agents/`, `.opencode/skills/`, `.opencode/commands/`, `.opencode/tools/`, `.codex/rules/`, `.agents/skills/`, `agents-md/`).
- **Symbolic Links**: Entries are linked from the local cache of the repo to project directories, avoiding file duplication and drift.
- **Dependency Tracking**: Uses `ai-rules-sync.json` to track project dependencies (Cursor rules/commands/skills/agents, Copilot instructions, Claude skills/agents, Trae rules/skills, OpenCode agents/skills/commands/tools, Codex rules/skills, AGENTS.md).
- **Privacy**: Supports private/local entries via `ai-rules-sync.local.json` and `.git/info/exclude`.

## Architecture
- **Language**: TypeScript (Node.js).
- **CLI Framework**: Commander.js.
- **Config**: Stored in `~/.config/ai-rules-sync/config.json` (global) and project roots.
- **Git Operations**: Uses `execa` to run git commands; stores repos in `~/.config/ai-rules-sync/repos/`.
- **Plugin Architecture**: Modular adapter system for different AI tools.
- **Modular CLI**: Declarative command registration using adapters.

### Directory Structure

```
src/
├── adapters/                # Plugin architecture for different AI tools
│   ├── types.ts             # SyncAdapter interface
│   ├── base.ts              # createBaseAdapter factory function
│   ├── index.ts             # Registry and helper functions
│   ├── cursor-rules.ts      # Cursor rules adapter
│   ├── cursor-commands.ts   # Cursor commands adapter
│   ├── cursor-skills.ts     # Cursor skills adapter
│   ├── cursor-agents.ts     # Cursor agents adapter
│   ├── copilot-instructions.ts # Copilot instructions adapter
│   ├── claude-skills.ts     # Claude skills adapter
│   ├── claude-agents.ts     # Claude agents adapter
│   ├── trae-rules.ts        # Trae rules adapter
│   ├── trae-skills.ts       # Trae skills adapter
│   ├── opencode-agents.ts   # OpenCode agents adapter (file mode)
│   ├── opencode-skills.ts   # OpenCode skills adapter (directory mode)
│   ├── opencode-commands.ts # OpenCode commands adapter (file mode)
│   ├── opencode-tools.ts    # OpenCode tools adapter (file mode)
│   ├── codex-rules.ts       # Codex rules adapter (file mode)
│   ├── codex-skills.ts      # Codex skills adapter (directory mode)
│   └── agents-md.ts         # Universal AGENTS.md adapter (file mode)
├── cli/                     # CLI registration layer
│   └── register.ts          # Declarative command registration (registerAdapterCommands)
├── commands/                # Command handlers
│   ├── handlers.ts          # Generic add/remove/import handlers
│   ├── helpers.ts           # Helper functions (getTargetRepo, parseConfigEntry, etc.)
│   ├── install.ts           # Generic install function
│   ├── add-all.ts           # Discover and install all entries from repository
│   └── index.ts             # Module exports
├── completion/              # Shell completion
│   └── scripts.ts           # Shell completion scripts (bash, zsh, fish)
├── config.ts                # Global config management
├── git.ts                   # Git operations
├── index.ts                 # CLI entry point (~560 lines)
├── link.ts                  # Re-exports from sync-engine
├── project-config.ts        # Project config management
├── sync-engine.ts           # Core linkEntry/unlinkEntry/importEntry functions
└── utils.ts                 # Utility functions
```

### Adapter System

The sync engine uses a plugin-based architecture with unified operations:

**SyncAdapter Interface:**
```typescript
interface SyncAdapter {
  // Core properties
  name: string;           // e.g. "cursor-rules"
  tool: string;           // e.g. "cursor"
  subtype: string;        // e.g. "rules", "commands"
  configPath: [string, string]; // e.g. ['cursor', 'rules']
  defaultSourceDir: string; // e.g. ".cursor/rules"
  targetDir: string;      // e.g. ".cursor/rules"
  mode: 'directory' | 'file' | 'hybrid';  // NEW: hybrid supports both
  fileSuffixes?: string[];                // For file mode
  hybridFileSuffixes?: string[];          // NEW: For hybrid mode

  // Optional resolution hooks
  resolveSource?(...): Promise<ResolvedSource>;
  resolveTargetName?(...): string;

  // Unified operations (provided by createBaseAdapter)
  addDependency(projectPath, name, repoUrl, alias?, isLocal?): Promise<{migrated}>;
  removeDependency(projectPath, alias): Promise<{removedFrom, migrated}>;
  link(options): Promise<LinkResult>;
  unlink(projectPath, alias): Promise<void>;
}
```

**Key Benefits:**
- **Unified Interface**: All adapters provide the same add/remove/link/unlink operations
- **No Hardcoding**: configPath allows generic functions to work with any adapter
- **Automatic Routing**: findAdapterForAlias() finds the right adapter based on where alias is configured
- **Reduced Duplication**: Single generic handler for all add/remove/install/import operations

**Adapter Modes:**
- **directory**: Links entire directories (skills, agents)
- **file**: Links individual files with suffix resolution (commands)
- **hybrid**: Links both files and directories (cursor-rules with `.mdc`/`.md` support)

**Helper Functions (base.ts):**
```typescript
// For single-suffix file adapters (e.g., cursor-commands, trae-rules)
createSingleSuffixResolver(suffix: string, entityName: string)

// For hybrid adapters supporting multiple suffixes (e.g., cursor-rules)
createMultiSuffixResolver(suffixes: string[], entityName: string)

// Ensures target name has proper suffix
createSuffixAwareTargetResolver(suffixes: string[])
```

**Example Simplified Adapter (cursor-commands.ts):**
```typescript
export const cursorCommandsAdapter = createBaseAdapter({
  name: 'cursor-commands',
  tool: 'cursor',
  subtype: 'commands',
  configPath: ['cursor', 'commands'],
  defaultSourceDir: '.cursor/commands',
  targetDir: '.cursor/commands',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createSingleSuffixResolver('.md', 'Command'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md'])
});
```

### Modular CLI Architecture

The CLI uses a declarative registration approach:

**Declarative Command Registration (`src/cli/register.ts`):**
```typescript
interface RegisterCommandsOptions {
  adapter: SyncAdapter;
  parentCommand: Command;
  programOpts: () => { target?: string };
}

function registerAdapterCommands(options: RegisterCommandsOptions): void {
  // Automatically registers: add, remove, install, import subcommands
}
```

**Generic Command Handlers (`src/commands/handlers.ts`):**
```typescript
// All handlers work with any adapter
async function handleAdd(adapter, ctx, name, alias?): Promise<AddResult>
async function handleRemove(adapter, projectPath, alias): Promise<RemoveResult>
async function handleImport(adapter, ctx, name, options): Promise<void>
```

**Generic Install Function (`src/commands/install.ts`):**
```typescript
// Replaces 7 duplicate install functions with one generic function
async function installEntriesForAdapter(adapter, projectPath): Promise<void>
async function installEntriesForTool(adapters[], projectPath): Promise<void>
```

**Helper Functions (`src/commands/helpers.ts`):**
- `getTargetRepo(options)`: Resolve target repository from options or config
- `inferDefaultMode(projectPath)`: Auto-detect cursor/copilot mode from config
- `parseConfigEntry(key, value)`: Parse config entry to extract repoUrl, entryName, alias
- `resolveCopilotAliasFromConfig(input, keys)`: Resolve copilot alias with suffix handling

### Sync Engine Functions

**`src/sync-engine.ts`:**
```typescript
// Link from repo to project
async function linkEntry(adapter, options): Promise<LinkResult>

// Unlink from project
async function unlinkEntry(adapter, projectPath, alias): Promise<void>

// Import from project to repo (copy, commit, then create symlink)
async function importEntry(adapter, options): Promise<{imported, sourceName, targetName}>
```

### Configuration Interfaces

**SourceDirConfig (for rules repos):**
```typescript
interface SourceDirConfig {
  cursor?: {
    rules?: string;       // Default: ".cursor/rules"
    commands?: string;    // Default: ".cursor/commands"
    skills?: string;      // Default: ".cursor/skills"
    agents?: string;      // Default: ".cursor/agents"
  };
  copilot?: {
    instructions?: string; // Default: ".github/instructions"
  };
  claude?: {
    skills?: string;      // Default: ".claude/skills"
    agents?: string;      // Default: ".claude/agents"
  };
  trae?: {
    rules?: string;       // Default: ".trae/rules"
    skills?: string;      // Default: ".trae/skills"
  };
  opencode?: {
    agents?: string;      // Default: ".opencode/agents"
    skills?: string;      // Default: ".opencode/skills"
    commands?: string;    // Default: ".opencode/commands"
    tools?: string;       // Default: ".opencode/tools"
  };
  codex?: {
    rules?: string;       // Default: ".codex/rules"
    skills?: string;      // Default: ".agents/skills"
  };
  agentsMd?: {
    file?: string;        // Default: "." (repository root)
  };
}
```

**ProjectConfig (unified configuration):**
```typescript
interface ProjectConfig {
  // For rules repos: global path prefix
  rootPath?: string;
  // For rules repos: source directory configuration
  sourceDir?: SourceDirConfig;
  // For projects: dependency records
  cursor?: {
    rules?: Record<string, RuleEntry>;
    commands?: Record<string, RuleEntry>;
    skills?: Record<string, RuleEntry>;
    agents?: Record<string, RuleEntry>;
  };
  copilot?: {
    instructions?: Record<string, RuleEntry>;
  };
  claude?: {
    skills?: Record<string, RuleEntry>;
    agents?: Record<string, RuleEntry>;
  };
  trae?: {
    rules?: Record<string, RuleEntry>;
    skills?: Record<string, RuleEntry>;
  };
  opencode?: {
    agents?: Record<string, RuleEntry>;
    skills?: Record<string, RuleEntry>;
    commands?: Record<string, RuleEntry>;
    tools?: Record<string, RuleEntry>;
  };
  codex?: {
    rules?: Record<string, RuleEntry>;
    skills?: Record<string, RuleEntry>;
  };
  // Universal AGENTS.md support (tool-agnostic)
  agentsMd?: Record<string, RuleEntry>;
}
```

### Helper Functions

- `getAdapter(tool, subtype)`: Get adapter by tool/subtype, throws if not found
- `getDefaultAdapter(tool)`: Get the first adapter for a tool
- `getToolAdapters(tool)`: Get all adapters for a tool
- `findAdapterForAlias(config, alias)`: Find which adapter manages a specific alias
- `addDependencyGeneric(projectPath, configPath, name, repoUrl, alias?, isLocal?)`: Generic dependency add
- `removeDependencyGeneric(projectPath, configPath, alias)`: Generic dependency remove

## Feature Summary

### 1. Repository Management
- **Use**: `ais use <url|name>` - Configure or switch the active rules repository.
- **List**: `ais list` - Show configured repositories and the active one.
- **Git Proxy**: `ais git <args...>` - Run git commands directly in the active rules repository context.

### 2. Cursor Rule Synchronization
- **Syntax**: `ais cursor add <rule_name> [alias]` or `ais cursor rules add <rule_name> [alias]`
- Links `<repo>/.cursor/rules/<rule_name>` to `.cursor/rules/<alias>`.
- **Mode**: Hybrid - supports both files (`.mdc`, `.md`) and directories.
- **Options**: `-t <repo>`, `--local` (`-l`)

### 3. Cursor Command Synchronization
- **Syntax**: `ais cursor commands add <command_name> [alias]`
- Links `<repo>/.cursor/commands/<command_name>` to `.cursor/commands/<alias>`.
- Supports `.md` files.

### 4. Copilot Instruction Synchronization
- **Syntax**: `ais copilot add <name> [alias]`
- Links `<repo>/.github/instructions/<name>` to `.github/instructions/<alias>`.
- Supports `.md` and `.instructions.md` suffixes with conflict detection.

### 5. Cursor Skill Synchronization
- **Syntax**: `ais cursor skills add <skillName> [alias]`
- Links `<repo>/.cursor/skills/<skillName>` to `.cursor/skills/<alias>`.
- Directory-based synchronization.

### 6. Cursor Agent Synchronization
- **Syntax**: `ais cursor agents add <agentName> [alias]`
- Links `<repo>/.cursor/agents/<agentName>` to `.cursor/agents/<alias>`.
- Directory-based synchronization for Cursor subagents (Markdown files with YAML frontmatter).

### 7. Claude Skill Synchronization
- **Syntax**: `ais claude skills add <skillName> [alias]`
- Links `<repo>/.claude/skills/<skillName>` to `.claude/skills/<alias>`.
- Directory-based synchronization.

### 8. Claude Agent Synchronization
- **Syntax**: `ais claude agents add <agentName> [alias]`
- Links `<repo>/.claude/agents/<agentName>` to `.claude/agents/<alias>`.
- Directory-based synchronization.

### 9. Trae Rule Synchronization
- **Syntax**: `ais trae rules add <ruleName> [alias]`
- Links `<repo>/.trae/rules/<ruleName>` to `.trae/rules/<alias>`.
- File-based synchronization for Trae AI rules.

### 10. Trae Skill Synchronization
- **Syntax**: `ais trae skills add <skillName> [alias]`
- Links `<repo>/.trae/skills/<skillName>` to `.trae/skills/<alias>`.
- Directory-based synchronization for Trae AI skills.

### 11. Universal AGENTS.md Synchronization
- **Syntax**: `ais agents-md add <name> [alias]`
- Links AGENTS.md from repository to `AGENTS.md` (project root).
- **Tool-agnostic**: Follows the [agents.md standard](https://agents.md/) making agent definitions available to any AI coding tool that supports this format.
- **Flexible path resolution** supports multiple patterns:
  - **Root level**: `.`, `AGENTS`, `AGENTS.md` → `repo/AGENTS.md`
  - **Directory**: `frontend` → `repo/frontend/AGENTS.md`
  - **Nested path**: `docs/team` → `repo/docs/team/AGENTS.md`
  - **Explicit file**: `backend/AGENTS.md` → `repo/backend/AGENTS.md`
- File-based synchronization with `.md` suffix.
- **Config structure**: Uses flat `agentsMd` record (not nested like other tools)

### 12. OpenCode Synchronization

OpenCode AI is supported with four different entry types:

### 12.1. OpenCode Agent Synchronization
- **Syntax**: `ais opencode agents add <agentName> [alias]`
- Links `<repo>/.opencode/agents/<agentName>` to `.opencode/agents/<alias>`.
- File-based synchronization with `.md` suffix for OpenCode AI agents.

### 12.2. OpenCode Skill Synchronization
- **Syntax**: `ais opencode skills add <skillName> [alias]`
- Links `<repo>/.opencode/skills/<skillName>` to `.opencode/skills/<alias>`.
- Directory-based synchronization for OpenCode AI skills (SKILL.md inside).

### 12.3. OpenCode Command Synchronization
- **Syntax**: `ais opencode commands add <commandName> [alias]`
- Links `<repo>/.opencode/commands/<commandName>` to `.opencode/commands/<alias>`.
- File-based synchronization with `.md` suffix for OpenCode AI commands.

### 12.4. OpenCode Tools Synchronization
- **Syntax**: `ais opencode tools add <toolName> [alias]`
- Links `<repo>/.opencode/tools/<toolName>` to `.opencode/tools/<alias>`.
- File-based synchronization with `.ts`/`.js` suffixes for OpenCode AI tools.

### 13. Codex Synchronization

OpenAI Codex is supported with two entry types:

### 13.1. Codex Rule Synchronization
- **Syntax**: `ais codex rules add <ruleName> [alias]`
- Links `<repo>/.codex/rules/<ruleName>` to `.codex/rules/<alias>`.
- File-based synchronization with `.rules` suffix for Codex rules (Starlark syntax).
- **Purpose**: Control which commands can run outside sandbox.

### 13.2. Codex Skill Synchronization
- **Syntax**: `ais codex skills add <skillName> [alias]`
- Links `<repo>/.agents/skills/<skillName>` to `.agents/skills/<alias>`.
- Directory-based synchronization for Codex skills (SKILL.md inside).
- **Note**: Uses non-standard `.agents/skills` directory (not `.codex/skills`) per Codex documentation.

### 15. Import Command
- **Syntax**: `ais import <tool> <subtype> <name>` or `ais <tool> <subtype> import <name>`
- Copies entry from project to rules repository, commits, and creates symlink back.
- **Options**:
  - `-m, --message <message>`: Custom commit message
  - `-f, --force`: Overwrite if entry exists in repo
  - `-p, --push`: Push to remote after commit
  - `-l, --local`: Add to local config
- **Examples**:
  ```bash
  ais import cursor rules my-rule
  ais cursor rules import my-rule --push
  ais import copilot instructions my-instruction -m "Add new instruction"
  ```

### 16. Installation
- `ais cursor install` - Install all Cursor rules, commands, skills, and agents.
- `ais copilot install` - Install all Copilot instructions.
- `ais claude install` - Install all Claude skills and agents.
- `ais trae install` - Install all Trae rules and skills.
- `ais opencode install` - Install all OpenCode agents, skills, commands, and tools.
- `ais codex install` - Install all Codex rules and skills.
- `ais agents-md install` - Install AGENTS.md files.
- `ais install` - Install everything (smart dispatch).

### 17. Bulk Discovery and Installation (add-all)

The `add-all` command automatically **discovers and installs all available entries** from the rules repository by scanning the filesystem, unlike `install` which reads from config files.

**Core Implementation** (`src/commands/add-all.ts`):
- `discoverEntriesForAdapter()` - Scans repository directory for a single adapter
- `discoverAllEntries()` - Discovers across all/filtered adapters
- `installDiscoveredEntries()` - Batch installs discovered entries
- `handleAddAll()` - Main orchestrator

**Command Hierarchy**:
- **Top-level**: `ais add-all` - All tools, supports `--tools` and `--adapters` filters
- **Tool-level**: `ais cursor add-all`, `ais copilot add-all`, etc. - Filters to specific tool
- **Subtype-level**: `ais cursor rules add-all`, `ais cursor commands add-all`, etc. - Filters to specific adapter

**Discovery Algorithm**:
1. Get source directory from repo config using `getRepoSourceConfig()` and `getSourceDir()`
2. Scan filesystem with `fs.readdir()` filtering hidden files (starting with `.`)
3. Apply adapter mode filters:
   - **file mode**: Include files matching `fileSuffixes` (e.g., `.md`)
   - **directory mode**: Include only directories
   - **hybrid mode**: Include files matching `hybridFileSuffixes` AND directories
4. Extract entry names by stripping suffixes for files
5. Check existing config to mark already-configured entries

**Options**:
- `--dry-run` - Preview without making changes
- `--force` - Overwrite existing entries (re-link and update config)
- `--interactive` - Prompt for each entry using readline
- `--local` - Store in `ai-rules-sync.local.json`
- `--skip-existing` - Skip entries already in config (default behavior)
- `--quiet` - Minimal output
- `--tools <tools>` - Filter by comma-separated tool names (top-level only)
- `--adapters <adapters>` - Filter by comma-separated adapter names (top-level only)

**Examples**:
```bash
# Preview all Cursor rules
ais cursor rules add-all --dry-run

# Install all Cursor entries (rules, commands, skills, agents)
ais cursor add-all

# Install all entries from all tools
ais add-all

# Install only from specific tools
ais add-all --tools cursor,copilot

# Interactive confirmation
ais cursor add-all --interactive

# Install as private entries
ais cursor rules add-all --local
```

**Output Format**:
```
Discovering entries from repository...
  cursor-rules: 5 entries
  cursor-commands: 3 entries
Total: 8 entries discovered

Installing entries:
[1/8] cursor-rules/react → .cursor/rules/react ✓
[2/8] cursor-rules/testing → .cursor/rules/testing ✓
[3/8] cursor-commands/deploy → .cursor/commands/deploy ⊘ (already configured)
...

Summary:
  Installed: 7
  Skipped: 1 (already configured)
  Errors: 0
```

**Integration**:
- Uses existing adapter system and `addDependency()`/`link()` methods
- Works with all adapter modes (file/directory/hybrid)
- Respects repository source directory configuration
- Compatible with `ais install` (discovered entries are added to config)

### 18. Custom Source Directories for Third-Party Repositories

**Problem**: Third-party rules repositories may not have `ai-rules-sync.json` or use non-standard directory structures (e.g., `rules/cursor/` instead of `.cursor/rules`).

**Solution**: 4-layer priority system for custom source directory configuration:

```
CLI Parameters > Global Config > Repository Config > Adapter Defaults
```

**Implementation** (`src/cli/source-dir-parser.ts`, `src/commands/config.ts`):
- CLI parameter parsing with context-aware simple format and explicit dot notation
- Global config persistence in `~/.config/ai-rules-sync/config.json`
- Enhanced `getSourceDir()` with `globalOverride` parameter
- Config management commands for persistent configuration

**CLI Parameter Formats:**

```bash
# Simple format (context-aware - when tool/subtype is clear)
ais cursor rules add-all -s custom/rules
ais cursor add-all -s rules=custom/rules -s commands=custom/cmds

# Dot notation (explicit - requires full tool.subtype)
ais add-all -s cursor.rules=custom/rules -s cursor.commands=custom/cmds

# Multiple overrides (can repeat -s flag)
ais add-all \
  -s cursor.rules=rules/cursor \
  -s cursor.commands=commands \
  -s claude.skills=claude/skills
```

**Global Configuration Commands:**

```bash
# Set custom source directory (persistent)
ais config repo set-source <repoName> <tool.subtype> <path>
ais config repo set-source third-party cursor.rules custom/rules

# View repository configuration
ais config repo show <repoName>

# Clear source directory
ais config repo clear-source <repoName> [tool.subtype]

# List all repositories
ais config repo list
```

**Configuration Structure:**

```json
// Global config (~/.config/ai-rules-sync/config.json)
{
  "currentRepo": "third-party-rules",
  "repos": {
    "third-party-rules": {
      "name": "third-party-rules",
      "url": "https://github.com/someone/rules",
      "path": "/Users/user/.config/ai-rules-sync/repos/third-party-rules",
      "sourceDir": {
        "cursor": {
          "rules": "rules/cursor",
          "commands": "commands/cursor"
        },
        "claude": {
          "skills": "claude/skills"
        }
      }
    }
  }
}
```

**Priority Resolution in `getSourceDir()`:**

1. **CLI override** (highest priority) - `-s` parameter, no rootPath prefix
2. **Global config** - From `RepoConfig.sourceDir`, no rootPath prefix
3. **Repository config** - From repo's `ai-rules-sync.json`, with rootPath prefix
4. **Adapter default** (lowest priority) - Hardcoded in adapter definition

**Use Cases:**

- **One-time exploration**: Use CLI parameter to test repositories
- **Regular use**: Configure once with `config repo set-source`, use normally
- **Override**: CLI parameter overrides even global config

**add-all Integration:**

All `add-all` commands support `-s/--source-dir` option:
- Top-level: `ais add-all -s tool.subtype=path`
- Tool-level: `ais cursor add-all -s rules=path`
- Subtype-level: `ais cursor rules add-all -s custom/rules`

**Files Involved:**
- `src/config.ts` - Extended `RepoConfig` with `sourceDir` field
- `src/project-config.ts` - Enhanced `getSourceDir()` with 4-layer priority
- `src/commands/add-all.ts` - Added `sourceDirOverrides` parameter
- `src/cli/source-dir-parser.ts` - Parameter parsing logic
- `src/commands/config.ts` - Config management commands
- `src/cli/register.ts` - Added `-s` option to adapter commands
- `src/index.ts` - Added `-s` option and config commands

**Example Workflow:**

```bash
# Discover what a third-party repo has (preview)
ais cursor rules add-all -s custom/rules --dry-run

# Configure for regular use
ais config repo set-source my-third-party cursor.rules custom/rules
ais config repo set-source my-third-party cursor.commands custom/commands

# Use normally (sourceDir automatically applied)
ais cursor add-all

# Override temporarily
ais cursor rules add-all -s experimental/rules
```

### 19. Configuration Files

**Rules Repository Config** (`ai-rules-sync.json` in the rules repo):
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
    "codex": {
      "rules": ".codex/rules",
      "skills": ".agents/skills"
    },
    "agentsMd": {
      "file": "."
    }
  }
}
```

**Project Config** (`ai-rules-sync.json` in user projects):
```json
{
  "cursor": {
    "rules": { "react": "https://..." },
    "commands": { "deploy-docs": "https://..." },
    "skills": { "code-review": "https://..." },
    "agents": { "code-analyzer": "https://..." }
  },
  "copilot": {
    "instructions": { "general": "https://..." }
  },
  "claude": {
    "skills": { "my-skill": "https://..." },
    "agents": { "debugger": "https://..." }
  },
  "trae": {
    "rules": { "project-rules": "https://..." },
    "skills": { "new-adapter": "https://..." }
  },
  "opencode": {
    "agents": { "code-reviewer": "https://..." },
    "skills": { "refactor-helper": "https://..." },
    "commands": { "build-optimizer": "https://..." },
    "tools": { "project-analyzer": "https://..." }
  },
  "codex": {
    "rules": { "sandbox-rules": "https://..." },
    "skills": { "code-assistant": "https://..." }
  },
  "agentsMd": {
    "root": {
      "url": "https://...",
      "rule": "AGENTS.md"
    },
    "frontend": {
      "url": "https://...",
      "rule": "frontend/AGENTS.md"
    }
  }
}
```

- **`ai-rules-sync.local.json`**: Private dependencies (merged, takes precedence).
- **Legacy format**: Old configs with `cursor.rules` as string are still supported.
- **Legacy files**: `cursor-rules*.json` are read-only compatible; write operations migrate to new format.

### 20. Shell Completion
- **Auto-Install**: On first run, AIS prompts to install shell completion automatically.
- **Manual Install**: `ais completion install` - Installs completion to shell config file.
- **Script Output**: `ais completion [bash|zsh|fish]` - Outputs raw completion script.
- **Detection**: Automatically detects shell type from `$SHELL` environment variable.
- **Shell scripts** stored in `src/completion/scripts.ts`.

## Adapter Reference Table

| Adapter | Tool | Subtype | Mode | Source Dir | File Suffixes | Reference |
|---------|------|---------|------|------------|---------------|-----------|
| cursor-rules | cursor | rules | hybrid | .cursor/rules | .mdc, .md | [Cursor Rules](https://docs.cursor.com/context/rules-for-ai) |
| cursor-commands | cursor | commands | file | .cursor/commands | .md | [Cursor Commands](https://docs.cursor.com/context/rules-for-ai#commands) |
| cursor-skills | cursor | skills | directory | .cursor/skills | - | [Cursor Skills](https://docs.cursor.com/context/rules-for-ai#skills) |
| cursor-agents | cursor | agents | directory | .cursor/agents | - | [Cursor Agents](https://docs.cursor.com/context/rules-for-ai#agents) |
| copilot-instructions | copilot | instructions | file | .github/instructions | .instructions.md, .md | [Copilot Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) |
| claude-skills | claude | skills | directory | .claude/skills | - | [Claude Code Skills](https://docs.anthropic.com/en/docs/agents/claude-code) |
| claude-agents | claude | agents | directory | .claude/agents | - | [Claude Code Agents](https://docs.anthropic.com/en/docs/agents/claude-code) |
| trae-rules | trae | rules | file | .trae/rules | .md | [Trae AI](https://trae.ai/) |
| trae-skills | trae | skills | directory | .trae/skills | - | [Trae AI](https://trae.ai/) |
| **agents-md** | **agents-md** | **file** | **file** | **.** (root) | **.md** | **[agents.md standard](https://agents.md/)** |
| opencode-agents | opencode | agents | file | .opencode/agents | .md | [OpenCode](https://opencode.ing/) |
| opencode-skills | opencode | skills | directory | .opencode/skills | - | [OpenCode](https://opencode.ing/) |
| opencode-commands | opencode | commands | file | .opencode/commands | .md | [OpenCode](https://opencode.ing/) |
| opencode-tools | opencode | tools | file | .opencode/tools | .ts, .js | [OpenCode](https://opencode.ing/) |
| codex-rules | codex | rules | file | .codex/rules | .rules | [OpenAI Codex Rules](https://developers.openai.com/codex/rules) |
| codex-skills | codex | skills | directory | .agents/skills | - | [OpenAI Codex Skills](https://developers.openai.com/codex/skills) |

## Development Guidelines
- **TypeScript**: Strict mode enabled.
- **Testing**: Vitest for unit tests.
- **Style**: Functional programming style preferred.
- **Adding New AI Tools**:
  1. Create adapter in `src/adapters/<tool>.ts`
  2. Register in `src/adapters/index.ts`
  3. Add CLI commands in `src/index.ts` using `registerAdapterCommands()`
  4. Update `ProjectConfig` interface in `src/project-config.ts`

### Choosing Adapter Mode

- Use **directory** mode for tools that organize entries as folders (skills, agents)
- Use **file** mode for tools with single files and consistent suffix (commands with `.md`)
- Use **hybrid** mode when entries can be either files or directories (cursor-rules)

## Recent Changes

### OpenAI Codex Support (2026-02)

**Added complete support for OpenAI Codex project-level rules and skills:**

**Problem Solved:**
- Teams using Codex needed to share rules and skills across projects
- No centralized way to distribute Codex configurations
- Manual copying led to drift and inconsistency

**Features Implemented:**

1. **Codex Rules Adapter**:
   - File mode with `.rules` suffix
   - Source: `.codex/rules/`
   - Syntax: `ais codex rules add <ruleName> [alias]`
   - Purpose: Control which commands can run outside sandbox using Starlark syntax

2. **Codex Skills Adapter**:
   - Directory mode (SKILL.md + optional scripts/assets)
   - Source: `.agents/skills/` (non-standard location per Codex docs)
   - Syntax: `ais codex skills add <skillName> [alias]`
   - Purpose: Task-specific capabilities that extend Codex

3. **CLI Commands**:
   - `ais codex install` - Install all Codex rules and skills
   - `ais codex add-all` - Discover and add all entries from repository
   - `ais codex import <name>` - Import from project to repository (auto-detects subtype)
   - `ais codex rules [add|remove|install|import]` - Rules management
   - `ais codex skills [add|remove|install|import]` - Skills management

4. **Configuration Support**:
   - Extended `SourceDirConfig` with `codex.rules` and `codex.skills`
   - Extended `ProjectConfig` with `codex.rules` and `codex.skills` records
   - Full support for custom source directories via `-s` option
   - Backward compatible with existing configs

5. **Shell Completion**:
   - Added Codex to bash, zsh, and fish completion scripts
   - Dynamic completion for rule/skill names via `ais _complete codex-rules|codex-skills`
   - Context-aware completions for all subcommands

6. **Mode Detection**:
   - Added 'codex' to `DefaultMode` type
   - `ais install` smart dispatch includes Codex
   - Auto-detect Codex-only projects

**Implementation:**
- `src/adapters/codex-rules.ts` - Rules adapter (file mode, `.rules` suffix)
- `src/adapters/codex-skills.ts` - Skills adapter (directory mode, `.agents/skills`)
- `src/adapters/index.ts` - Registered adapters and added to `findAdapterForAlias`
- `src/project-config.ts` - Extended configuration interfaces and helpers
- `src/commands/helpers.ts` - Added 'codex' mode type and inference
- `src/index.ts` - Full CLI command hierarchy with install/add-all/import
- `src/completion/scripts.ts` - Shell completion for all three shells
- `tests/codex-adapters.test.ts` - Complete test coverage (9 tests)

**Files Changed:** 9 new/modified, all tests passing (126/126)

**Benefits:**
- Centralized Codex configuration management
- Team-wide consistency for sandbox rules
- Easy sharing of skills across projects
- Follows same pattern as other supported tools

### Custom Source Directories for Third-Party Repositories (2026-01)

**Added 4-layer priority system for custom source directory configuration:**

**Problem Solved:**
- Third-party repositories without `ai-rules-sync.json` were unusable
- Repositories with non-standard directory structures (e.g., `rules/cursor/` instead of `.cursor/rules`) required forking
- No way to override source directories without modifying the repository

**Solution - 4-Layer Priority:**
```
CLI Parameters > Global Config > Repository Config > Adapter Defaults
```

**Features Implemented:**

1. **CLI Parameters (`-s/--source-dir`)**:
   - Simple format: `ais cursor rules add-all -s custom/rules`
   - Dot notation: `ais add-all -s cursor.rules=custom/rules`
   - Supports multiple `-s` flags
   - Context-aware parsing (infers tool/subtype from command)

2. **Global Configuration Commands**:
   - `ais config repo set-source <name> <tool.subtype> <path>` - Persist custom sourceDir
   - `ais config repo show <name>` - View repository configuration
   - `ais config repo clear-source <name> [tool.subtype]` - Remove custom sourceDir
   - `ais config repo list` - List all repositories with sourceDir

3. **Enhanced Architecture**:
   - Extended `RepoConfig` interface with `sourceDir?: SourceDirConfig`
   - Enhanced `getSourceDir()` with `globalOverride` parameter (4-layer priority logic)
   - All `add-all` commands support `-s` option (top-level, tool-level, subtype-level)
   - Custom parser with simple and dot notation format support

4. **Configuration Persistence**:
   - Global config stored in `~/.config/ai-rules-sync/config.json`
   - Per-repository `sourceDir` configuration
   - CLI overrides have highest priority (temporary)
   - Global config persists across sessions

**Use Cases:**
- **Exploration**: `ais cursor rules add-all -s custom/rules --dry-run`
- **Persistent**: `ais config repo set-source my-repo cursor.rules custom/rules`
- **Override**: CLI parameter overrides saved configuration

**Files Changed:**
- `src/config.ts` - Added `sourceDir` to `RepoConfig` interface
- `src/project-config.ts` - Enhanced `getSourceDir()` with priority logic
- `src/commands/add-all.ts` - Added `sourceDirOverrides` parameter throughout
- `src/cli/source-dir-parser.ts` - New parameter parsing module
- `src/commands/config.ts` - New config management commands
- `src/cli/register.ts` - Added `-s` option to all adapter commands
- `src/index.ts` - Added `-s` to all add-all commands + config command group
- `README.md` - Added comprehensive documentation section

**Benefits:**
- Works with any repository (no ai-rules-sync.json required)
- Flexible (CLI for quick tests, config for persistent use)
- Non-destructive (doesn't modify third-party repositories)
- User-friendly (smart context detection in simple format)

### Configuration Directory Migration (2026-01)

**Changed global configuration location to follow XDG Base Directory specification:**
- **Old**: `~/.ai-rules-sync/`
- **New**: `~/.config/ai-rules-sync/`

**Impact:**
- Global config file: `~/.config/ai-rules-sync/config.json`
- Repository cache: `~/.config/ai-rules-sync/repos/`
- No automatic migration provided - users must manually move files if needed
- Aligns with Linux/macOS standards for configuration file placement

**Files Changed:**
- `src/config.ts` - Updated `CONFIG_DIR` constant
- `tests/config.test.ts` - Updated test fixtures
- Documentation updated to reflect new paths

### OpenCode AI Support (2026-01)

**Added complete support for OpenCode AI (https://opencode.ai) with 5 component types:**
- **Rules** (`.opencode/rules/`) - File mode with `.md` suffix
- **Agents** (`.opencode/agents/`) - Directory mode
- **Skills** (`.opencode/skills/`) - Directory mode
- **Commands** (`.opencode/commands/`) - Directory mode
- **Custom-tools** (`.opencode/custom-tools/`) - Directory mode

**Implementation:**
- Created 5 new adapters following existing patterns
- Extended `ProjectConfig` and `SourceDirConfig` interfaces
- Added CLI commands: `ais opencode [rules|agents|skills|commands|custom-tools] [add|remove|install|import]`
- Updated shell completion scripts (bash, zsh, fish)
- Added `_complete` command support for all OpenCode types
- Updated mode inference to recognize OpenCode projects

**Files Changed:**
- `src/adapters/opencode-rules.ts` - New adapter (file mode, .md)
- `src/adapters/opencode-agents.ts` - New adapter (directory mode)
- `src/adapters/opencode-skills.ts` - New adapter (directory mode)
- `src/adapters/opencode-commands.ts` - New adapter (directory mode)
- `src/adapters/opencode-custom-tools.ts` - New adapter (directory mode)
- `src/adapters/index.ts` - Registered all 5 OpenCode adapters
- `src/project-config.ts` - Extended configuration interfaces
- `src/commands/helpers.ts` - Added 'opencode' mode type
- `src/index.ts` - Added OpenCode CLI commands and completion
- `src/completion/scripts.ts` - Added OpenCode to all shell completions
- `README.md` - Documented OpenCode support
- `KNOWLEDGE_BASE.md` - Updated architecture and feature documentation

### OpenCode Adapters Fix & Universal AGENTS.md Support (2026-01)

**Fixed OpenCode adapter modes to match official OpenCode documentation:**
- **Removed** `opencode-rules` adapter (OpenCode doesn't have a rules type)
- **Fixed** `opencode-agents` - Changed from directory to **file mode** with `.md` suffix
- **Fixed** `opencode-commands` - Changed from directory to **file mode** with `.md` suffix
- **Renamed** `opencode-custom-tools` → `opencode-tools` - Changed to **file mode** with `.ts`/`.js` suffixes
- **Kept** `opencode-skills` - Remains **directory mode** (contains SKILL.md inside)

**Added Universal AGENTS.md Support:**
- **New adapter**: `agents-md` - Tool-agnostic support for the [agents.md standard](https://agents.md/)
- Syncs AGENTS.md files from repository to project root
- Makes agent definitions available to any AI coding tool supporting the agents.md format
- **Mode**: File mode with `.md` suffix
- **Target**: Project root (`.`)

**Configuration Changes:**
- Removed `opencode.rules` from all config interfaces
- Renamed `opencode['custom-tools']` → `opencode.tools`
- Added new top-level `agentsMd` configuration section
- Updated `SourceDirConfig` and `ProjectConfig` interfaces

**CLI Changes:**
- Added new top-level command group: `ais agents-md [add|remove|install|import]`
- Removed `ais opencode rules` subcommand
- Changed `ais opencode custom-tools` → `ais opencode tools`
- Updated all error messages and help text

**Implementation:**
- `src/adapters/agents-md.ts` - New universal adapter
- `src/adapters/opencode-rules.ts` - Deleted
- `src/adapters/opencode-custom-tools.ts` - Renamed to `opencode-tools.ts`
- `src/adapters/opencode-agents.ts` - Fixed to file mode
- `src/adapters/opencode-commands.ts` - Fixed to file mode
- `src/adapters/opencode-tools.ts` - Updated to file mode with .ts/.js
- `src/adapters/index.ts` - Updated registry
- `src/project-config.ts` - Updated all config interfaces
- `src/commands/helpers.ts` - Added 'agents-md' mode
- `src/index.ts` - Updated CLI commands and completion
- `src/completion/scripts.ts` - Updated all shell completions
- `README.md` & `README_ZH.md` - Documented changes with reference links
- `KNOWLEDGE_BASE.md` - Updated architecture documentation

**Reference Links Added:**
All documentation now includes links to official tool documentation for easy reference.

### AGENTS.md Adapter Redesign (2026-01)

**Redesigned agents-md adapter for flexible AGENTS.md location:**

**Problem Solved:**
- Old adapter required AGENTS.md files in fixed `agents-md/` directory
- Didn't align with agents.md standard allowing files anywhere in repo
- Limited name resolution didn't support path-based lookup

**New Design:**
- **Changed default source directory**: `agents-md` → `.` (repository root)
- **Flexible path resolution** supports 4 patterns:
  1. **Explicit file path**: `frontend/AGENTS.md` → `repo/frontend/AGENTS.md`
  2. **Directory path**: `docs/team` → `repo/docs/team/AGENTS.md` (auto-appends /AGENTS.md)
  3. **Simple name**: `frontend` → tries `repo/frontend/AGENTS.md`, then `repo/AGENTS.md`
  4. **Root level**: `.` or `AGENTS` → `repo/AGENTS.md`
- **Case insensitive**: Supports both `AGENTS.md` and `agents.md` variants
- **Custom config management**: Uses flat `agentsMd` structure instead of nested like other tools

**Configuration Changes:**
```json
// Old (rules repo)
{ "sourceDir": { "agentsMd": { "file": "agents-md" } } }

// New (rules repo) - supports any directory
{ "sourceDir": { "agentsMd": { "file": "." } } }

// Project config - flat structure with flexible paths
{
  "agentsMd": {
    "root": { "url": "...", "rule": "AGENTS.md" },
    "frontend": { "url": "...", "rule": "frontend/AGENTS.md" },
    "platform": { "url": "...", "rule": "docs/teams/platform/AGENTS.md" }
  }
}
```

**Implementation Details:**
- Custom `resolveSource` with multi-pattern path resolution
- Custom `addDependency`/`removeDependency` for flat config structure
- Fixed alias handling in `handleAdd` to prioritize user-provided aliases
- Validates that only AGENTS.md files are supported (rejects other .md files)

**Migration:**
- **No breaking changes**: Old configs continue to work
- Existing `agents-md/AGENTS.md` will still be found
- Users can gradually migrate to new flexible structure
- New projects can organize AGENTS.md files by directory (frontend/, backend/, etc.)

**Files Changed:**
- `src/adapters/agents-md.ts` - Complete rewrite with flexible resolution
- `src/project-config.ts` - Updated default comment and config handling
- `src/commands/handlers.ts` - Fixed alias handling for all adapters
- `KNOWLEDGE_BASE.md`, `README.md`, `README_ZH.md` - Documentation updates

### Custom Target Directories (2026-01)

**Added support for custom target directories per entry:**

**Feature Overview:**
- Users can now specify custom target directories for each synced entry
- Allows flexible organization beyond default tool directories
- Perfect for documentation projects, monorepos, and custom team structures
- Supports aliasing same rule to multiple locations

**Implementation:**
- **Entry-level configuration**: Each config entry can specify `targetDir` field
- **CLI option**: Added `-d, --target-dir <dir>` to all `add` commands
- **Priority resolution**: options.targetDir > config entry targetDir > adapter default
- **Conflict detection**: Prevents overwriting when adding same rule to different locations without alias
- **Suffix handling**: Properly resolves file suffixes when removing aliased entries

**Configuration Examples:**

```json
{
  "cursor": {
    "rules": {
      // Default target directory (.cursor/rules/)
      "standard-rule": "https://github.com/company/rules",

      // Custom target directory
      "docs-rule": {
        "url": "https://github.com/company/rules",
        "targetDir": "docs/ai/rules"
      },

      // Same rule to multiple locations (requires alias)
      "frontend-auth": {
        "url": "https://github.com/company/rules",
        "rule": "auth-rules",
        "targetDir": "packages/frontend/.cursor/rules"
      },
      "backend-auth": {
        "url": "https://github.com/company/rules",
        "rule": "auth-rules",
        "targetDir": "packages/backend/.cursor/rules"
      }
    }
  }
}
```

**CLI Usage:**

```bash
# Add rule to custom directory
ais cursor add my-rule -d docs/ai/rules

# Add same rule to multiple locations (requires alias)
ais cursor add auth-rules frontend-auth -d packages/frontend/.cursor/rules
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules

# Remove specific location (uses alias as config key)
ais cursor remove frontend-auth

# Install respects custom targetDir from config
ais cursor install
```

**Key Behaviors:**
- **No alias needed** for first-time adds or when targeting different source files
- **Alias required** when adding same source file to different location (prevents config key conflicts)
- **Backward compatible**: Entries without `targetDir` use adapter default
- **Config format**: Uses simple string when no custom targetDir; object format when specified
- **Install support**: `install` command reads and respects `targetDir` from config

**Files Changed:**
- `src/project-config.ts` - Extended `RuleEntry` type, added `getTargetDir()` and `getEntryConfig()`
- `src/sync-engine.ts` - Dynamic target directory resolution in `linkEntry()`, `unlinkEntry()`, `importEntry()`
- `src/adapters/types.ts` - Extended `SyncOptions` and `addDependency` signature
- `src/adapters/base.ts` - Pass `targetDir` through to config functions
- `src/adapters/agents-md.ts` - Updated custom `addDependency()` for `targetDir` support
- `src/commands/handlers.ts` - Added `AddOptions` with conflict detection
- `src/commands/install.ts` - Extract and pass `targetDir` during installation
- `src/cli/register.ts` - Added `-d, --target-dir` option to adapter commands
- `src/index.ts` - Added `-d, --target-dir` to hardcoded cursor/copilot commands
- All tests passing (105/105)
