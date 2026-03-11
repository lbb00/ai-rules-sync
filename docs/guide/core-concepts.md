# Core Concepts

## Repositories

A **rules repository** is a Git repository containing your rules, organized by tool:

```
my-rules-repo/
├── .cursor/
│   ├── rules/
│   │   ├── react.mdc
│   │   └── typescript.mdc
│   ├── commands/
│   │   └── deploy.md
│   └── skills/
│       └── code-review/
├── .claude/
│   ├── CLAUDE.md
│   └── skills/
│       └── debug-helper/
└── ai-rules-sync.json
```

### Repository Locations

- **Global**: `~/.config/ai-rules-sync/repos/` (managed by AIS)
- **Local**: `ais use ~/path` with a git repo creates a symlink in `repos/`

### Managing Repositories

```bash
# Set current repository
ais use https://github.com/your-org/rules-repo.git

# List all repositories
ais ls

# Switch between repositories
ais use company-rules
ais use personal-rules
```

## Three Ways to Get Rules

### `add` — Use rules from a repository

Link an entry from a repository to your project. Saves the dependency to [`ai-rules-sync.json`](/reference/configuration).

**When to use:** You want to use existing rules from a shared repository.

```bash
# Project-level
ais cursor add react -t https://github.com/org/rules.git

# User global-level
ais cursor add react --user
```

### `import` — Share your rules via a repository

Copy an existing entry from your project into the repository, commit it, then replace the original with a symlink.

**When to use:** You have rules in your project and want to share them.

```bash
ais cursor rules import my-custom-rule
```

### `install` — Restore from config file

Read config and recreate all symlinks.

**When to use:** You cloned a project with [`ai-rules-sync.json`](/reference/configuration), or need to restore user configs on a new machine.

```bash
# Project-level: restore from ai-rules-sync.json
ais install

# User global-level: restore from user.json
ais user install
```

## Repository Lifecycle

```bash
# Check whether repositories are behind upstream
ais check

# Check user config repositories
ais check --user

# Preview updates without pulling
ais update --dry-run

# Pull updates and reinstall entries
ais update

# Initialize a rules repository template
ais init
```
