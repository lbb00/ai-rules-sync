# What is AIS?

**AI Rules Sync (AIS)** is an asset federation toolkit. It installs, composes, updates, and publishes **native** agent assets — skills, rules, commands, agents — from multiple Git repositories into every project you work on.

AIS is **not** a format converter. Files stay in their original layout. Sync happens through symbolic links.

![Many Git repositories clone into a global cache; each project composes and remaps assets via symlinks](/banner.svg)

## The problem

AI coding tools keep project-level assets (`.cursor/rules`, `.claude/skills`, `AGENTS.md`, …). Teams typically:

- Copy files between projects and lose sync when the source changes
- Mix company standards, personal prefs, and community packs by hand
- Rewrite files to fit another tool, then maintain two copies

## What AIS does

1. **Clone** Git repositories into a global cache (`~/.config/ai-rules-sync/repos/`)
2. **Compose** — each project picks any mix of repos and remaps directories (for example Cursor rules used as Claude rules)
3. **Symlink** into the project (or `$HOME` in user mode). No copies, no rewrite
4. **Restore** from `ai-rules-sync.json` with `ais install` for teammates and CI

A repository can feed many projects. A project can pull from many repositories.

## Two scopes

- **[Project-level](./project-level)** — team assets in the current repo, tracked in [`ai-rules-sync.json`](/reference/configuration)
- **[User-level](./user-level)** — personal configs in `$HOME`, tracked in `~/.config/ai-rules-sync/user.json`

## Native assets, many tools

The same CLI works across Cursor, Copilot, Claude, Codex, Gemini, and [30+ other tools](/reference/supported-tools). Dedicated walkthroughs live under [Tool Guides](/guide/tool-guides).

Sync modes:

- **directory** — link a whole folder (skills, agents)
- **file** — link one file, with suffix resolution
- **hybrid** — files or directories (Cursor rules)

## Next

- [Getting Started](/guide/getting-started) — install and first add / import / install
- [Core Concepts](/guide/core-concepts) — cache, manifests, add vs import vs install
- [Multiple Repositories](/guide/multiple-repos) — many-to-many compose and remapping
