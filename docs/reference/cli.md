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
ais init --force --no-dirs
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

Show project status.

```bash
ais status
ais status --json
```

### `ais search <query>`

Search for rules.

```bash
ais search react
ais search react --json
```

### `ais add-all`

Discover and install all available rules.

```bash
ais add-all
ais add-all --dry-run
ais add-all --tools cursor,copilot
ais add-all --interactive
ais add-all --force
ais add-all --skip-existing
```

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

Install shell tab completion.

### `ais config`

Manage configuration.

```bash
# Repository source directories
ais config repo set-source <repo> <key> <dir>
ais config repo show <repo>
ais config repo clear-source <repo> [key]
ais config repo list

# User config path
ais config user show
ais config user set <path>
ais config user reset
```

## Tool Commands

All tools follow the same pattern:

```bash
ais <tool> add <name> [-t repo] [-l] [-d targetDir]
ais <tool> rm <name>              # remove entry
ais <tool> install                # install all entries for this tool

# For subtypes
ais <tool> <subtype> add <name>
ais <tool> <subtype> rm <name>
ais <tool> <subtype> import <name> [-m msg] [--push] [--force]
ais <tool> <subtype> add-all [-s sourceDir]
```

### Tools

`cursor`, `copilot`, `claude`, `trae`, `opencode`, `codex`, `gemini`, `warp`, `windsurf`, `cline`, `agents-md`

### Common Options

| Option | Description |
|--------|-------------|
| `-t, --target <repo>` | Specify repository (name, URL, or path) |
| `-l, --local` | Save to `ai-rules-sync.local.json` |
| `-d, --target-dir <dir>` | Custom target directory |
| `-s, --source-dir <dir>` | Custom source directory |
| `--dry-run` | Preview without making changes |
| `--json` | Output in JSON format |
| `--force` | Force overwrite existing |
| `--user` | Use user mode (personal config) |
