# Design: Claude Type List Command & User-Level Repo Storage

- **Feature**: type-list
- **Version**: 1.0
- **Date**: 2026-03-19
- **Status**: Generated

---

## Overview

This document covers four related architectural changes:

1. `userDefaultSourceDir` field on `SyncAdapter` and `AdapterConfig` for user-level repo segregation
2. Updates to `claude-settings` and `claude-status-lines` adapters to declare `userDefaultSourceDir`
3. `importEntry()` fix in `sync-engine.ts` to route user-mode imports to `userDefaultSourceDir`
4. `handleImport()` fix in `handlers.ts` to set `skipIgnore: true` when `ctx.user === true`
5. New `ais claude list [type] [--repo] [--user]` command registered at the `claude` parent command level

---

## Architecture

### Component Map

```
src/
  adapters/
    types.ts              -- SyncAdapter interface: add userDefaultSourceDir?: string
    base.ts               -- AdapterConfig interface: add userDefaultSourceDir?: string
                             createBaseAdapter: pass through userDefaultSourceDir
    claude-settings.ts    -- add userDefaultSourceDir: '.claude/user'
    claude-status-lines.ts -- add userDefaultSourceDir: '.claude/user/status-lines'
  sync-engine.ts          -- importEntry(): use userDefaultSourceDir when skipIgnore=true
  commands/
    handlers.ts           -- handleImport(): set skipIgnore: true when ctx.user === true
    list.ts               -- new: handleClaudeList(), ListOptions, ListResult
  index.ts                -- register `ais claude list` on the claude parent Command
  __tests__/
    claude-list.test.ts   -- unit tests for handleClaudeList
    sync-engine-user.test.ts -- unit tests for importEntry user-mode path
    handlers-user-import.test.ts -- unit tests for handleImport skipIgnore propagation
```

### Data Flow: `ais claude list`

```
CLI: ais claude list [type] [--repo] [--user]
        |
        v
  index.ts (claude parent command)
        |
        v
  commands/list.ts: handleClaudeList(adapters, options)
        |
        +-- no flags    --> read project config (ai-rules-sync.json + local)
        |                   group entries by subtype, print
        |
        +-- --user      --> read user config (~/.config/ai-rules-sync/user.json)
        |                   group entries by subtype, print
        |
        +-- --repo      --> fs.readdir each adapter.defaultSourceDir in repo
        |                   cross-reference against project config for "installed" status
        |
        +-- --repo --user --> fs.readdir each adapter.userDefaultSourceDir in repo
                            cross-reference against user config for "installed" status
```

### Data Flow: `ais claude settings import --user`

```
CLI: ais claude settings import <name> --user
        |
        v
  cli/register.ts: import action
     ctx = { user: true, skipIgnore: true, projectPath: os.homedir() }
        |
        v
  commands/handlers.ts: handleImport(adapter, ctx, name, options)
     importOpts.skipIgnore = ctx.skipIgnore  <-- FIX (currently missing)
        |
        v
  sync-engine.ts: importEntry(adapter, importOpts)
     sourcePath = join(homedir, adapter.userTargetDir, name)  when skipIgnore=true
     destPath   = join(repo.path, adapter.userDefaultSourceDir, name)  when skipIgnore=true
```

---

## Component Interfaces

### 1. `SyncAdapter` interface (`src/adapters/types.ts`)

Add one optional field after `userTargetDir`:

```typescript
/** Optional source directory in the rules repo for user-level imports.
 *  Distinct from defaultSourceDir to prevent path collisions with project imports.
 *  e.g. '.claude/user' for settings, '.claude/user/status-lines' for status-lines
 */
userDefaultSourceDir?: string;
```

Requirements traced: 8.4

### 2. `AdapterConfig` interface (`src/adapters/base.ts`)

Mirror the same optional field in `AdapterConfig` so `createBaseAdapter` can accept and pass it through:

```typescript
userDefaultSourceDir?: string;
```

`createBaseAdapter` propagates it verbatim to the returned `SyncAdapter` object — no logic change required.

Requirements traced: 8.4

### 3. `claude-settings` adapter (`src/adapters/claude-settings.ts`)

Add `userDefaultSourceDir: '.claude/user'` to the `createBaseAdapter` call. The existing `defaultSourceDir: '.claude'` is unchanged.

Requirements traced: 8.2

### 4. `claude-status-lines` adapter (`src/adapters/claude-status-lines.ts`)

Add `userDefaultSourceDir: '.claude/user/status-lines'` to the `createBaseAdapter` call. The existing `defaultSourceDir: '.claude/status-lines'` is unchanged.

Requirements traced: 8.3

### 5. `importEntry()` fix (`src/sync-engine.ts`)

**Current behaviour**: `importEntry` always computes `destPath` using `adapter.defaultSourceDir` regardless of user mode. The `targetPath` (source file in the project/home) is also computed without considering `userTargetDir`.

**Required changes**:

Two path computations in `importEntry` must be user-mode aware:

**a) Source path in user home (`targetPath`)**

```
// Existing code resolves:
const targetDirPath = getTargetDir(projectConfig, adapter.tool, adapter.subtype, name, adapter.targetDir)
const targetPath = join(absoluteProjectPath, targetDirPath, name)

// Required: when skipIgnore=true and adapter.userTargetDir is defined, use userTargetDir
// The condition mirrors the logic already present in sync-engine.ts linkEntry() at line 86-88
```

When `options.skipIgnore === true` and `adapter.userTargetDir` is defined, `targetDirPath` must be set to `adapter.userTargetDir` instead of the config-resolved default.

**b) Destination path in repo (`destPath` / `relativePath`)**

```
// Existing code resolves:
const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir)
const destPath = join(repoDir, sourceDir, name)

// Required: when skipIgnore=true and adapter.userDefaultSourceDir is defined, use userDefaultSourceDir
```

When `options.skipIgnore === true` and `adapter.userDefaultSourceDir` is defined, `sourceDir` must be replaced by `adapter.userDefaultSourceDir` before computing `destPath`.

The same two-part fix applies to `importEntryNoCommit()` which shares the same path-resolution logic.

Requirements traced: 6.3, 9.3, 9.4, 10.1, 10.2

### 6. `handleImport()` fix (`src/commands/handlers.ts`)

**Current behaviour**: `handleImport` builds `importOpts` without `skipIgnore`, so `importEntry` never enters user-mode path branches.

**Required change**: Set `skipIgnore: ctx.skipIgnore` (or `true` when `ctx.user === true`) in `importOpts` before calling `importEntry`.

```typescript
// In handleImport, existing importOpts construction (lines 456-464):
const importOpts: ImportOptions = {
  projectPath: ctx.projectPath,
  name,
  repo: ctx.repo,
  isLocal: ctx.isLocal,
  commitMessage: options.message,
  force: options.force,
  push: options.push,
  skipIgnore: ctx.skipIgnore  // ADD THIS LINE
};
```

`cli/register.ts` already sets `ctx.skipIgnore = isUser` in the import action (line 193), so no change is needed to the CLI registration layer.

Requirements traced: 6.4, 6.1, 6.2

### 7. New `handleClaudeList()` function (`src/commands/list.ts`)

This is a new file. It exports the handler function and related types.

#### Types

```typescript
export interface ListOptions {
  /** Filter to a single Claude subtype, e.g. 'rules', 'settings'. undefined = all subtypes. */
  type?: string;
  /** When true, list from user config (user.json) instead of project config */
  user?: boolean;
  /** When true, enumerate repo source directories instead of installed config */
  repo?: boolean;
  /** When true, output entry names only, one per line (no decoration) */
  quiet?: boolean;
}

export interface ListEntry {
  subtype: string;
  name: string;
  /** Only defined in --repo mode: whether the entry is installed in project/user config */
  installed?: boolean;
}

export interface ListResult {
  entries: ListEntry[];
  totalCount: number;
  subtypeCount: number;
}
```

#### `handleClaudeList` signature

```typescript
export async function handleClaudeList(
  claudeAdapters: SyncAdapter[],
  projectPath: string,
  repoPath: string | undefined,
  options: ListOptions
): Promise<ListResult>
```

#### Internal logic branches

**Mode A — installed entries (no flags)**

1. Read project config via `getCombinedProjectConfig(projectPath)`.
2. For each adapter in `claudeAdapters` (filtered by `options.type` if set): extract `config[tool][subtype]` entries.
3. Return grouped `ListEntry[]`.

**Mode B — user-installed entries (`--user`, no `--repo`)**

1. Read user config via `getUserProjectConfig()`.
2. Same extraction logic as Mode A but against user config.

**Mode C — repo source entries (`--repo`, no `--user`)**

1. For each adapter: resolve `sourceDir = getSourceDir(repoConfig, tool, subtype, adapter.defaultSourceDir)`.
2. `fs.readdir(join(repoPath, sourceDir))` — catch ENOENT gracefully.
3. For each discovered entry, check if name appears in `getCombinedProjectConfig` under `config[tool][subtype]` to set `installed`.

**Mode D — repo user-source entries (`--repo --user`)**

1. For each adapter: skip if `adapter.userDefaultSourceDir` is undefined (emit note, no error).
2. `fs.readdir(join(repoPath, adapter.userDefaultSourceDir))` — catch ENOENT gracefully.
3. For each entry, check if name appears in user config to set `installed`.

**Type filtering**

When `options.type` is set, validate it against the set of registered Claude adapter subtypes before entering any mode. Return error with valid type list if invalid.

Requirements traced: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 13.1, 13.2, 13.4

#### Output formatting (`src/commands/list.ts`)

A separate `printListResult` helper (not exported; called inside the CLI action in `index.ts`) handles all `chalk` rendering:

- Group by `subtype`, print a heading per subtype that has entries.
- In `--repo` mode, prefix installed entries with a filled marker and uninstalled with an empty marker (plain ASCII, no Unicode dependency).
- Print summary line: `N entries across M types`.
- In `--quiet` mode, print `entry.name` one per line with no decoration.
- TTY detection: when stdout is not a TTY, suppress colour automatically (chalk handles this).

Requirements traced: 5.1, 5.2, 5.3, 5.4, 12.1

### 8. CLI registration — `ais claude list` (`src/index.ts`)

The `list` subcommand is registered directly on the `claude` parent `Command` object, **not** via `registerAdapterCommands()`. This placement mirrors how `claude install` and `claude add-all` are registered today (lines 1103–1178 in `index.ts`).

```typescript
// After existing claude add-all block, before claude rules subgroup

claude
  .command('list [type]')
  .description('List installed or available Claude entries across all subtypes')
  .option('-r, --repo', 'List entries available in the rules repository source directories')
  .option('-u, --user', 'List entries from user config (~/.config/ai-rules-sync/user.json)')
  .option('--quiet', 'Output entry names only, one per line')
  .action(async (type: string | undefined, cmdOptions: { repo?: boolean; user?: boolean; quiet?: boolean }) => {
    // action body: resolve repo, invoke handleClaudeList, print result
  });
```

The action body:
1. Reads `program.opts()` to resolve the target repo (same pattern as other claude commands).
2. Passes `adapterRegistry.getForTool('claude')` as `claudeAdapters`.
3. Calls `handleClaudeList(...)`.
4. Calls `printListResult(result, cmdOptions)`.
5. Exits with code 1 on error or when an invalid `type` is passed.

Requirements traced: 12.1, 12.2, 12.3

---

## Sequence Diagrams

### User-mode import flow (after fix)

```
User                  register.ts            handlers.ts            sync-engine.ts
  |                       |                      |                       |
  |-- ais claude settings import settings --user |                       |
  |                       |                      |                       |
  |              ctx.skipIgnore = true            |                       |
  |              ctx.user = true                  |                       |
  |              projectPath = homedir()          |                       |
  |                       |                      |                       |
  |                       |-- handleImport() ---->|                      |
  |                       |                      |                       |
  |                       |            importOpts.skipIgnore = true       |
  |                       |                      |                       |
  |                       |                      |-- importEntry() ------>|
  |                       |                      |                       |
  |                       |                      |    skipIgnore=true     |
  |                       |                      |    targetDirPath = adapter.userTargetDir (.claude)
  |                       |                      |    sourceDir = adapter.userDefaultSourceDir (.claude/user)
  |                       |                      |    targetPath = ~/. claude/settings.json
  |                       |                      |    destPath = <repo>/.claude/user/settings.json
  |                       |                      |                       |
  |                       |                      |    git add .claude/user/settings.json
  |                       |                      |    git commit
  |                       |                      |<--- return ------------|
  |                       |<-- addUserDependency()|                       |
```

### `ais claude list --repo --user` flow

```
User                    index.ts              commands/list.ts         filesystem
  |                        |                        |                      |
  |-- ais claude list --repo --user                 |                      |
  |                        |                        |                      |
  |                        |-- handleClaudeList() -->|                     |
  |                        |       claudeAdapters    |                     |
  |                        |       repoPath          |                     |
  |                        |       { repo:true, user:true }                |
  |                        |                        |                      |
  |                        |              for each adapter:                |
  |                        |                if !userDefaultSourceDir: skip |
  |                        |                        |-- readdir() -------->|
  |                        |                        |<-- entries ----------|
  |                        |                        |                      |
  |                        |              cross-ref with user config       |
  |                        |                        |                      |
  |                        |<-- ListResult ----------|                     |
  |                        |                        |                      |
  |              printListResult()                  |                      |
  |<-- stdout output -------|                        |                      |
```

---

## Key Design Decisions

### Decision 1: `userDefaultSourceDir` as an optional field, not a required one

Adapters that do not support user-level imports (rules, skills, agents, commands, md, agent-memory) remain unmodified. The optional field preserves backward compatibility across all 34 registered adapters. New adapters can opt in by declaring the field.

Alternatives considered: a separate `UserCapableAdapter` sub-interface. Rejected as overly complex — optional fields on the existing interface achieve the same result without adding a type hierarchy.

Requirements traced: 8.1, 9.4, constraints section.

### Decision 2: `list` registered on the `claude` parent Command, not via `registerAdapterCommands`

`registerAdapterCommands` generates per-subtype commands. A cross-subtype `list` does not fit that model. The `claude install` and `claude add-all` commands follow the same pattern of being registered directly on the `claude` parent — `list` mirrors this precedent.

Requirements traced: 12.3

### Decision 3: `handleClaudeList` lives in `src/commands/list.ts`, not `src/commands/handlers.ts`

`handlers.ts` contains the generic per-adapter `handleAdd/handleRemove/handleImport` functions. The `list` command spans all Claude adapters simultaneously and has its own result types — placing it in a dedicated file avoids bloating `handlers.ts` and keeps module responsibilities clear.

### Decision 4: `importEntryNoCommit` receives the same `skipIgnore`-aware path fix

`importEntryNoCommit` shares identical path-resolution logic with `importEntry`. Fixing one without the other would create divergence between single-import and batch-import user-mode paths. Both functions must apply the same `userTargetDir` and `userDefaultSourceDir` branching.

### Decision 5: `printListResult` is private to the CLI action, not exported

Output formatting is a CLI concern. Keeping `printListResult` as a module-private function inside `index.ts` (or an inline closure in the action) preserves the testability of `handleClaudeList` itself, which returns a plain `ListResult` with no side effects. Tests call `handleClaudeList` directly and assert on `ListResult`.

---

## Error Handling

| Scenario | Location | Behaviour |
|---|---|---|
| Invalid `type` argument | `handleClaudeList` | Throw `Error` with message listing valid types. CLI action catches, prints, exits 1. |
| No project config file | `handleClaudeList` Mode A | `getCombinedProjectConfig` returns `{}`. No entries. Print "no entries" message, exit 0. |
| Repo inaccessible / path missing | `handleClaudeList` Mode C | `fs.readdir` throws ENOENT. Print error message, throw. CLI action exits 1. |
| Adapter has no `userDefaultSourceDir` in `--repo --user` | `handleClaudeList` Mode D | Skip adapter, note omission in output. No error. |
| `userDefaultSourceDir` dir does not exist in repo | `handleClaudeList` Mode D | Catch ENOENT, print "no user-sourced entries for `<type>`", continue. |
| `importEntry` called with `skipIgnore=true` but adapter has no `userTargetDir` | `sync-engine.ts` | Falls back to `targetDir` (existing behaviour). No regression. |
| `importEntry` called with `skipIgnore=true` but adapter has no `userDefaultSourceDir` | `sync-engine.ts` | Falls back to `defaultSourceDir` (existing behaviour). No regression. |
| Adapter for `<type>` has no `userTargetDir` and `--user` import attempted | `handleImport` / caller | Requirement 13.3: warn and exit 1. This validation belongs at the CLI action layer (register.ts or index.ts), not in `handleImport` itself. |

Requirements traced: 13.1, 13.2, 13.3, 13.4

---

## Test Strategy

### Test file locations

| Test file | Covers |
|---|---|
| `src/__tests__/claude-list.test.ts` | `handleClaudeList` — all four modes, type filtering, empty states, error paths |
| `src/__tests__/sync-engine-user.test.ts` | `importEntry` user-mode path: `userTargetDir` as source, `userDefaultSourceDir` as dest |
| `src/__tests__/handlers-user-import.test.ts` | `handleImport` passes `skipIgnore` to `importEntry` when `ctx.user=true` |
| `src/__tests__/claude-settings.test.ts` (extend existing if present) | Verify `userDefaultSourceDir: '.claude/user'` is declared on adapter |
| `src/__tests__/claude-status-lines.test.ts` (extend existing if present) | Verify `userDefaultSourceDir: '.claude/user/status-lines'` is declared on adapter |

### Test patterns

All test files follow established project conventions:
- `describe`/`it`/`expect`/`vi` from vitest
- `vi.mock('execa', ...)` to prevent real git subprocess calls
- `vi.mock('../project-config.js', ...)` to stub config reads
- `vi.mock('../config.js', ...)` to stub `getUserProjectConfig`
- `os.tmpdir()` + `fs-extra` for real filesystem fixtures where needed; `afterEach` cleanup

### `claude-list.test.ts` — scenario matrix

| Scenario | Mode | Assertion |
|---|---|---|
| No flags, entries in config | A | `ListResult.entries` contains all config entries grouped by subtype |
| No flags, no config file | A | `ListResult.entries` is empty, `totalCount === 0` |
| `type='rules'`, entries present | A | Only `rules` entries returned |
| `type='invalid'` | A | Throws with message containing valid type list |
| `--user`, entries in user.json | B | Reads user config; returns user entries |
| `--user`, empty user.json | B | `totalCount === 0` |
| `--repo`, repo has entries | C | `ListEntry.installed` correctly reflects config state |
| `--repo`, repo dir missing | C | Throws with repo-not-accessible message |
| `--repo --user`, adapter has `userDefaultSourceDir` | D | Reads `userDefaultSourceDir` from repo |
| `--repo --user`, adapter missing `userDefaultSourceDir` | D | Adapter skipped, no error thrown |
| `--repo --user`, `userDefaultSourceDir` dir missing | D | Returns empty for that adapter with note |

Requirements traced: 1.1–1.4, 2.1–2.3, 3.1–3.4, 4.1–4.4, 11.1, 11.2, 11.3, 13.1, 13.2, 13.4

### `sync-engine-user.test.ts` — scenario matrix

| Scenario | Assertion |
|---|---|
| `skipIgnore=true`, adapter has `userTargetDir` and `userDefaultSourceDir` | `targetPath` uses `userTargetDir`; `destPath` uses `userDefaultSourceDir` |
| `skipIgnore=true`, adapter has no `userDefaultSourceDir` | `destPath` falls back to `defaultSourceDir` |
| `skipIgnore=false` | Both paths use non-user defaults (regression guard) |
| Git commit references `userDefaultSourceDir`-based relative path | `execa('git', ['add', relativePath])` receives the user-segregated path |

Requirements traced: 6.3, 9.3, 9.4, 10.1

### `handlers-user-import.test.ts` — scenario matrix

| Scenario | Assertion |
|---|---|
| `ctx.user=true` | `importEntry` called with `importOpts.skipIgnore === true` |
| `ctx.user=false` | `importEntry` called with `importOpts.skipIgnore` falsy |
| `ctx.skipIgnore=true` explicitly set | Propagated to `importOpts` unchanged |

Requirements traced: 6.4

---

## Requirements Traceability

| Requirement | Addressed by |
|---|---|
| 1.1 | `handleClaudeList` Mode A reads combined project config, groups by subtype |
| 1.2 | Mode A with empty config returns empty result; CLI prints "no entries", exits 0 |
| 1.3 | `options.type` filter applied to Mode A |
| 1.4 | `type` validation in `handleClaudeList` before any mode executes |
| 2.1 | `handleClaudeList` Mode B reads user config, groups by subtype |
| 2.2 | Mode B with `options.type` filter |
| 2.3 | Mode B with empty user config returns empty result |
| 3.1 | `handleClaudeList` Mode C reads `adapter.defaultSourceDir` in repo |
| 3.2 | Mode C with `options.type` filter |
| 3.3 | Mode C ENOENT handling exits 0 with message |
| 3.4 | Mode C sets `entry.installed` by cross-referencing project config |
| 4.1 | `handleClaudeList` Mode D reads `adapter.userDefaultSourceDir` in repo |
| 4.2 | Mode D skips adapters without `userDefaultSourceDir` |
| 4.3 | Mode D with `options.type` filter |
| 4.4 | Mode D handles missing `userDefaultSourceDir` dir with per-adapter message |
| 5.1 | `printListResult` groups by subtype with heading per non-empty subtype |
| 5.2 | `printListResult` uses distinct markers for installed vs available in `--repo` mode |
| 5.3 | `printListResult` emits summary count after grouped output |
| 5.4 | `--quiet` flag causes `printListResult` to output names only, one per line |
| 6.1 | `importEntry` uses `adapter.userTargetDir` as source dir when `skipIgnore=true` (settings) |
| 6.2 | `importEntry` uses `adapter.userTargetDir` as source dir when `skipIgnore=true` (status-lines) |
| 6.3 | `importEntry` branches on `options.skipIgnore && adapter.userTargetDir` for source path |
| 6.4 | `handleImport` sets `importOpts.skipIgnore = ctx.skipIgnore` |
| 6.5 | `importEntry` throws descriptive error when resolved source path does not exist (existing behaviour) |
| 7.1 | `link()` in `base.ts` already uses `userTargetDir` when `skipIgnore=true` (no change needed) |
| 7.2 | Same as 7.1 for status-lines adapter |
| 7.3 | `link()` falls back to `targetDir` when `userTargetDir` undefined (existing behaviour) |
| 8.1 | `userDefaultSourceDir` declared alongside `userTargetDir` as optional field |
| 8.2 | `claude-settings` declares `userDefaultSourceDir: '.claude/user'` |
| 8.3 | `claude-status-lines` declares `userDefaultSourceDir: '.claude/user/status-lines'` |
| 8.4 | `SyncAdapter` interface gains `userDefaultSourceDir?: string` |
| 9.1 | `importEntry` writes to `.claude/user/settings.json` for settings user-mode import |
| 9.2 | `importEntry` writes to `.claude/user/status-lines/<name>` for status-lines user-mode import |
| 9.3 | `importEntry` uses `adapter.userDefaultSourceDir` for `destPath` when `skipIgnore=true` |
| 9.4 | Fallback to `defaultSourceDir` when `userDefaultSourceDir` undefined |
| 9.5 | Distinct paths guaranteed by directory structure (`.claude/user/` vs `.claude/`) |
| 10.1 | `relativePath` passed to `git add` uses `userDefaultSourceDir`-based `destPath` |
| 10.2 | `destPath` used for both git and log output |
| 11.1 | `handleClaudeList` iterates all 8 Claude adapters when no type filter |
| 11.2 | New adapters auto-included via `adapterRegistry.getForTool('claude')` |
| 11.3 | Empty adapter list in registry produces "no entries" message, exits 0 |
| 12.1 | `ais claude list --help` shows `[type]`, `--repo`, `--user` |
| 12.2 | `ais claude --help` shows `list` alongside `add`, `remove`, `install`, `import` |
| 12.3 | `list` registered directly on `claude` parent Command, not via `registerAdapterCommands` |
| 13.1 | `getCombinedProjectConfig` returns `{}` on missing file; `handleClaudeList` handles empty gracefully |
| 13.2 | Repo path ENOENT in Mode C: throws error, CLI exits 1 |
| 13.3 | Adapter without `userTargetDir` and `--user` import: warn and exit 1 (CLI action layer) |
| 13.4 | Mode D skips adapters without `userDefaultSourceDir`, notes omission in output |
