# Project Knowledge Base

## Project Overview
**AI Rules Sync (ais)** is a CLI tool designed to synchronize agent rules from a centralized Git repository to local projects using symbolic links. It supports **Cursor rules**, **Cursor commands**, **Cursor skills**, **Cursor subagents**, **Copilot instructions**, **Claude Code rules/skills/subagents/CLAUDE.md**, **Trae rules/skills**, **OpenCode agents/skills/commands/tools**, **Codex rules/skills**, **Gemini CLI commands/skills/subagents**, **Windsurf rules**, **Cline rules**, and **universal AGENTS.md support**, keeping projects up-to-date across teams.

A key feature is **User Mode** (`--user` / `-u`): use `$HOME` as project root to manage AI config files in `~/.claude/`, `~/.cursor/`, etc. Entries are tracked in `~/.config/ai-rules-sync/user.json` (or a user-configured custom path for dotfiles integration) and gitignore management is skipped automatically.

## Core Concepts
- **Rules Repository**: A Git repository containing rule definitions in official tool paths (`.cursor/rules/`, `.cursor/commands/`, `.cursor/skills/`, `.cursor/agents/`, `.github/instructions/`, `.claude/skills/`, `.claude/agents/`, `.claude/` (for CLAUDE.md), `.trae/rules/`, `.trae/skills/`, `.opencode/agents/`, `.opencode/skills/`, `.opencode/commands/`, `.opencode/tools/`, `.codex/rules/`, `.agents/skills/`, `.gemini/commands/`, `.gemini/skills/`, `.gemini/agents/`, `.windsurf/rules/`, `.clinerules/`, `agents-md/`).
- **Symbolic Links**: Entries are linked from the local cache of the repo to project directories, avoiding file duplication and drift.
- **Dependency Tracking**: Uses `ai-rules-sync.json` to track project dependencies (Cursor rules/commands/skills/subagents, Copilot instructions, Claude Code rules/skills/subagents/CLAUDE.md, Trae rules/skills, OpenCode agents/skills/commands/tools, Codex rules/skills, Gemini CLI commands/skills/subagents, Windsurf rules, Cline rules, AGENTS.md).
- **Privacy**: Supports private/local entries via `ai-rules-sync.local.json` and `.git/info/exclude`.
- **User Mode**: `--user` / `-u` flag on add/remove/install commands. Sets `projectPath = $HOME`, stores dependencies in `~/.config/ai-rules-sync/user.json`, skips gitignore management. Enables `ais user install` to restore all user-scope symlinks on a new machine. (`--global`/`-g` kept as deprecated aliases.)
- **User Config Path**: Configurable via `ais config user set <path>` for dotfiles integration (e.g. `~/dotfiles/ai-rules-sync/user.json`).

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
│   ├── claude-rules.ts      # Claude rules adapter (.claude/rules/)
│   ├── claude-md.ts         # Claude CLAUDE.md adapter (.claude/, global mode)
│   ├── trae-rules.ts        # Trae rules adapter
│   ├── trae-skills.ts       # Trae skills adapter
│   ├── opencode-agents.ts   # OpenCode agents adapter (file mode)
│   ├── opencode-skills.ts   # OpenCode skills adapter (directory mode)
│   ├── opencode-commands.ts # OpenCode commands adapter (file mode)
│   ├── opencode-tools.ts    # OpenCode tools adapter (file mode)
│   ├── codex-rules.ts       # Codex rules adapter (file mode)
│   ├── codex-skills.ts      # Codex skills adapter (directory mode)
│   ├── gemini-commands.ts   # Gemini CLI commands adapter (file mode)
│   ├── gemini-skills.ts     # Gemini CLI skills adapter (directory mode)
│   ├── gemini-agents.ts     # Gemini CLI agents adapter (file mode)
│   ├── windsurf-rules.ts    # Windsurf rules adapter (file mode)
│   ├── cline-rules.ts       # Cline rules adapter (file mode)
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
    rules?: string;       // Default: ".claude/rules"
    md?: string;          // Default: ".claude"
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
  gemini?: {
    commands?: string;    // Default: ".gemini/commands"
    skills?: string;      // Default: ".gemini/skills"
    agents?: string;      // Default: ".gemini/agents"
  };
  warp?: {
    skills?: string;      // Default: ".agents/skills"
  };
  windsurf?: {
    rules?: string;       // Default: ".windsurf/rules"
  };
  cline?: {
    rules?: string;       // Default: ".clinerules"
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
    rules?: Record<string, RuleEntry>;
    md?: Record<string, RuleEntry>;
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
  gemini?: {
    commands?: Record<string, RuleEntry>;
    skills?: Record<string, RuleEntry>;
    agents?: Record<string, RuleEntry>;
  };
  warp?: {
    skills?: Record<string, RuleEntry>;
  };
  windsurf?: {
    rules?: Record<string, RuleEntry>;
  };
  cline?: {
    rules?: Record<string, RuleEntry>;
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

### 7. Claude Code Skill Synchronization
- **Syntax**: `ais claude skills add <skillName> [alias]`
- Links `<repo>/.claude/skills/<skillName>` to `.claude/skills/<alias>`.
- Directory-based synchronization.

### 8. Claude Code Subagent Synchronization
- **Syntax**: `ais claude agents add <agentName> [alias]`
- Links `<repo>/.claude/agents/<agentName>` to `.claude/agents/<alias>`.
- Directory-based synchronization.

### 8b. Claude Code Rule Synchronization
- **Syntax**: `ais claude rules add <ruleName> [alias]`
- Links `<repo>/.claude/rules/<ruleName>` to `.claude/rules/<alias>`.
- File-based synchronization for Claude Code project rules.
- Supports `.md` suffix.

### 8c. Claude Code CLAUDE.md Synchronization
- **Syntax**: `ais claude md add <name> [alias]`
- Links `<repo>/.claude/<name>.md` to `.claude/<name>.md`.
- File-based synchronization for CLAUDE.md-style configuration files.
- Supports `.md` suffix; resolves `CLAUDE` → `CLAUDE.md` automatically.
- **User Mode**: `ais claude md add CLAUDE --user` links to `~/.claude/CLAUDE.md`.

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

### 14. Gemini CLI Synchronization

Gemini CLI (https://geminicli.com/) is supported with three entry types:

### 14.1. Gemini Command Synchronization
- **Syntax**: `ais gemini commands add <commandName> [alias]`
- Links `<repo>/.gemini/commands/<commandName>` to `.gemini/commands/<alias>`.
- File-based synchronization with `.toml` suffix for Gemini CLI commands.
- **Purpose**: Reusable prompts with argument substitution.

### 14.2. Gemini Skill Synchronization
- **Syntax**: `ais gemini skills add <skillName> [alias]`
- Links `<repo>/.gemini/skills/<skillName>` to `.gemini/skills/<alias>`.
- Directory-based synchronization for Gemini CLI skills (SKILL.md inside).
- **Purpose**: Specialized expertise for specific tasks.

### 14.3. Gemini Subagent Synchronization
- **Syntax**: `ais gemini agents add <agentName> [alias]`
- Links `<repo>/.gemini/agents/<agentName>` to `.gemini/agents/<alias>`.
- File-based synchronization with `.md` suffix for Gemini CLI subagents (Markdown with YAML frontmatter).
- **Purpose**: Specialized subagents with defined capabilities.

### 14.4. Windsurf Rule Synchronization
- **Syntax**: `ais windsurf add <ruleName> [alias]`
- Links `<repo>/.windsurf/rules/<ruleName>` to `.windsurf/rules/<alias>`.
- File-based synchronization with `.md` suffix for Windsurf workspace rules.

### 14.5. Cline Rule Synchronization
- **Syntax**: `ais cline add <ruleName> [alias]`
- Links `<repo>/.clinerules/<ruleName>` to `.clinerules/<alias>`.
- File-based synchronization with `.md`/`.txt` suffixes for Cline rules.

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
- `ais claude install` - Install all Claude Code skills, agents, rules, and CLAUDE.md files.
- `ais trae install` - Install all Trae rules and skills.
- `ais opencode install` - Install all OpenCode agents, skills, commands, and tools.
- `ais codex install` - Install all Codex rules and skills.
- `ais gemini install` - Install all Gemini CLI commands, skills, and subagents.
- `ais windsurf install` - Install all Windsurf rules.
- `ais cline install` - Install all Cline rules.
- `ais agents-md install` - Install AGENTS.md files.
- `ais install` - Install everything (smart dispatch).
- `ais install --user` / `ais user install` - Install all user-scope AI config files from `~/.config/ai-rules-sync/user.json`. (`--global` and `ais global install` kept as deprecated aliases.)

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

### 19. User Mode (Personal AI Config Files)

**User Mode** allows managing personal AI config files (`~/.claude/CLAUDE.md`, `~/.cursor/rules/`, etc.) with version control and cross-machine sync. Aligns with Claude Code's official terminology: *user scope* = `~/.claude/`, *project scope* = `.claude/`.

**How it works:**
- `--user` / `-u` flag sets `projectPath = $HOME` and stores dependencies in `~/.config/ai-rules-sync/user.json` instead of a project's `ai-rules-sync.json`
- Gitignore management is skipped automatically (home dir is not a git repo)
- Symlinks are created at absolute paths (e.g., `~/.claude/CLAUDE.md`)
- `--global` / `-g` are kept as deprecated backward-compatible aliases

**Commands:**
```bash
# Add entries to user config
ais claude md add CLAUDE --user       # ~/.claude/CLAUDE.md
ais cursor rules add my-style --user  # ~/.cursor/rules/my-style.mdc
ais claude rules add general --user   # ~/.claude/rules/general.md

# Install all user entries (restore on new machine)
ais user install
ais install --user   # equivalent

# Remove from user config
ais claude md remove CLAUDE --user
```

**User Config Path Management:**
By default, user-scope dependencies are stored in `~/.config/ai-rules-sync/user.json`. For dotfiles integration (to track user.json in git), the path can be customized:

```bash
# View current user config path
ais config user show

# Set custom path (e.g., inside dotfiles git repo)
ais config user set ~/dotfiles/ai-rules-sync/user.json

# Reset to default
ais config user reset
```

**Multi-machine Workflow:**
```bash
# Machine A: initial setup
ais use git@github.com:me/my-rules.git
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais claude md add CLAUDE --user
ais cursor rules add my-style --user

# Machine B: restore all user-scope symlinks
ais use git@github.com:me/my-rules.git
ais config user set ~/dotfiles/ai-rules-sync/user.json  # if using dotfiles
ais user install
```

**user.json format** — same as `ai-rules-sync.json`:
```json
{
  "claude": {
    "md": { "CLAUDE": "https://github.com/me/my-rules.git" },
    "rules": { "general": "https://github.com/me/my-rules.git" }
  },
  "cursor": {
    "rules": { "my-style": "https://github.com/me/my-rules.git" }
  }
}
```

**Migration:** On first use after upgrading, AIS automatically renames `global.json` → `user.json` and `globalConfigPath` → `userConfigPath` in `config.json`.

**Config Fields:**
- `Config.userConfigPath?: string` - Custom path for `user.json` (stored in `config.json`; replaces deprecated `globalConfigPath`)
- `SyncOptions.skipIgnore?: boolean` - Skip gitignore management (set automatically in user mode)

**Functions:**
- `getUserConfigPath()` - Returns custom or default user.json path (replaces `getGlobalConfigPath()`)
- `getUserProjectConfig()` - Reads user.json as `ProjectConfig` (replaces `getGlobalProjectConfig()`)
- `saveUserProjectConfig()` - Writes to user.json (replaces `saveGlobalProjectConfig()`)
- `addUserDependency()` - Adds entry to user.json (in `project-config.ts`; replaces `addGlobalDependency()`)
- `removeUserDependency()` - Removes entry from user.json (in `project-config.ts`; replaces `removeGlobalDependency()`)
- `installUserEntriesForAdapter()` - Installs all user entries for one adapter (replaces `installGlobalEntriesForAdapter()`)
- `installAllUserEntries()` - Installs user entries for all adapters (replaces `installAllGlobalEntries()`)

### 20. Configuration Files

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
      "agents": ".claude/agents",
      "rules": ".claude/rules",
      "md": ".claude"
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
    "gemini": {
      "commands": ".gemini/commands",
      "skills": ".gemini/skills",
      "agents": ".gemini/agents"
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
    "agents": { "debugger": "https://..." },
    "rules": { "general": "https://..." },
    "md": { "CLAUDE": "https://..." }
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
  "gemini": {
    "commands": { "deploy-command": "https://..." },
    "skills": { "code-review-skill": "https://..." },
    "agents": { "refactor-agent": "https://..." }
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

### 21. Shell Completion
- **Auto-Install**: On first run, AIS prompts to install shell completion automatically.
- **Manual Install**: `ais completion install` - Installs completion to shell config file.
- **Script Output**: `ais completion [bash|zsh|fish]` - Outputs raw completion script.
- **Detection**: Automatically detects shell type from `$SHELL` environment variable.
- **Shell scripts** stored in `src/completion/scripts.ts`.

## Adapter Reference Table

| Adapter | Tool | Subtype | Mode | Source Dir | File Suffixes | Reference |
|---------|------|---------|------|------------|---------------|-----------|
| cursor-rules | cursor | rules | hybrid | .cursor/rules | .mdc, .md | [Cursor Rules](https://cursor.com/docs/context/rules) |
| cursor-commands | cursor | commands | file | .cursor/commands | .md | [Cursor Commands](https://cursor.com/docs/context/commands) |
| cursor-skills | cursor | skills | directory | .cursor/skills | - | [Cursor Skills](https://cursor.com/docs/context/skills) |
| cursor-agents | cursor | subagents | directory | .cursor/agents | - | [Cursor subagents](https://cursor.com/docs/context/subagents) |
| copilot-instructions | copilot | instructions | file | .github/instructions | .instructions.md, .md | [Copilot Instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| claude-skills | claude | skills | directory | .claude/skills | - | [Claude Code Skills](https://code.claude.com/docs/en/skills) |
| claude-agents | claude | subagents | directory | .claude/agents | - | [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents) |
| claude-rules | claude | rules | file | .claude/rules | .md | [Claude Code Memory](https://code.claude.com/docs/en/memory) |
| claude-md | claude | md | file | .claude | .md | [Claude Code CLAUDE.md](https://docs.anthropic.com/en/docs/claude-code/memory) |
| trae-rules | trae | rules | file | .trae/rules | .md | [Trae Rules](https://docs.trae.ai/ide/rules) |
| trae-skills | trae | skills | directory | .trae/skills | - | [Trae Skills](https://docs.trae.ai/ide/skills) |
| **agents-md** | **agents-md** | **file** | **file** | **.** (root) | **.md** | **[agents.md standard](https://agents.md/)** |
| opencode-agents | opencode | agents | file | .opencode/agents | .md | [OpenCode Agents](https://opencode.ai/docs/agents/) |
| opencode-skills | opencode | skills | directory | .opencode/skills | - | [OpenCode Skills](https://opencode.ai/docs/skills/) |
| opencode-commands | opencode | commands | file | .opencode/commands | .md | [OpenCode Commands](https://opencode.ai/docs/commands/) |
| opencode-tools | opencode | tools | file | .opencode/tools | .ts, .js | [OpenCode Tools](https://opencode.ai/docs/tools/) |
| codex-rules | codex | rules | file | .codex/rules | .rules | [OpenAI Codex Rules](https://developers.openai.com/codex/rules) |
| codex-skills | codex | skills | directory | .agents/skills | - | [OpenAI Codex Skills](https://developers.openai.com/codex/skills) |
| gemini-commands | gemini | commands | file | .gemini/commands | .toml | [Gemini Commands](https://geminicli.com/docs/cli/custom-commands/) |
| gemini-skills | gemini | skills | directory | .gemini/skills | - | [Gemini Skills](https://geminicli.com/docs/cli/skills/) |
| gemini-agents | gemini | subagents | file | .gemini/agents | .md | [Gemini Subagents](https://geminicli.com/docs/core/subagents/) |
| windsurf-rules | windsurf | rules | file | .windsurf/rules | .md | [Windsurf Docs](https://docs.windsurf.com/) |
| cline-rules | cline | rules | file | .clinerules | .md, .txt | [Cline Rules](https://docs.cline.bot/customization/cline-rules) |

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

## Changelog

### 2026-02
- Added **Windsurf support**: rules (`.windsurf/rules`, `.md`) with full CLI/completion integration
- Added **Cline support**: rules (`.clinerules`, `.md`/`.txt`) with full CLI/completion integration
- Added **User Mode** (`--user` / `-u`): manage personal AI config files (`~/.claude/CLAUDE.md`, etc.) with version control; `ais user install` restores all symlinks on new machines
- Added **claude-md adapter**: sync CLAUDE.md-style files; `ais claude md add CLAUDE --user`
- Added **User Config Path**: `ais config user set <path>` for dotfiles integration
- Added **Gemini CLI support**: commands (`.toml`), skills (directory), subagents (`.md`)
- Added **OpenAI Codex support**: rules (`.rules`, Starlark), skills (`.agents/skills/`)
- Renamed deprecated `--global` / `-g` flags to `--user` / `-u`

### 2026-01
- Added **Custom Source Directories**: 4-layer priority system (CLI > global config > repo config > adapter defaults); `ais config repo set-source`
- Added **Custom Target Directories**: `-d` option on `add` commands; monorepo support
- Added **Universal AGENTS.md support**: `ais agents-md` for [agents.md standard](https://agents.md/)
- Fixed OpenCode adapters to match official docs (removed `rules`, fixed modes for agents/commands/tools)
- Migrated config directory from `~/.ai-rules-sync/` to `~/.config/ai-rules-sync/` (XDG spec)

### Previously
- Added Warp skills support
- Added Copilot prompt files and custom agents
- Added Claude Code rules/skills/subagents/CLAUDE.md support
- Added Trae rules and skills support
- Added OpenCode agents/skills/commands/tools support
- Added `add-all` bulk discovery and installation
- Added shell tab completion
