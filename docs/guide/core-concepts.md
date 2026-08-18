# Core Concepts

## Cache, then compose

AIS never copies assets into your project.

```
Git repositories  ──clone──►  ~/.config/ai-rules-sync/repos/  ──symlink──►  your projects
```

- Each Git remote is cloned **once** into the global cache
- Each project’s [`ai-rules-sync.json`](/reference/configuration) lists which repos to use and where they land
- A repo can feed many projects; a project can mix many repos and remap directories (Cursor rules → Claude rules)

Local checkouts work too: `ais use ~/my-rules-repo` puts a symlink in the cache.

## Asset repository

A repository is a normal Git repo using each tool’s native paths:

```
my-rules-repo/
├── .cursor/rules/
├── .cursor/skills/
├── .claude/skills/
├── .claude/CLAUDE.md
├── AGENTS.md
└── ai-rules-sync.json    # optional: custom sourceDir / rootPath
```

```bash
ais use https://github.com/your-org/rules-repo.git
ais ls
ais use company-rules
```

## Three operations

### `add` — consume

Link an entry from a repository into this project (or `$HOME` with `--user`).

```bash
ais cursor rules add react -t https://github.com/org/rules.git
ais cursor rules add react --user
```

### `import` — publish

Copy an existing project file into the repository, commit it, replace the original with a symlink.

```bash
ais cursor rules import my-custom-rule
```

### `install` — restore

Read the manifest and recreate every symlink. Use this after clone, on CI, or on a new machine.

```bash
ais install          # project: ai-rules-sync.json
ais install -g       # user: ~/.config/ai-rules-sync/user.json
```

## Three config layers

| File | Scope | Git |
|------|-------|-----|
| `ai-rules-sync.json` | Shared, this project | Yes |
| `ai-rules-sync.local.json` | Private, this project | No |
| `user.json` | Personal, this machine | Optional (dotfiles) |

Merge order (highest first): local → project → user. Schema: [Configuration](/reference/configuration).

## Two scopes

- **[Project-level](./project-level)** — `cwd`, team-shared
- **[User-level](./user-level)** — `$HOME`, personal `CLAUDE.md` / `GEMINI.md` / style rules

## Keep repos current

```bash
ais check              # behind upstream?
ais update --dry-run
ais update             # pull + reinstall
ais init               # template a new asset repo
```

See [Multiple Repositories](./multiple-repos) for mixing sources, remapping, `add-all`, and `ais git`.
