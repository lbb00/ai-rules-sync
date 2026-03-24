# Design: list-diff

## Overview

Add a `--diff` (`-d`) flag to `ais claude list` that produces a unified five-column table combining data from the local disk scan, repo source directories, and user config into a single view. Each unique (type, name) entry appears exactly once with per-source status indicators.

**Approach**: Extend existing module (Approach A from gap analysis). All new logic lives in `src/commands/list.ts` (mode handler, merge logic, types) and `src/index.ts` (CLI option, output formatting). No new files.

---

## Architecture

### Data Flow

```
CLI input (--diff)
       |
       v
handleClaudeList() dispatches to handleModeDiff()
       |
       +---> handleModeE(adapters, projectPath, false) --> ListResult (local disk)
       +---> handleModeC(adapters, repoPath, projectPath) --> ListResult (repo) *
       +---> getUserProjectConfig() + extractConfigEntries() --> ListEntry[] (user)
       |
       v
mergeIntoDiffRows(localResult, repoResult, userEntries)
       |
       v
DiffResult { rows: DiffRow[], totalCount, subtypeCount }
       |
       v
printDiffResult(result, options)  -->  formatted table to stdout

* When repoPath is undefined, repo step is skipped; all repo values = '-'
```

### Component Diagram

```
src/commands/list.ts                    src/index.ts
+-----------------------------------+   +---------------------------+
| ListOptions { diff?: boolean }    |   | CLI registration:         |
|                                   |   |   .option('-d, --diff')   |
| DiffRow {                         |   |                           |
|   subtype: string                 |   | printDiffResult(          |
|   name: string                    |   |   result: DiffResult,     |
|   local: 'l' | 'i' | '-'         |   |   quiet: boolean          |
|   repo: 'a' | '-'                |   | )                         |
|   user: 'i' | '-'                |   +---------------------------+
| }                                 |
|                                   |
| DiffResult {                      |
|   rows: DiffRow[]                 |
|   totalCount: number              |
|   subtypeCount: number            |
| }                                 |
|                                   |
| handleModeDiff()                  |
| mergeIntoDiffRows()               |
+-----------------------------------+
```

---

## Component Specifications

### 1. New Types in `src/commands/list.ts`

#### 1.1 `DiffRow` Interface

Represents a single row in the unified diff table. Maps to one unique (subtype, name) pair across all data sources.

```
interface DiffRow {
  subtype: string
  name: string
  local: 'l' | 'i' | '-'
  repo: 'a' | '-'
  user: 'i' | '-'
}
```

- **Requirement traceability**: 1, 2, 6

#### 1.2 `DiffResult` Interface

Return type of `handleModeDiff()`. Mirrors `ListResult` shape for consistency.

```
interface DiffResult {
  rows: DiffRow[]
  totalCount: number
  subtypeCount: number
}
```

- **Requirement traceability**: 1

#### 1.3 `ListOptions` Extension

Add `diff?: boolean` to the existing `ListOptions` interface.

```
interface ListOptions {
  // ... existing fields ...
  diff?: boolean
}
```

### 2. `handleModeDiff()` in `src/commands/list.ts`

**Signature**:
```
async function handleModeDiff(
  adapters: SyncAdapter[],
  projectPath: string,
  repoPath: string | undefined
): Promise<DiffResult>
```

**Behavior**:

1. Call `handleModeE(adapters, projectPath, false)` to get local disk entries.
2. If `repoPath` is defined, call `handleModeC(adapters, repoPath, projectPath)` to get repo entries. If `repoPath` is undefined, skip this step (repo column will be all `'-'`).
3. Call `getUserProjectConfig()` and `extractConfigEntries(userConfig, adapters)` to get user config entries. This reuses the same pattern as `handleModeB` but without cross-referencing the repo -- the user column only needs to know whether the entry is tracked in `user.json`.
4. Call `mergeIntoDiffRows(localEntries, repoEntries, userEntries)`.
5. Sort rows by `subtype` ascending, then `name` ascending.
6. Return `DiffResult` with `rows`, `totalCount`, and `subtypeCount`.

**Why not call `handleModeB`**: Mode B cross-references user config entries against the repo to determine `i` vs `l` status. For the diff table, we only need to know if a name exists in user config (show `'i'`) or not (show `'-'`). Calling `extractConfigEntries()` directly is simpler and avoids the unnecessary repo cross-reference.

- **Requirement traceability**: 1, 2, 6, 7

### 3. `mergeIntoDiffRows()` in `src/commands/list.ts`

**Signature**:
```
function mergeIntoDiffRows(
  localEntries: ListEntry[],
  repoEntries: ListEntry[],
  userEntries: ListEntry[]
): DiffRow[]
```

**Behavior**:

1. Create a `Map<string, DiffRow>` keyed by `${subtype}:${name}`.
2. For each `ListEntry` in `localEntries`:
   - Look up or create the `DiffRow` in the map.
   - Set `local` to the entry's `status` value (`'i'` or `'l'`). Both are valid local statuses.
3. For each `ListEntry` in `repoEntries`:
   - Look up or create the `DiffRow`.
   - Set `repo` to `'a'` (the entry exists in the repo, so it is available). The Mode C `status` field distinguishes `'i'` (installed in project config) vs `'a'` (available), but for the diff table repo column, any presence means `'a'` (available in repo).
4. For each `ListEntry` in `userEntries`:
   - Look up or create the `DiffRow`.
   - Set `user` to `'i'` (tracked in user config).
5. When creating a new `DiffRow`, initialize all status fields to `'-'`.

**Pure function**: No I/O, no side effects. Easy to unit test.

- **Requirement traceability**: 2, 6

### 4. Dispatch Logic in `handleClaudeList()`

Add a new dispatch branch at the top of `handleClaudeList()`, after type validation and adapter filtering, before the existing mutual exclusivity check.

**Validation order**:
1. Type argument validation (existing).
2. Adapter filtering (existing).
3. **New**: If `options.diff` is true and any of `options.local`, `options.repo`, or `options.user` is true, throw an error: `'--diff is mutually exclusive with --local, --repo, and --user'`.
4. **New**: If `options.diff` is true, call `handleModeDiff(adapters, projectPath, repoPath)` and return the result (typed as `ListResult | DiffResult` -- see section 6).
5. Existing mutual exclusivity check for `--local + --repo`.
6. Existing mode dispatch (E, D, C, B, A).

- **Requirement traceability**: 3, 4

### 5. `printDiffResult()` in `src/index.ts`

**Signature**:
```
function printDiffResult(result: DiffResult, quiet: boolean): void
```

**Behavior -- normal mode** (`quiet = false`):

1. If `result.totalCount === 0`, print `chalk.gray('No entries found.')` and return.
2. Calculate column widths:
   - `typeWidth` = max of `'Type'.length` and the longest `row.subtype` length.
   - `nameWidth` = max of `'Name'.length` and the longest `row.name` length.
   - Status columns (Local, Repo, User) are fixed width: the header label length (5, 4, 4) is always wider than the single-character values.
3. Print header row:
   ```
   chalk.bold('Type'.padEnd(typeWidth))  chalk.bold('Name'.padEnd(nameWidth))  chalk.bold('Local')  chalk.bold('Repo')  chalk.bold('User')
   ```
   Columns separated by two spaces.
4. Print separator line: dashes under each column, same widths.
5. For each row, print:
   ```
   row.subtype.padEnd(typeWidth)  row.name.padEnd(nameWidth)  colorize(row.local).padEnd(5)  colorize(row.repo).padEnd(4)  colorize(row.user)
   ```
6. Print summary line: `chalk.gray('N entries across M types')`.
7. Print legend: `chalk.gray('Legend: l=local-only  i=installed  a=available  -=absent')`.

**Color scheme** (reuses existing palette):
- `'i'` -- `chalk.green`
- `'a'` -- `chalk.cyan`
- `'l'` -- `chalk.magenta`
- `'-'` -- `chalk.gray`

**Behavior -- quiet mode** (`quiet = true`):

Print each row as tab-separated values, no header, no color:
```
${row.subtype}\t${row.name}\t${row.local}\t${row.repo}\t${row.user}
```

- **Requirement traceability**: 1, 5

### 6. Return Type Reconciliation

`handleClaudeList()` currently returns `Promise<ListResult>`. With `--diff`, it returns `DiffResult` which has a different shape (`rows` instead of `entries`).

**Approach**: Change the return type to `Promise<ListResult | DiffResult>`. Add a type guard function:

```
function isDiffResult(result: ListResult | DiffResult): result is DiffResult {
  return 'rows' in result
}
```

In the CLI action handler in `src/index.ts`, use this guard to dispatch to the correct print function:

```
const result = await handleClaudeList(...)
if (isDiffResult(result)) {
  printDiffResult(result, listOptions.quiet ?? false)
} else {
  printListResult(result, listOptions)
}
```

Export `DiffResult` and `isDiffResult` from `list.ts`.

- **Requirement traceability**: 1

### 7. CLI Option Registration in `src/index.ts`

Add the `-d, --diff` option to the `claude list` command registration:

```
.option('-d, --diff', 'Show unified diff table combining local, repo, and user views')
```

Pass `diff: cmdOptions.diff` into `listOptions`.

Update the `cmdOptions` type annotation to include `diff?: boolean`.

- **Requirement traceability**: 1, 3

---

## Sorting Specification

Rows are sorted by two keys:
1. Primary: `subtype` alphabetically ascending.
2. Secondary: `name` alphabetically ascending (case-sensitive, standard string comparison).

Sorting is applied in `handleModeDiff()` after merging and before returning the `DiffResult`.

- **Requirement traceability**: 1

---

## Error Handling

| Scenario | Behavior | Requirement |
|----------|----------|-------------|
| `--diff` combined with `--local` | Throw: `'--diff is mutually exclusive with --local, --repo, and --user'` | 3 |
| `--diff` combined with `--repo` | Throw: same message | 3 |
| `--diff` combined with `--user` | Throw: same message | 3 |
| `--diff` combined with multiple of `--local/--repo/--user` | Throw: same message | 3 |
| Invalid type argument with `--diff` | Throw: existing type validation error (handled before diff dispatch) | 4 |
| No repo configured (`repoPath` undefined) | Skip repo data collection; all Repo column values are `'-'` | 7 |
| Repo path inaccessible | Error from `handleModeC` propagates naturally; caught by CLI action handler | 7 |

---

## Affected Files

| File | Changes |
|------|---------|
| `src/commands/list.ts` | Add `diff` to `ListOptions`; add `DiffRow`, `DiffResult` interfaces; add `isDiffResult()` type guard; export `DiffResult`, `isDiffResult`; add `handleModeDiff()`, `mergeIntoDiffRows()` functions; add diff dispatch branch in `handleClaudeList()`; update return type to `ListResult \| DiffResult` |
| `src/index.ts` | Add `-d, --diff` CLI option; import `DiffResult`, `isDiffResult`; add `printDiffResult()` function; update action handler to dispatch between `printListResult` and `printDiffResult` via `isDiffResult()` |
| `src/__tests__/claude-list.test.ts` | Add test suite for diff mode covering: merge logic, status indicators, mutual exclusivity, type filtering, quiet mode, no-repo handling |

---

## Test Strategy

All tests go in the existing `src/__tests__/claude-list.test.ts` file, in a new `describe('Mode Diff (--diff)')` block. Use the existing `makeAdapter()` and `makeAllAdapters()` helpers.

### Test Cases

| Test | Validates | Requirement |
|------|-----------|-------------|
| Merge: entry in all three sources produces single row with correct statuses | Deduplication and per-column status | 2, 6 |
| Merge: entry in local only produces row with `l`, `-`, `-` | Single-source handling | 2, 6 |
| Merge: entry in repo only produces row with `-`, `a`, `-` | Single-source handling | 2, 6 |
| Merge: entry in user only produces row with `-`, `-`, `i` | Single-source handling | 2, 6 |
| Merge: entry in local (managed) shows `i` in local column | Installed vs local-only distinction | 2 |
| Mutual exclusivity: `--diff --local` throws | Flag validation | 3 |
| Mutual exclusivity: `--diff --repo` throws | Flag validation | 3 |
| Mutual exclusivity: `--diff --user` throws | Flag validation | 3 |
| Mutual exclusivity: `--diff --local --repo` throws | Flag validation | 3 |
| Type filter: `--diff` with type argument filters results | Type filtering | 4 |
| Type filter: `--diff` with invalid type throws | Type validation | 4 |
| No repo configured: repo column all `'-'` | Graceful degradation | 7 |
| Sort order: rows sorted by subtype then name | Ordering | 1 |
| Empty result: no entries from any source | Edge case | 1 |

Output formatting tests (`printDiffResult`) may be tested separately if the function is exported, or validated via integration-level tests that capture `console.log` output.

- **Requirement traceability**: 8
