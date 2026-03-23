# Requirements: Claude Type List Command & User-Level Repo Storage

- **Feature Name**: task-list
- **Version**: 1.0
- **Date**: 2026-03-19
- **Status**: Generated

---

## Overview

This feature covers four related areas:

1. `ais claude list [<type>] [--repo] [--user]` — discover installed or available entries across Claude adapter types
2. `--user` import/install bug fix — propagate user mode correctly through the import pipeline
3. `userDefaultSourceDir` — segregate user-level imports into a separate repo path to prevent collisions with project-level imports
4. Consistency across all eight Claude adapter types: `rules`, `skills`, `agents`, `commands`, `md`, `status-lines`, `agent-memory`, `settings`

---

## 1. `ais claude list` Command

### Requirement 1 — List Installed Entries (Default / Local Mode)

When the user runs `ais claude list` with no flags, the system shall display all entries currently installed in the project's `.claude/` directories (symlinked or otherwise managed by ais) for all Claude adapter types, cross-referencing the configured repository to determine whether each entry is installed from the repo (`i`) or local-only (`l`).

**Acceptance Criteria:**

1. WHEN the user runs `ais claude list` with no type argument and no flags, THEN the system SHALL read the project's `ai-rules-sync.json` and `ai-rules-sync.local.json` configuration files and display all entries under the `claude` key, grouped by subtype (rules, skills, agents, commands, md, status-lines, agent-memory, settings).
2. WHEN no entries exist for any Claude subtype in the project configuration, THEN the system SHALL display a message indicating no entries are installed and exit with code 0.
3. WHEN the user runs `ais claude list <type>` with a valid type argument (e.g. `rules`, `settings`), THEN the system SHALL display only the entries for that specific Claude subtype.
4. WHEN the user specifies an invalid type argument that does not match any registered Claude adapter subtype, THEN the system SHALL display an error message listing the valid types and exit with code 1.
5. WHEN displaying entries in default (no flags) mode, THEN the system SHALL cross-reference each adapter's `defaultSourceDir` in the configured repository to determine whether each installed entry is present in the repo; entries found in the repo SHALL show the `i` (installed) marker and entries not found in the repo SHALL show the `l` (local-only) marker.
6. WHEN no repository is configured, THEN all entries in default mode SHALL show the `l` (local-only) marker.

---

### Requirement 2 — List User-Level Installed Entries (`--user` flag)

When the user runs `ais claude list --user`, the system shall display all entries installed at the user level (`~/.claude/...`) as recorded in the user configuration file, cross-referencing the repository's user source directories to determine whether each entry is installed from the repo (`i`) or local-only (`l`).

**Acceptance Criteria:**

1. WHEN the user runs `ais claude list --user`, THEN the system SHALL read the user configuration file (`~/.config/ai-rules-sync/user.json`) and display all Claude entries, grouped by subtype.
2. WHEN the user runs `ais claude list <type> --user`, THEN the system SHALL display only user-level entries for that specific Claude subtype.
3. WHEN no user-level entries exist, THEN the system SHALL display a message indicating no user-level entries are installed and exit with code 0.
4. WHEN displaying entries in `--user` mode, THEN the system SHALL cross-reference each adapter's `userDefaultSourceDir` in the configured repository to determine whether each installed entry is present; entries found in the repo SHALL show the `i` (installed) marker and entries not found SHALL show the `l` (local-only) marker.
5. WHEN an adapter does not define `userDefaultSourceDir`, THEN `--user` mode SHALL fall back to cross-referencing the adapter's `defaultSourceDir` to determine `i` vs `l` status for that adapter.
6. WHEN no repository is configured, THEN all user-level entries SHALL show the `l` (local-only) marker.

---

### Requirement 3 — List Repo Source Entries (`--repo` flag)

When the user runs `ais claude list --repo`, the system shall display all discoverable entries available in the configured source repository for all Claude adapter types.

**Acceptance Criteria:**

1. WHEN the user runs `ais claude list --repo`, THEN the system SHALL enumerate entries from the current repository's source directories for each Claude adapter type, using each adapter's `defaultSourceDir`.
2. WHEN the user runs `ais claude list <type> --repo`, THEN the system SHALL enumerate only the entries found in the repository source directory for that specific Claude subtype.
3. WHEN the repository is not accessible or no entries exist in the source directory, THEN the system SHALL display a message indicating the directory is empty or unavailable, and exit with code 0.
4. WHEN an entry exists in the repository and is currently installed in the project, THEN the system SHALL show the `i` (installed) marker for that entry.
5. WHEN an entry exists in the repository but is not currently installed in the project, THEN the system SHALL show the `a` (available) marker for that entry.

---

### Requirement 4 — List Repo User-Level Source Entries (`--repo --user` flags)

When the user runs `ais claude list --repo --user`, the system shall display all discoverable entries available in the repository's user-segregated source directories (`userDefaultSourceDir`).

**Acceptance Criteria:**

1. WHEN the user runs `ais claude list --repo --user`, THEN the system SHALL enumerate entries from the repository directories defined by each Claude adapter's `userDefaultSourceDir` (e.g. `.claude/user/` for settings, `.claude/user/status-lines/` for status-lines).
2. WHEN an adapter does not define `userDefaultSourceDir`, THEN the system SHALL skip that adapter in `--repo --user` mode without error.
3. WHEN the user runs `ais claude list <type> --repo --user`, THEN the system SHALL enumerate only the user-sourced entries for that specific subtype.
4. WHEN the `userDefaultSourceDir` does not exist in the repository, THEN the system SHALL display a message indicating no user-sourced entries exist for that type.
5. WHEN an entry exists in the repository's `userDefaultSourceDir` and is currently installed at the user level, THEN the system SHALL show the `i` (installed) marker for that entry.
6. WHEN an entry exists in the repository's `userDefaultSourceDir` but is not currently installed at the user level, THEN the system SHALL show the `a` (available) marker for that entry.

---

### Requirement 5 — List Output Format and Status Markers

The system shall present list output in a consistent, human-readable format using single-letter colour-coded status markers to indicate each entry's relationship to the repository.

**Acceptance Criteria:**

1. WHEN the list command produces output, THEN the system SHALL group entries by subtype with a heading for each subtype that has entries.
2. WHEN displaying any entry in any list mode, THEN the system SHALL prefix each entry name with a single-letter status marker rendered in colour: `i` (green, chalk.green) for installed, `a` (cyan, chalk.cyan) for available, or `l` (magenta, chalk.magenta) for local-only.
3. WHEN an entry is linked into the project or user config from the repository, THEN the system SHALL display the `i` marker (green).
4. WHEN an entry exists in the repository source directory but is not installed in the current project or user config, THEN the system SHALL display the `a` marker (cyan).
5. WHEN an entry is present in the project or user config but cannot be found in any repository source directory, THEN the system SHALL display the `l` marker (magenta).
6. The system SHALL NOT use UTF-8 symbols (e.g. checkmarks, crosses) as status indicators; single ASCII letters with colour are required for broad terminal compatibility including tmux.
7. WHEN the list spans multiple subtypes, THEN the system SHALL display a summary count (e.g. "3 entries across 2 types") after the grouped output.
8. WHEN the `--quiet` flag is provided, THEN the system SHALL output only entry names, one per line, with no markers, no colour, and no decoration, suitable for scripting.

---

## 2. `--user` Import/Install Bug Fix

### Requirement 6 — User Mode Source Path in Import

When a user imports an entry with `--user`, the system shall resolve the source file from the correct user-level project path (`~/.claude/...`) rather than the project-level path.

**Acceptance Criteria:**

1. WHEN the user runs `ais claude settings import <name> --user`, THEN the system SHALL look for the source file under the adapter's `userTargetDir` (resolved relative to `$HOME`) rather than `adapter.targetDir` (relative to the current project).
2. WHEN the user runs `ais claude status-lines import <name> --user`, THEN the system SHALL look for the source file under `~/.claude/status_lines/<name>` (the `userTargetDir` for status-lines).
3. WHEN `options.skipIgnore` is `true` (user mode) and the adapter defines `userTargetDir`, THEN `importEntry()` in `sync-engine.ts` SHALL use `adapter.userTargetDir` to construct the source path instead of `adapter.targetDir`.
4. WHEN `handleImport()` in `handlers.ts` detects `ctx.user === true`, THEN it SHALL set `skipIgnore: true` in the `importOpts` passed to `importEntry()`.
5. WHEN the resolved source path does not exist, THEN the system SHALL report a specific error message indicating the expected user-level path and exit with code 1.

---

### Requirement 7 — User Mode Source Path in Install

When a user installs entries with `--user`, the system shall resolve symlink targets to user-level paths.

**Acceptance Criteria:**

1. WHEN the user runs `ais claude settings install --user`, THEN the system SHALL create symlinks in `adapter.userTargetDir` (relative to `$HOME`), not `adapter.targetDir`.
2. WHEN the user runs `ais claude status-lines install --user`, THEN the system SHALL create symlinks in `~/.claude/status_lines/`, consistent with `adapter.userTargetDir`.
3. IF an adapter does not define `userTargetDir`, THEN `--user` install SHALL fall back to `adapter.targetDir` resolved relative to `$HOME`, maintaining the existing behaviour for those adapters.

---

## 3. User-Level Repo Storage Segregation (`userDefaultSourceDir`)

### Requirement 8 — `userDefaultSourceDir` Adapter Configuration

Adapters that support user-level imports shall declare a `userDefaultSourceDir` field to store user-sourced files separately from project-sourced files within the rules repository.

**Acceptance Criteria:**

1. WHEN an adapter declares `userTargetDir`, THEN it SHOULD also declare `userDefaultSourceDir` identifying a distinct repo path for user-imported files.
2. The `claude-settings` adapter SHALL declare `userDefaultSourceDir: '.claude/user'` (distinct from its `defaultSourceDir: '.claude'`).
3. The `claude-status-lines` adapter SHALL declare `userDefaultSourceDir: '.claude/user/status-lines'` (distinct from its `defaultSourceDir: '.claude/status-lines'`).
4. WHEN `userDefaultSourceDir` is defined on an adapter, THEN it SHALL be reflected in the `SyncAdapter` interface in `src/adapters/types.ts` as an optional string field.

---

### Requirement 9 — User Import Uses `userDefaultSourceDir`

When importing an entry with `--user`, the system shall write the file to the adapter's `userDefaultSourceDir` in the repository rather than `defaultSourceDir`.

**Acceptance Criteria:**

1. WHEN `ais claude settings import settings --user` is executed, THEN the system SHALL copy the source file to `<repoDir>/.claude/user/settings.json` (the `userDefaultSourceDir` path).
2. WHEN `ais claude status-lines import my-status --user` is executed, THEN the system SHALL copy the source file to `<repoDir>/.claude/user/status-lines/my-status` (the `userDefaultSourceDir` path).
3. WHEN an adapter defines `userDefaultSourceDir` and `options.skipIgnore` is `true`, THEN `importEntry()` SHALL use `userDefaultSourceDir` in place of `defaultSourceDir` when computing `destPath` in the repository.
4. WHEN an adapter does not define `userDefaultSourceDir`, THEN user-mode import SHALL continue to use `defaultSourceDir`, maintaining backwards compatibility.
5. WHEN a user-mode import and a project-mode import of the same type coexist in the repository, THEN each SHALL occupy a distinct directory path with no file overlap.

---

### Requirement 10 — User Import Git Commit Reflects Segregation

When committing a user-mode import, the system shall include the user-segregated path in the git commit and log output.

**Acceptance Criteria:**

1. WHEN a user-mode import is committed, THEN the git `add` and `commit` operations SHALL reference the file path under `userDefaultSourceDir`, not `defaultSourceDir`.
2. WHEN the system logs the destination path of a user-mode import, THEN the logged path SHALL reflect the `userDefaultSourceDir`-based location.

---

## 4. Adapter Coverage & Registration

### Requirement 11 — All Claude Adapters Supported by List Command

The list command shall operate across all registered Claude adapter subtypes.

**Acceptance Criteria:**

1. WHEN the list command is invoked without a type argument, THEN the system SHALL query all eight Claude adapter subtypes: `rules`, `skills`, `agents`, `commands`, `md`, `status-lines`, `agent-memory`, `settings`.
2. WHEN a new Claude adapter is registered in the adapter registry, THEN the list command SHALL automatically include it without requiring changes to list command logic.
3. WHEN `ais claude list` is executed and zero adapters are registered for the `claude` tool, THEN the system SHALL display an informational message and exit with code 0.

---

### Requirement 12 — `list` Subcommand Registration

The `list` command shall be registered as a subcommand on the `claude` parent command, consistent with the existing declarative CLI registration pattern.

**Acceptance Criteria:**

1. WHEN the user runs `ais claude list --help`, THEN the system SHALL display usage information for the `list` subcommand including the optional `[type]` argument and the `--repo` and `--user` flags.
2. WHEN the user runs `ais claude --help`, THEN `list` SHALL appear in the list of available subcommands alongside `add`, `remove`, `install`, `import`.
3. The `list` command SHALL NOT be auto-generated by `registerAdapterCommands()` (which is per-subtype); it SHALL be registered once at the `claude` parent command level to span all subtypes.

---

## 5. Error Handling & Edge Cases

### Requirement 13 — Graceful Error Handling

The system shall handle error conditions in list and import operations without crashing and with actionable output.

**Acceptance Criteria:**

1. WHEN the current project has no `ai-rules-sync.json` file, THEN `ais claude list` SHALL treat the project as having zero Claude entries and display an appropriate message rather than throwing an unhandled error.
2. WHEN the configured repository path does not exist or is inaccessible, THEN `ais claude list --repo` SHALL display an error indicating the repository cannot be read and exit with code 1.
3. WHEN `ais claude <type> import <name> --user` is run but the adapter for `<type>` does not define `userTargetDir`, THEN the system SHALL display a warning that user-mode is not supported for that type and exit with code 1.
4. WHEN `--repo` and `--user` are both provided but the adapter has no `userDefaultSourceDir`, THEN `ais claude list --repo --user` SHALL skip that adapter and note the omission in output rather than throwing.

---

### Requirement 14 — Status Marker Assignment Per Mode

The system shall apply status markers consistently and correctly across all four list modes based on the relationship between the installed config and the repository.

**Acceptance Criteria:**

1. WHEN running in Mode A (no flags), THEN the system SHALL show only `i` or `l` markers: `i` when the entry's name is found in the adapter's `defaultSourceDir` in the configured repository, `l` otherwise.
2. WHEN running in Mode B (`--user` flag only), THEN the system SHALL show only `i` or `l` markers: `i` when the entry's name is found in the adapter's `userDefaultSourceDir` (or `defaultSourceDir` if `userDefaultSourceDir` is absent) in the configured repository, `l` otherwise.
3. WHEN running in Mode C (`--repo` flag only), THEN the system SHALL show only `i` or `a` markers: `i` when the repo entry is present in the project config, `a` when it is not.
4. WHEN running in Mode D (`--repo --user` flags), THEN the system SHALL show only `i` or `a` markers: `i` when the repo entry under `userDefaultSourceDir` is present in the user config, `a` when it is not.
5. WHEN no repository is configured in any mode, THEN the system SHALL display `l` for all entries (Modes A and B) or display an appropriate message and exit with code 1 (Modes C and D, which require a repo).

---

## Constraints

- All changes must remain compatible with the existing `SyncAdapter` interface extension pattern (add optional fields; do not break existing adapters that lack them).
- The `list` command output must work in both interactive terminal and non-interactive (piped) contexts.
- No changes to `ai-rules-sync.json` schema; the segregation is purely in the rules repository directory structure.
- Test coverage for new code paths must meet the project minimum of 80%.
