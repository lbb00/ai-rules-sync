# Multiple Repositories

AIS is many-to-many: **each repository can feed many projects**, and **each project can compose many repositories**. `-t` selects the source; the project manifest records the mix.

```bash
ais cursor rules add coding-standards -t company-rules
ais cursor rules add react-best-practices -t https://github.com/community/rules.git
ais cursor rules add my-utils -t personal-rules
```

`ai-rules-sync.json` then lists every entry and which repo it came from. Teammates restore the same mix with `ais install`.

## Register and switch

```bash
ais use https://github.com/your-org/rules-repo.git
ais ls
# * company-rules (current)
#   personal-rules
#   community-rules

ais use personal-rules
```

Omit `-t` after the first add to use the current repository.

## Mix tools from the same repo

One cache clone can supply Cursor, Copilot, and Claude in the same project:

```bash
ais cursor rules add react -t https://github.com/org/rules.git
ais copilot instructions add coding-standards -t https://github.com/org/rules.git
ais claude skills add code-review -t https://github.com/org/rules.git

ais use https://github.com/org/rules.git
ais add-all --tools cursor,copilot,claude
```

## Remap directories

Third-party repos and cross-tool layouts use a custom source path. Persistent mapping:

```bash
ais config repo set-source third-party cursor.rules custom/rules
ais config repo show third-party
```

One-off:

```bash
ais cursor rules add-all -s custom/rules
```

Or set `sourceDir` in the **asset repo’s** `ai-rules-sync.json` (wildcards, file-mode rename, directory rename). See [Configuration](/reference/configuration) and [Monorepo & Custom Dirs](./monorepo).

## Discover everything (`add-all`)

```bash
ais add-all
ais cursor add-all
ais add-all --dry-run
ais add-all --tools cursor,copilot
ais cursor add-all --interactive
ais add-all --force
ais add-all --skip-existing
```

## Keep cache repos current

```bash
ais check
ais update --dry-run
ais update
ais init
```

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```
