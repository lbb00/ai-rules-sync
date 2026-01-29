# Project Knowledge Base

## Project Overview
**AI Rules Sync (ais)** is a CLI tool designed to synchronize agent rules from a centralized Git repository to local projects using symbolic links. It supports **Cursor rules**, **Cursor commands**, **Cursor skills**, **Cursor agents**, **Copilot instructions**, **Claude Code skills/agents**, **Trae rules/skills**, **OpenCode agents/skills/commands/tools**, and **universal AGENTS.md support**, keeping projects up-to-date across teams.

## Core Concepts
- **Rules Repository**: A Git repository containing rule definitions in official tool paths (`.cursor/rules/`, `.cursor/commands/`, `.cursor/skills/`, `.cursor/agents/`, `.github/instructions/`, `.claude/skills/`, `.claude/agents/`, `.trae/rules/`, `.trae/skills/`, `.opencode/agents/`, `.opencode/skills/`, `.opencode/commands/`, `.opencode/tools/`, `agents-md/`).
- **Symbolic Links**: Entries are linked from the local cache of the repo to project directories, avoiding file duplication and drift.
- **Dependency Tracking**: Uses `ai-rules-sync.json` to track project dependencies (Cursor rules/commands/skills/agents, Copilot instructions, Claude skills/agents, Trae rules/skills, OpenCode agents/skills/commands/tools, AGENTS.md).
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
│   └── agents-md.ts         # Universal AGENTS.md adapter (file mode)
├── cli/                     # CLI registration layer
│   └── register.ts          # Declarative command registration (registerAdapterCommands)
├── commands/                # Command handlers
│   ├── handlers.ts          # Generic add/remove/import handlers
│   ├── helpers.ts           # Helper functions (getTargetRepo, parseConfigEntry, etc.)
│   ├── install.ts           # Generic install function
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

### 13. OpenCode Agent Synchronization
- **Syntax**: `ais opencode agents add <agentName> [alias]`
- Links `<repo>/.opencode/agents/<agentName>` to `.opencode/agents/<alias>`.
- File-based synchronization with `.md` suffix for OpenCode AI agents.

### 14. OpenCode Skill Synchronization
- **Syntax**: `ais opencode skills add <skillName> [alias]`
- Links `<repo>/.opencode/skills/<skillName>` to `.opencode/skills/<alias>`.
- Directory-based synchronization for OpenCode AI skills (SKILL.md inside).

### 15. OpenCode Command Synchronization
- **Syntax**: `ais opencode commands add <commandName> [alias]`
- Links `<repo>/.opencode/commands/<commandName>` to `.opencode/commands/<alias>`.
- File-based synchronization with `.md` suffix for OpenCode AI commands.

### 16. OpenCode Tools Synchronization
- **Syntax**: `ais opencode tools add <toolName> [alias]`
- Links `<repo>/.opencode/tools/<toolName>` to `.opencode/tools/<alias>`.
- File-based synchronization with `.ts`/`.js` suffixes for OpenCode AI tools.

### 17. Import Command
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

### 18. Installation
- `ais cursor install` - Install all Cursor rules, commands, skills, and agents.
- `ais copilot install` - Install all Copilot instructions.
- `ais claude install` - Install all Claude skills and agents.
- `ais trae install` - Install all Trae rules and skills.
- `ais agents-md install` - Install AGENTS.md files.
- `ais opencode install` - Install all OpenCode agents, skills, commands, and tools.
- `ais install` - Install everything (smart dispatch).

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
    "skills": { "ai-rules-adapter-builder": "https://..." }
  },
  "opencode": {
    "agents": { "code-reviewer": "https://..." },
    "skills": { "refactor-helper": "https://..." },
    "commands": { "build-optimizer": "https://..." },
    "tools": { "project-analyzer": "https://..." }
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
