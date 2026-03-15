# Advanced Features

## Global Options

All commands support:

- `-t, --target <repo>` — Specify repository (name, URL, or local path)
- `-l, --local` — Save to `ai-rules-sync.local.json` (private)

```bash
ais cursor add react -t company-rules --local
```

## Query Commands

```bash
ais status              # Check project status
ais search react        # Search for rules
ais check               # Check if repos are behind upstream
ais check --user        # Check user config repos

# JSON output for scripts/CI
ais ls --json
ais status --json
ais search react --json
```

## Multi-Tool Example

Use rules from the same repository across Cursor, Copilot, and Claude:

```bash
# Add Cursor rules
ais cursor add react -t https://github.com/org/rules.git
ais cursor add typescript

# Add Copilot instructions (same repo)
ais copilot instructions add coding-standards -t https://github.com/org/rules.git

# Add Claude skills (same repo)
ais claude skills add code-review -t https://github.com/org/rules.git

# Or use add-all to install everything at once
ais use https://github.com/org/rules.git
ais add-all --tools cursor,copilot,claude
```

## More

- [Multiple Repositories](./multiple-repos) — Use rules from multiple Git repositories
- [Import Rules](./import-rules) — Share your rules via a repository
- [Monorepo & Custom Directories](./monorepo) — Custom source and target directories
- [User Global-Level Sync](./user-level) — Personal AI config management
- [Troubleshooting](./troubleshooting) — Common issues and solutions
