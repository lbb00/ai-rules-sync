---
"ai-rules-sync": major
---

1.0.0: explicit-only command surface, no more mode guessing

**Breaking:**

- Removed top-level `ais add`/`ais remove` (guessed which tool/subtype to use from project state). Use `ais <tool> <subtype> add/remove` for one tool, or `ais <subtype> add/remove --tools <list>|--all` to target several at once.
- Removed `ais user install`. Use `ais install -g` (or `-u`) instead — same behavior, folded into the main install command.
- `ais status --json`'s `project.inferredMode` field is gone along with the inference layer.
- `ais add-all --tools <unknown-name>` now exits non-zero instead of warning and skipping.
- `ais <tool> add`/`ais <tool> remove` (the flat, single-subtype shortcuts cursor/windsurf/cline/agents-md used to expose) no longer write anything. They're hidden commands that print the replacement command and exit non-zero — kept only so old tutorials fail with guidance instead of "unknown command".

**Added:**

- Every one of the 30 registered tools now gets the same command shape (`ais <tool> <subtype> add/remove/install/add-all/import`, plus tool-wide `install`/`add-all`/`import`), generated from the adapter registry instead of 30 hand-written, drifting blocks. Five adapters that previously had no real CLI command (`cline` commands/agents, `windsurf` commands, `opencode` rules, `codex` agents) are now fully wired.
- New broadcast command groups: `ais skills/agents/rules/commands/md/prompts add/remove/list`, to push one entry to several tools in one command (`ais skills add my-skill --tools claude,cursor,codex` or `--all`). Unknown tool names get a "did you mean" suggestion; a tool with no adapter in the group but a known equivalent (e.g. Copilot's `instructions` for the `rules` group) gets pointed at the exact replacement command.
- `ais init` now generates a `sourceDir` wildcard (`"*"`) entry for subtypes shared across tools (skills/agents/rules/commands/prompts) instead of one explicit line per tool; per-tool file subtypes (md, instructions, workflows, ...) stay explicit since their content differs by tool.
- `ais install` gained `-g/--global` (alias `-u/--user`) and `--json`.
- Top-level `--help` collapses the 30 tool-group commands into a single index line instead of burying the core commands and broadcast groups under them.
- New `ais doctor` command: read-only check of every configured entry's symlink health (`ok`/`missing`/`conflict`/`stale`), with `--user` and `--json`. Exits non-zero when something needs attention, so it's usable as a CI gate. Makes no changes and never clones a repo.

**Fixed:**

- `GitSource` (the fallback resolver used by directory-mode adapters without a custom `resolveSource`) ran a bare `git pull` any time the repo's `.git` directory existed, which fails on a purely local repo that has no upstream tracking branch — e.g. `ais claude skills add` against a `git init`'d-but-never-pushed rules repo errored out instead of resolving locally. Now checks for an upstream first and skips the pull if there isn't one, matching the existing behavior of the other repo-update path.
- `DotfileManager.diff()`'s "is this symlink stale" check compared a relative `readlink()` result against an absolute expected path as a raw string, so every entry with a relative symlink (the default) was misclassified — this is what `ais doctor` relies on to distinguish `ok` from `stale`.
- `DotfileManager.status()`/`diff()` (and by extension `remove()`, which shared the same gap for suffix types it didn't know about) checked the on-disk filename using the raw manifest key, without accounting for the suffix a hybrid/file-mode adapter appends at link time. Entries added with the documented string-shorthand config format (`"react": "<repo-url>"`, no suffix in the key) on an adapter like `cursor`'s `rules` (which links `react` as `react.mdc`) showed as `missing` in `ais doctor` even though they were correctly linked. Now resolves suffixed variants before concluding an entry is absent.

**Migration:**

- `ais <tool> add <name> [alias]` → `ais <tool> <subtype> add <name> [alias]` (e.g. `ais cursor add x` → `ais cursor rules add x`) or `ais <subtype> add <name> --tools <tool>`.
- `ais remove <alias>` (top-level, guessed tool) → `ais <tool> <subtype> remove <alias>`, or if you don't remember which tool, `ais search --configured <alias>` to find it first.
- `ais user install` → `ais install -g`.
