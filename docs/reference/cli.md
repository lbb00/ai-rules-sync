---
outline: [2, 3]
---

# CLI Commands

## Command Style

AIS supports Linux-style commands as the default. Legacy forms remain compatible:

```bash
# Recommended
ais ls
ais rm old-rule
ais cursor rules rm react

# Legacy (still supported)
ais list
ais remove old-rule
ais cursor rules remove react
```

## Global Commands

### `ais use <repo>`

Set the current (default) rules repository.

```bash
ais use https://github.com/org/rules.git    # remote URL
ais use ~/my-rules-repo                      # local path
ais use company-rules                        # by name
```

### `ais ls`

List all registered repositories.

```bash
ais ls
ais ls --json
```

### `ais add` / `ais rm`

Top-level shortcuts that auto-detect the tool (Cursor, Copilot, Windsurf, or Cline) when config is unambiguous. Prefer explicit tool commands when using multiple tools.

```bash
ais add react                    # Add rule (cursor/copilot when unambiguous)
ais add react my-alias -d dir    # With alias and custom target dir
ais rm react                     # Remove entry
ais rm react --dry-run           # Preview removal
```

::: tip
For Claude, Trae, OpenCode, Codex, Gemini, Warp, or AGENTS.md, use the explicit tool command (e.g., `ais claude skills add`).
:::

### `ais install`

Install all rules from config files.

```bash
ais install                # project rules (from ai-rules-sync.json)
ais install --user         # user rules (from ~/.config/ai-rules-sync/user.json)
```

::: tip
You can also use `ais user install` to install user-level configs. Both are equivalent.
:::

### `ais init`

Initialize a rules repository template.

```bash
ais init
ais init my-rules-repo
ais init --force                 # Overwrite existing ai-rules-sync.json
ais init --no-dirs               # Skip creating default source directories
ais init --only cursor copilot    # Only include specified tools
ais init --exclude codex          # Exclude specified tools
ais init --json                  # Output result as JSON
```

### `ais update`

Pull updates and reinstall entries.

```bash
ais update
ais update --dry-run
```

### `ais check`

Check whether repositories are behind upstream.

```bash
ais check
ais check --user
ais check --json
```

### `ais status`

Show project status (repos, symlinks, config files).

```bash
ais status
ais status --user                 # Include user config status
ais status --json
```

### `ais search <query>`

Search for rules.

```bash
ais search react
ais search react --json
```

### `ais add-all`

Discover and install all available rules from the current repository.

```bash
ais add-all
ais add-all --dry-run             # Preview without installing
ais add-all --tools cursor,copilot # Filter by tools
ais add-all --interactive         # Prompt for each entry
ais add-all --force               # Overwrite existing
ais add-all --skip-existing       # Skip entries already in config
ais add-all -l                    # Save to ai-rules-sync.local.json
ais add-all --quiet               # Minimal output
```

## Tool Commands

Tool-specific commands: `ais <tool> [subtype] <action>`. See [Tool Guides](/guide/tool-guides) for details.

**Common pattern:**

```bash
ais cursor add react              # Add Cursor rule
ais cursor rules add react        # Same, explicit subtype
ais claude skills add code-review # Add Claude skill
ais copilot instructions add coding-style
ais cursor rules rm react         # Remove
ais cursor install                # Install all Cursor entries
ais cursor rules import my-rule  # Import from project to repo
```

**Tools and subtypes:**

| Tool | Subtypes | Example |
|------|----------|---------|
| `cursor` | rules, commands, skills, agents | `ais cursor rules add react` |
| `copilot` | instructions, prompts, skills, agents | `ais copilot instructions add x` |
| `claude` | rules, skills, agents, md | `ais claude md add CLAUDE --user` |
| `trae` | rules, skills | `ais trae rules add x` |
| `opencode` | commands, skills, agents, tools | `ais opencode skills add x` |
| `codex` | rules, skills, md | `ais codex md add AGENTS` |
| `gemini` | commands, skills, agents, md | `ais gemini md add GEMINI` |
| `warp` | skills | `ais warp skills add x` |
| `windsurf` | rules, skills | `ais windsurf rules add x` |
| `cline` | rules, skills | `ais cline rules add x` |
| `agents-md` | file | `ais agents-md add .` |

**Options:** `-t` repo, `-l` local, `-d` targetDir, `-s` sourceDir, `--dry-run`, `--force`, `--user`

### `ais git <command>`

Run git commands in the repository.

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### `ais user install`

Install all user-level entries from `~/.config/ai-rules-sync/user.json`. Equivalent to `ais install --user`.

```bash
ais user install
```

### `ais completion install`

Install shell tab completion. Auto-detects shell (bash, zsh, fish) and appends to config file.

```bash
ais completion install            # Auto-detect shell and install
ais completion install --force    # Force reinstall
ais completion bash               # Output script only (for manual install)
```

### `ais config`

Manage configuration.

```bash
# Repository source directories (override where AIS looks for rules in a repo)
ais config repo set-source <repo> <tool.subtype> <path>
# Example: ais config repo set-source my-repo cursor.rules custom/rules
ais config repo show <repo>
ais config repo clear-source <repo> [tool.subtype]   # Omit subtype to clear all
ais config repo list            # Same as ais ls

# User config path
ais config user show
ais config user set <path>
ais config user reset
```

### Common Options (tool commands)

| Option | Description |
|--------|-------------|
| `-t, --target <repo>` | Specify repository (name, URL, or path) |
| `-l, --local` | Save to `ai-rules-sync.local.json` |
| `-d, --target-dir <dir>` | Custom target directory |
| `-s, --source-dir <dir>` | Custom source directory |
| `--dry-run` | Preview without making changes |
| `--force` | Force overwrite existing |
| `--user` | Use user mode (personal config) |
