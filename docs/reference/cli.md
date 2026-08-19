---
outline: [2, 3]
---

# CLI Commands

## Command Shape

Every command is explicit about which tool and subtype it targets — there's no mode-guessing. Three ways to reach the same entry:

```bash
ais cursor rules add react        # one tool, one subtype
ais rules add react --tools cursor,claude   # one subtype, several tools at once
ais rules add react --all         # every tool with a rules adapter
```

`ais ls` lists repositories (`ais list` also works). There's no top-level `add`/`remove` — always name a tool, a broadcast group, or both.

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

Install all entries from config files (project scope by default).

```bash
ais install                 # project entries (from ai-rules-sync.json)
ais install -g              # user entries (from ~/.config/ai-rules-sync/user.json)
ais install --json
```

`-g, --global` (alias `-u, --user`) switches to user scope — there's no separate `ais user install` anymore.

### `ais init [name]`

Initialize a rules repository template.

```bash
ais init
ais init my-rules-repo
ais init --force                 # overwrite existing ai-rules-sync.json
ais init --no-dirs               # skip creating default source directories
ais init --only cursor copilot   # only include specified tools
ais init --exclude codex         # exclude specified tools
ais init --json
```

Subtypes shared by multiple tools (skills, agents, rules, commands, prompts) collapse to one `sourceDir` wildcard entry (`"*"`) instead of a line per tool; per-tool file subtypes (md, instructions, ...) stay explicit since their content differs by tool.

### `ais update`

Pull repository updates and reinstall entries.

```bash
ais update
ais update --user
ais update --dry-run
ais update --json
```

### `ais check`

Check whether repositories are behind upstream.

```bash
ais check
ais check --user
ais check --json
```

### `ais doctor`

Verify every configured entry actually has a healthy symlink — read-only, makes no changes and never clones a repo. Reports each entry as `ok`, `missing` (nothing at the target path), `conflict` (a real file/dir sits where a symlink should be), or `stale` (the symlink points somewhere other than the current repo source, or the source repo isn't available to verify against). Exits non-zero if anything needs attention, so it's usable as a CI check.

```bash
ais doctor
ais doctor --user     # also check user-scope entries
ais doctor --json
```

`missing` → run `ais install` (or `ais install -g` for user entries) to relink. `conflict` needs manual resolution — AIS won't overwrite a real file. `stale` usually means the repo moved on since the entry was added; `ais update` refreshes it.

### `ais status`

Show project status (repos, symlinks, config files).

```bash
ais status
ais status --user                 # include user config status
ais status --json
```

### `ais search [query]`

Search entries available in the repository.

```bash
ais search react
ais search --tools claude,cursor
ais search --configured           # only entries already in project config
ais search --unconfigured         # only entries not yet configured
ais search --json
```

### `ais add-all`

Discover and install every entry from the current repository.

```bash
ais add-all
ais add-all --dry-run             # preview without installing
ais add-all --tools cursor,copilot # filter by tools (unknown names error out)
ais add-all --interactive         # prompt for each entry
ais add-all --force               # overwrite existing
ais add-all --skip-existing       # skip entries already in config
ais add-all -l                    # save to ai-rules-sync.local.json
ais add-all --quiet               # minimal output
```

An unknown name passed to `--tools` exits non-zero with the supported-tools list, instead of silently skipping it.

### `ais import <name>`

Import an existing project file/directory into the repository, auto-detecting the tool/subtype.

```bash
ais import my-rule
ais import my-rule --dry-run
ais import my-rule --push
```

Prefer this when you don't know (or don't want to specify) the tool — for a specific tool, use `ais <tool> import` or `ais <tool> <subtype> import` instead.

## Tool Commands

Every one of the 30+ registered tools gets the same shape, generated from the adapter registry: `ais <tool> <subtype> add/remove/install/add-all/import`, plus tool-wide `ais <tool> install/add-all/import` across all of that tool's subtypes.

```bash
ais cursor rules add react              # add a Cursor rule
ais cursor rules add react my-alias -d dir  # with alias and custom target dir
ais cursor rules remove react           # (alias: rm)
ais claude skills add code-review       # add a Claude skill
ais copilot instructions add coding-style
ais cursor install                      # install all Cursor entries (every subtype)
ais cursor add-all                      # add every Cursor entry from the repository
ais cursor import my-rule               # import from project to repository (auto-detects subtype)
ais cursor rules import my-rule         # same, explicit subtype
```

::: tip
`ais <tool> add`/`ais <tool> remove` (no subtype) are hidden commands kept only so old tutorials fail with guidance instead of "unknown command" — they print the replacement command and exit non-zero rather than writing anything. Always name a subtype: `ais cursor rules add x`, not `ais cursor add x`.
:::

**Tools and subtypes** (representative — see [Supported Tools](/reference/supported-tools) for the full 30+ list):

| Tool | Subtypes | Example |
|------|----------|---------|
| `cursor` | rules, commands, skills, agents | `ais cursor rules add react` |
| `copilot` | instructions, prompts, skills, agents | `ais copilot instructions add x` |
| `claude` | rules, skills, agents, md | `ais claude md add CLAUDE --user` |
| `trae` | rules, skills | `ais trae rules add x` |
| `opencode` | rules, commands, skills, agents, tools | `ais opencode skills add x` |
| `codex` | rules, skills, agents, md | `ais codex md add AGENTS` |
| `gemini` | commands, skills, agents, md | `ais gemini md add GEMINI` |
| `warp` | skills | `ais warp skills add x` |
| `windsurf` | rules, skills, commands | `ais windsurf rules add x` |
| `cline` | rules, skills, commands, agents | `ais cline rules add x` |
| `agents-md` | file | `ais agents-md file add .` |

Same command shape for every tool: `ais <tool> <subtype> add <name> [alias]`.

**`add` options:** `-l` local, `-u` user scope, `-d` target dir (repo-wide `-t` selects the source repository).
**`remove` options:** `-u` user scope, `--dry-run`.
**`install`/`add-all` options:** see each command's `--help`; they mirror the global `ais install`/`ais add-all` flags, scoped to the one tool.

## Broadcast Command Groups

Push one entry to several tools in a single command, instead of repeating `ais <tool> <subtype> add` per tool. One group per shared subtype: `skills`, `agents`, `rules`, `commands`, `md` (includes AGENTS.md), `prompts`.

```bash
ais skills add my-skill --tools claude,cursor,codex
ais skills add my-skill --all               # every tool with a skills adapter
ais skills add a,b,c --tools claude,cursor  # comma-separate <name> to add several at once
ais skills remove my-skill --tools claude   # alias: rm
ais skills remove a,b,c --tools claude      # remove also takes a comma-separated list
ais skills list                             # what's configured, per tool
ais skills add my-skill --all --dry-run     # preview: will-add / skip: not-in-repo / skip: already-configured
ais skills add-all --tools claude,cursor    # discover and add every skill the repo has, to every listed tool
ais skills add-all --all --dry-run          # preview add-all without installing
```

```bash
ais agents add reviewer --all
ais rules add style-guide --tools cursor,windsurf
ais commands add deploy --all
ais md add AGENTS.md --tools agents-md,claude
ais prompts add release-notes --tools copilot
```

Every `<group> add/remove/list` takes `--tools <list>` (comma-separated, repeatable) or `--all`, plus `-g/--global` (alias `-u/--user`) for user scope and `--json`. `add` and `remove` additionally accept a comma-separated list of entry names/aliases to act on several at once — `add`'s optional alias argument only applies when a single name is given. `add` also takes `-l/--local`, `--dry-run`, and `--strict` (fail instead of warn when a tool has no matching repo entry).

`<group> add-all` discovers every entry the repository has for that subtype and adds each one not already configured, across every targeted tool — the broadcast-group equivalent of the per-tool `ais <tool> add-all`. It takes the same `--tools`/`--all`, `-g/--global`, `-l/--local`, `--dry-run`, and `--json` options, plus `-f/--force` to re-add entries that are already configured.

An unrecognized `--tools` name gets a "did you mean" suggestion; a tool with no adapter in that group but a known equivalent (e.g. Copilot's `instructions` for the `rules` group) is pointed at the exact replacement command instead of silently doing nothing. If a target's `add` finds a real, non-symlink file or directory already sitting at the destination, it refuses to overwrite it and reports `skip: conflict` instead of claiming success.

## Other Commands

### `ais git <command>`

Run git commands in the repository.

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### `ais completion [shell]`

Output or install shell tab completion (bash, zsh, fish).

```bash
ais completion install            # auto-detect shell and install
ais completion install --force    # force reinstall
ais completion bash               # output script only (for manual install)
```

### `ais config`

Manage configuration.

```bash
# Repository source directories (override where AIS looks for entries in a repo)
ais config repo set-source <repo> <tool.subtype> <path>
# Example: ais config repo set-source my-repo cursor.rules custom/rules
ais config repo show <repo>
ais config repo clear-source <repo> [tool.subtype]   # omit subtype to clear all
ais config repo list            # same as ais ls

# User config path
ais config user show
ais config user set <path>
ais config user reset
```

## Migrating from pre-1.0

| Old | New |
|-----|-----|
| `ais add <name> [alias]` (top-level, guessed tool) | `ais <tool> <subtype> add <name> [alias]`, or `ais <subtype> add <name> --tools <tool>` |
| `ais remove <alias>` (top-level, guessed tool) | `ais <tool> <subtype> remove <alias>` — or if you don't remember which tool, `ais search --configured <alias>` first |
| `ais user install` | `ais install -g` |
