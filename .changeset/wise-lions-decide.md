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

**Migration:**

- `ais <tool> add <name> [alias]` → `ais <tool> <subtype> add <name> [alias]` (e.g. `ais cursor add x` → `ais cursor rules add x`) or `ais <subtype> add <name> --tools <tool>`.
- `ais remove <alias>` (top-level, guessed tool) → `ais <tool> <subtype> remove <alias>`, or if you don't remember which tool, `ais search --configured <alias>` to find it first.
- `ais user install` → `ais install -g`.
