# Gap Analysis: list-diff

## Summary

- **Scope**: Add a `--diff` flag to `ais claude list` that produces a unified table combining the outputs of `--local`, `--repo`, and `--user` modes into a single five-column view: Type, Name, Local (l/i/-), Repo (a/-), User (i/-).
- **Reuse potential is high**: All three data sources already have mode handlers (Mode E for `--local`, Mode C for `--repo`, Mode B for `--user`) that return `ListResult` with `ListEntry[]`. The merge logic is new but the data collection is not.
- **Primary gap**: No merge/join logic exists to correlate entries across three independent `ListResult` sets by (subtype, name) key. No table formatting exists in the codebase -- output is currently line-oriented with chalk coloring.
- **Secondary gap**: `printListResult()` in `src/index.ts` is a monolithic function that handles all existing output modes. The `--diff` output format (columnar table) is structurally different from the existing grouped-list format.
- **Risk**: The requirements document is minimal (description only, no detailed acceptance criteria). The design phase will need to establish detailed behavior specifications.

---

## 1. Existing Codebase Analysis

### 1.1 Data Collection Layer (`src/commands/list.ts`)

The `handleClaudeList()` function dispatches to five mode handlers based on flags:

| Mode | Flags | Handler | Returns | Status Values |
|------|-------|---------|---------|---------------|
| A | (none) | `handleModeA()` | Project config entries | `i` (in repo), `l` (local-only) |
| B | `--user` | `handleModeB()` | User config entries | `i` (in repo), `l` (local-only) |
| C | `--repo` | `handleModeC()` | Repo source-dir entries | `i` (installed), `a` (available) |
| D | `--repo --user` | `handleModeD()` | Repo user-source-dir entries | `i` (installed), `a` (available) |
| E | `--local` | `handleModeE()` | Disk-scanned entries | `i` (in config), `l` (local-only) |

All modes return `ListResult { entries: ListEntry[], totalCount, subtypeCount }` where `ListEntry` is `{ subtype, name, status? }`.

**Key observation**: The existing modes are mutually exclusive (e.g., `--local + --repo` throws). The `--diff` flag must call multiple modes internally and merge their results.

### 1.2 Relevant Status Semantics per Source Column

For the unified table, each source column needs its own status indicator:

- **Local column** (from Mode E data): `l` = exists on disk but not in config, `i` = exists on disk AND in config, `-` = not present on disk
- **Repo column** (from Mode C data): `a` = available in repo source dir, `-` = not in repo
- **User column** (from Mode B data): `i` = installed in user config, `-` = not in user config

### 1.3 CLI Registration (`src/index.ts`)

Lines 1307-1337 register `ais claude list [type]` with options `--repo`, `--user`, `--local`, `--quiet`. The action handler:

1. Resolves `projectPath` and `repoPath`
2. Gets `claudeAdapters` from registry (8 adapters: rules, skills, agents, commands, md, status-lines, agent-memory, settings)
3. Calls `handleClaudeList(adapters, projectPath, repoPath, options)`
4. Calls `printListResult(result, options)` for output

The `--diff` flag needs to be added as a new CLI option alongside existing ones.

### 1.4 Output Formatting (`printListResult()` in `src/index.ts`)

Lines 1255-1305. Currently handles:
- Empty results: gray "No entries found."
- Quiet mode: raw names, one per line
- Normal mode: grouped by subtype, with colored status markers (`i`/`a`/`l`), summary line, legend

**No table formatting library** is used. No `padEnd`/`padStart` column alignment exists. The codebase uses `chalk` for coloring and `console.log` for output.

### 1.5 Test Patterns (`src/__tests__/claude-list.test.ts`)

441 lines covering all five modes. Pattern:
- vi.mock for `project-config.js`, `config.js`, `node:fs/promises`, `commands/import-all.js`
- `makeAdapter(subtype, overrides?)` factory for test adapters
- `makeAllAdapters()` returns 8 Claude subtypes
- Dynamic `import()` for `handleClaudeList` to work with mocks
- Focused on data correctness (entries, status, counts), not output formatting

### 1.6 Adapter Inventory

Eight Claude adapters registered in `src/adapters/index.ts`:
- claude-skills, claude-agents, claude-commands, claude-rules, claude-md, claude-status-lines, claude-agent-memory, claude-settings

Each has `tool: 'claude'`, distinct `subtype`, `defaultSourceDir`, `targetDir`, and some have `userDefaultSourceDir`.

---

## 2. Gap Identification

### 2.1 Missing: Merge/Join Logic

**What exists**: Individual mode handlers that each produce an independent `ListEntry[]`.

**What's needed**: A function that:
1. Calls Mode E (local), Mode C (repo), and Mode B (user) for the same adapter set
2. Joins results by composite key `(subtype, name)`
3. Produces a unified entry with per-source status columns

**Complexity**: Moderate. The three modes use different config sources and cross-reference logic, but all return the same `ListEntry` shape. The join is a straightforward hash-join on `(subtype, name)`.

**Consideration**: Mode E currently enforces mutual exclusivity with `--repo`. This guard must be bypassed when `--diff` internally calls both modes.

### 2.2 Missing: Unified Diff Entry Type

**What exists**: `ListEntry { subtype, name, status? }` where `status` is a single value.

**What's needed**: A new type (e.g., `DiffEntry`) with per-source status fields:

```typescript
interface DiffEntry {
  subtype: string;
  name: string;
  local: 'l' | 'i' | '-';   // from Mode E
  repo: 'a' | '-';           // from Mode C
  user: 'i' | '-';           // from Mode B
}
```

### 2.3 Missing: Table Formatting

**What exists**: Line-oriented output with `chalk` coloring, grouped by subtype.

**What's needed**: Columnar table output with headers. Five columns: Type, Name, Local, Repo, User.

**Options**:
1. **Hand-rolled with `padEnd()`**: Zero dependencies, full control, matches existing codebase style (no external table libraries). Straightforward for fixed-column output.
2. **External library** (e.g., `cli-table3`): More features (borders, alignment), but adds a dependency the codebase currently avoids for output formatting.

**Recommendation for design phase**: Hand-rolled approach aligns with existing conventions. The table is simple (5 fixed columns, short values) and doesn't warrant a dependency.

### 2.4 Missing: `--diff` CLI Option Registration

**What exists**: `--repo`, `--user`, `--local`, `--quiet` options on `ais claude list`.

**What's needed**: A `--diff` (or `-d`) option. Must define mutual exclusivity rules:
- `--diff` likely conflicts with `--repo`, `--local`, `--user` since it internally invokes all three perspectives
- `--diff` should support `--quiet` (output names only) and type filtering
- Commander can handle this via validation in the action handler, matching the existing pattern for `--local + --repo`

### 2.5 Missing: Quiet Mode for Diff Output

**What exists**: Quiet mode prints `entry.name` one per line.

**What's needed**: Define what quiet mode means for `--diff`. Options:
- Names only (same as existing quiet): loses the per-source status information
- Tab-separated values: `subtype\tname\tlocal\trepo\tuser` for machine consumption
- Design phase decision needed

### 2.6 Missing: Tests for Diff Logic

**What exists**: Comprehensive mode A-E tests in `claude-list.test.ts`.

**What's needed**: Tests for:
- Merge logic: entries appearing in one, two, or all three sources
- Status mapping: correct per-source status values
- Type filtering with `--diff`
- Quiet mode with `--diff`
- Edge cases: no repo configured, empty results, entries with same name in different subtypes

---

## 3. Reuse Assessment

### 3.1 Fully Reusable

| Component | Location | How |
|-----------|----------|-----|
| Mode E handler | `handleModeE()` in list.ts | Call directly for local-disk data |
| Mode C handler | `handleModeC()` in list.ts | Call directly for repo-available data |
| Mode B handler | `handleModeB()` in list.ts | Call directly for user-config data |
| Type filtering | `handleClaudeList()` lines 102-115 | Adapter filtering before mode dispatch |
| Adapter registry | `adapterRegistry.getForTool('claude')` | Same adapter set |
| Config loading | `getCombinedProjectConfig`, `getUserProjectConfig` | Already imported by list.ts |
| Test helpers | `makeAdapter()`, `makeAllAdapters()` | Extend for diff tests |

### 3.2 Partially Reusable

| Component | Location | Modification Needed |
|-----------|----------|---------------------|
| `handleClaudeList()` | list.ts | Add `diff` option to `ListOptions`, add new dispatch branch before mode routing |
| `printListResult()` | index.ts | Add diff-format branch, or extract to a new `printDiffResult()` function |
| `ListOptions` interface | list.ts | Add `diff?: boolean` field |
| `ListEntry` type | list.ts | Unchanged; diff logic consumes `ListEntry[]` and produces `DiffEntry[]` |
| Mutual exclusivity guard | list.ts line 118 | Must not trigger when called internally by diff mode |

### 3.3 New Components Needed

| Component | Suggested Location | Rationale |
|-----------|-------------------|-----------|
| `DiffEntry` interface | list.ts | Co-locate with `ListEntry` |
| `DiffResult` interface | list.ts | Co-locate with `ListResult` |
| `handleModeDiff()` or `handleDiffMode()` | list.ts | New mode handler alongside A-E |
| `mergeListResults()` | list.ts | Pure function: three `ListResult` inputs, one `DiffEntry[]` output |
| `printDiffResult()` | index.ts (or extracted) | Table formatter for diff output |
| Diff-mode tests | `claude-list.test.ts` or new file | Test merge logic and edge cases |

---

## 4. Implementation Approaches

### Approach A: Extend Existing Module

Add `--diff` support directly into `src/commands/list.ts` and `src/index.ts`.

- **list.ts**: Add `diff?: boolean` to `ListOptions`, add `DiffEntry`/`DiffResult` types, add `handleModeDiff()` that calls Mode E, C, B internally, add `mergeListResults()` helper.
- **index.ts**: Add `--diff` option to CLI registration, add `printDiffResult()` function or extend `printListResult()`.

**Pros**: Minimal file changes, consistent with existing pattern, reuses all mode handlers directly.
**Cons**: `list.ts` grows larger; `index.ts` is already 2000+ lines.

### Approach B: Extract Diff Module

Create `src/commands/list-diff.ts` with merge logic and diff-specific types.

- **list-diff.ts**: `DiffEntry`, `DiffResult`, `handleDiffMode()`, `mergeListResults()`, `formatDiffTable()`.
- **list.ts**: Export mode handlers (currently private `async function`). Add `diff` to `ListOptions` for dispatch.
- **index.ts**: Import `handleDiffMode` and `formatDiffTable`, add CLI option.

**Pros**: Cleaner separation, `list.ts` stays focused, diff logic is self-contained.
**Cons**: Requires making mode handlers (A-E) exportable, adds a new file.

### Approach C: Extract All Formatting

Move `printListResult()` out of `src/index.ts` into a `src/commands/list-format.ts` or `src/cli/format.ts`, then add `printDiffResult()` alongside it.

**Pros**: Addresses the `index.ts` monolith problem, makes formatting testable.
**Cons**: Larger refactoring scope, higher risk of conflicts on the high-traffic `index.ts`.

---

## 5. Integration Challenges

### 5.1 Internal Mode Reuse vs. Mutual Exclusivity

The existing `--local + --repo` guard (line 118 of list.ts) throws an error. When `--diff` internally needs both Mode E and Mode C data, it must either:
- Call mode handlers directly (bypassing `handleClaudeList`), or
- Add an internal flag to skip the guard

### 5.2 Mode Handler Visibility

Mode handlers (`handleModeA` through `handleModeE`) are module-private (`async function`, not exported). If Approach B is chosen, they need to be exported or refactored to accept injected data sources.

### 5.3 Status Value Semantics Differ Across Modes

The `status` field in `ListEntry` has overlapping but context-dependent meanings:
- Mode E: `i` = on disk AND in config, `l` = on disk but not in config
- Mode C: `i` = in repo AND in project config, `a` = in repo but not in project config
- Mode B: `i` = in user config AND in repo, `l` = in user config but not in repo

The `--diff` table needs to map these to simpler per-column indicators. The Local column should show `l` (local-only) or `i` (installed) for entries found on disk, the Repo column should show `a` for entries available in the repo, and the User column should show `i` for entries in user config. Entries not found in a source get `-`.

### 5.4 `src/index.ts` Size

At 2000+ lines, `src/index.ts` is already a maintenance bottleneck. Adding more formatting logic increases the problem. This argues for Approach B or C.

### 5.5 Type Filter Interaction

The `[type]` positional argument (e.g., `ais claude list rules --diff`) must work with `--diff`. This is straightforward since type filtering happens before mode dispatch and all modes respect the filtered adapter list.

---

## 6. Research Needs for Design Phase

1. **Exact column semantics**: The spec says "Local (l/i/-), Repo (a/-), User (i/-)". Should the Local column show `l` for local-only files that are NOT symlinks to the repo? Should `i` mean "installed via ais" (i.e., is a symlink)?
2. **Sort order**: How should the unified table be sorted? By subtype then name? Alphabetically?
3. **Mutual exclusivity rules**: Is `--diff` mutually exclusive with `--repo`, `--local`, `--user`, or does it simply ignore them?
4. **Quiet mode format**: Names only? TSV with all columns? Design decision needed.
5. **Empty columns**: When no repo is configured, should the Repo column show all `-`? Or should the command warn/error?
6. **Performance**: Calling three mode handlers sequentially makes three config reads. Consider whether to share config state.
7. **Header formatting**: Should column headers use chalk styling? Should there be border characters (e.g., `|`) or just space-padded columns?

---

## 7. Dependency Analysis

**No new external dependencies required.** The table formatting can be achieved with `String.prototype.padEnd()` and `chalk` (already a dependency). No table library is needed for a 5-column, short-value table.

**Internal dependencies** for the diff handler:
- `handleModeE()`, `handleModeC()`, `handleModeB()` from `src/commands/list.ts`
- `SyncAdapter` from `src/adapters/types.ts`
- `getCombinedProjectConfig`, `getUserProjectConfig` (indirectly via mode handlers)
- `chalk` for colored output
