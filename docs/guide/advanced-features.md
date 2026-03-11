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

## More

- [Multiple Repositories](./multiple-repos) — Use rules from multiple Git repositories
- [Import Rules](./import-rules) — Share your rules via a repository
- [Monorepo & Custom Directories](./monorepo) — Custom source and target directories
- [User Global-Level Sync](./user-level) — Personal AI config management
