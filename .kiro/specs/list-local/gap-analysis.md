# Gap Analysis: list-local

## Analysis Summary

- **Scope**: Add a `--local` flag to `ais claude list` that discovers Claude files on disk (rules, skills, agents, commands, md, settings, status-lines, agent-memory) regardless of whether they are managed by ais, and display them with a new `d` (on-disk) status indicator in the legend.
- **Primary reuse opportunity**: The `discoverProjectEntriesForAdapter()` function in `src/commands/import-all.ts` already implements mode-aware filesystem scanning (file/directory/hybrid) with suffix matching, symlink filtering, and hidden-file exclusion. This is the core discovery engine.
- **Key blocker**: `discoverProjectEntriesForAdapter()` requires a `RepoConfig` parameter to check `alreadyInRepo`. The `--local` flag needs discovery without a repo. This function must either be refactored to make `repo` optional or a lighter-weight discovery function must be extracted from it.
- **Integration complexity is low**: The list command (`src/commands/list.ts`) already has a clean multi-mode architecture (Modes A-D). Adding a new Mode E (`--local`) follows the established pattern. The `ListEntry` interface already has a `status` field that can accommodate a new value.
- **Legend update required in `src/index.ts`**: The `printListResult()` function (line ~1301) hardcodes the legend string and `STATUS_MARKERS` map. Both must be extended with the new `d` (on-disk) indicator.

---

## 1. Existing Codebase Analysis

### 1.1 Current List Command Architecture

**File**: `/Users/christo/Dropbox/SoftwareCats/ws/ai-rules-sync/src/commands/list.ts`

The list command operates in four mutually-exclusive modes:

| Mode | Flags | Data Source | Status Values |
|------|-------|------------|---------------|
| A | (none) | Project config (`ai-rules-sync.json` + `.local.json`) | `i` (in repo), `l` (local-only) |
| B | `--user` | User config (`user.json`) | `i`, `l` |
| C | `--repo` | Repo source directories | `i` (installed), `a` (available) |
| D | `--repo --user` | Repo user-source directories | `i`, `a` |

Key interfaces:

- `ListOptions`: `{ type?, user?, repo?, quiet? }` -- needs `local?: boolean`
- `ListEntry`: `{ subtype, name, status?: 'i' | 'a' | 'l' }` -- needs new status value `'d'` for on-disk
- `ListResult`: `{ entries, totalCount, subtypeCount }` -- unchanged

### 1.2 Discovery Logic in import-all.ts

**File**: `/Users/christo/Dropbox/SoftwareCats/ws/ai-rules-sync/src/commands/import-all.ts`

The `discoverProjectEntriesForAdapter()` function (lines 74-217) does exactly what `--local` needs for filesystem scanning:

1. Resolves `targetDir` (or `userTargetDir`) from the adapter
2. Reads directory contents with `fs.readdir()`
3. Filters out hidden files (`.` prefix) and symlinks
4. Applies mode-aware matching:
   - `file` mode: matches `fileSuffixes`, strips suffix for `entryName`
   - `directory` mode: includes directories only
   - `hybrid` mode: includes directories + files matching `hybridFileSuffixes`
5. Checks `alreadyInRepo` (this is the part we do NOT need for `--local`)

**Problem**: The function signature requires `repo: RepoConfig` (not optional). Lines 96-99 use `repo.path` unconditionally to build `repoSourcePath` for the `alreadyInRepo` check.

### 1.3 Claude Adapter Target Directories

All eight Claude adapters and their filesystem characteristics:

| Subtype | targetDir | Mode | Suffixes |
|---------|-----------|------|----------|
| rules | `.claude/rules` | hybrid | `.md` |
| skills | `.claude/skills` | directory | -- |
| agents | `.claude/agents` | hybrid | `.md` |
| commands | `.claude/commands` | hybrid | `.md` |
| md | `.claude` | file | `.md` |
| settings | `.claude` | file | `.json` |
| status-lines | `.claude/status-lines` | directory | -- |
| agent-memory | `.claude/agent-memory` | directory | -- |

Note that `md` and `settings` share `targetDir: '.claude'` but are distinguished by their `fileSuffixes` (`.md` vs `.json`). The discovery function handles this correctly via suffix matching in file mode.

### 1.4 Rendering / Legend (index.ts)

**File**: `/Users/christo/Dropbox/SoftwareCats/ws/ai-rules-sync/src/index.ts`

`printListResult()` (lines 1255-1303) handles display:
- Groups entries by subtype
- Applies color-coded status markers via `STATUS_MARKERS` map: `{ i: green, a: cyan, l: magenta }`
- Prints legend: `Legend: i=installed  a=available  l=local-only  |  source: ...`

The `STATUS_MARKERS` map and legend string are both hardcoded and must be updated to include `d`.

### 1.5 CLI Registration (index.ts)

The `claude list` command is registered at lines 1305-1333. It currently accepts:
- `[type]` positional argument (optional subtype filter)
- `-r, --repo` flag
- `-u, --user` flag
- `--quiet` flag

A new `-l, --local` flag must be added. Note: `-l` is already used as shorthand for `--local` on `add`, `import`, and `add-all` commands in other command groups, but NOT on `claude list`. There is no flag collision.

### 1.6 Test Coverage

**File**: `/Users/christo/Dropbox/SoftwareCats/ws/ai-rules-sync/src/__tests__/claude-list.test.ts` (269 lines)

Well-structured test file covering all four modes (A-D). Uses:
- `vi.mock` for `project-config.js`, `config.js`, `node:fs/promises`
- `makeAdapter()` helper with configurable overrides
- `CLAUDE_SUBTYPES` array listing all 8 subtypes
- Dynamic import pattern: `await import('../commands/list.js')` per test

This test file will need a new `describe` block for Mode E (`--local`).

**File**: `/Users/christo/Dropbox/SoftwareCats/ws/ai-rules-sync/src/__tests__/import-all.test.ts`

Tests the `discoverProjectEntriesForAdapter` function. Relevant for validating any refactoring to that function.

---

## 2. Implementation Gap

### 2.1 What Exists and Can Be Reused

| Component | Location | Reusable? | Notes |
|-----------|----------|-----------|-------|
| Filesystem discovery (mode/suffix/hidden/symlink) | `import-all.ts:discoverProjectEntriesForAdapter()` | Partially | Core scanning logic is perfect; `alreadyInRepo` check must be made optional |
| List command multi-mode dispatch | `list.ts:handleClaudeList()` | Fully | Add Mode E to the existing if/else chain |
| `ListEntry` / `ListResult` interfaces | `list.ts` | Extend | Add `'d'` to status union type |
| `ListOptions` interface | `list.ts` | Extend | Add `local?: boolean` |
| Status rendering | `index.ts:printListResult()` | Extend | Add `d` to `STATUS_MARKERS` and legend |
| CLI flag registration | `index.ts` (lines 1305-1312) | Extend | Add `.option('-l, --local', ...)` |
| Test infrastructure | `claude-list.test.ts` | Fully | Add Mode E describe block |
| Adapter metadata (`targetDir`, `mode`, `fileSuffixes`) | `src/adapters/claude-*.ts` | Fully | No changes needed |

### 2.2 What Must Be Built

#### 2.2.1 Discovery Function (Refactor or New)

The `discoverProjectEntriesForAdapter()` function needs to be usable without a `RepoConfig`. Two approaches:

**Option A: Extract a pure-filesystem scanner**

Create a new function `discoverLocalEntriesForAdapter(adapter, projectPath, isUser)` that contains only the filesystem scanning logic (lines 80-213 minus the `alreadyInRepo` checks). The original function would then call this internally and layer on the repo cross-reference.

- Pro: Clean separation of concerns; no risk to existing import-all behavior
- Pro: The new function has a simpler signature, easier to test
- Con: Some code duplication unless properly factored

**Option B: Make `repo` optional in existing function**

Change the signature to `repo: RepoConfig | null` and guard the `alreadyInRepo` logic behind `if (repo)`. When `repo` is null, set `alreadyInRepo: false` on all entries.

- Pro: Minimal code change; single function to maintain
- Con: Muddies the import-all contract; `alreadyInRepo` being always `false` is a semantic lie
- Con: `DiscoveredProjectEntry` interface carries `alreadyInRepo` field that is meaningless for list-local

**Option C: New lightweight function in list.ts**

Write a purpose-built `discoverLocalEntries()` function inside `list.ts` that uses adapter `targetDir` and `mode` metadata to scan the filesystem and returns `ListEntry[]` directly (not `DiscoveredProjectEntry[]`).

- Pro: No coupling to import-all; returns the right type directly
- Pro: Can be simpler since it only needs name + subtype, not the full import metadata
- Con: Duplicates the mode-dispatch logic (file/directory/hybrid suffix matching)

**Recommendation**: Option A is the cleanest. Extract the pure scanning logic into a shared helper (perhaps in a new `src/commands/discover.ts` or kept in `import-all.ts` as an export), then both `discoverProjectEntriesForAdapter()` and the new list-local mode can call it. Alternatively, if the team prefers minimizing file count, Option C is viable since the mode-dispatch logic is straightforward (~50 lines) and the two use cases have different return types.

#### 2.2.2 New List Mode (Mode E: --local)

A new `handleModeE()` function in `list.ts` that:
1. Iterates over filtered adapters
2. For each adapter, scans `adapter.targetDir` (or `adapter.userTargetDir` if `--user`) in the project directory
3. Applies mode-aware filtering (file suffixes, directory-only, hybrid)
4. Filters out hidden files and symlinks
5. Cross-references with project config (or user config if `--user`) to set status:
   - `d` if the entry is on disk but NOT in any config
   - `i` if the entry is on disk AND in config (already managed)
6. Returns `ListResult`

**Flag interaction rules** to decide:
- `--local` alone: Scan project target dirs, cross-reference with project config
- `--local --user`: Scan user target dirs (`adapter.userTargetDir`), cross-reference with user config
- `--local --repo`: Semantically contradictory (local scans disk, repo scans repo). Should either be an error or `--local` takes precedence. Needs decision.

#### 2.2.3 Interface Changes

In `src/commands/list.ts`:
```
// ListOptions
local?: boolean;

// ListEntry.status
status?: 'i' | 'a' | 'l' | 'd';
```

#### 2.2.4 Rendering Changes

In `src/index.ts`, `printListResult()`:
- Add to `STATUS_MARKERS`: `d: chalk.yellow` (or another color distinct from i/a/l)
- Update legend string to include `d=on-disk`
- Update source label logic to handle `--local`

#### 2.2.5 CLI Registration

In `src/index.ts`, the `claude list` command block:
- Add `.option('-l, --local', 'Scan project directory for Claude files on disk')`
- Update `cmdOptions` type to include `local?: boolean`
- Pass `local` through to `ListOptions`

---

## 3. Integration Challenges

### 3.1 Flag Conflicts

The `-l` short flag is already used for `--local` on other commands (add, import, add-all) but is NOT used on `claude list`. No conflict exists. However, consistency should be verified -- `-l` for `--local` on `claude list` matches the convention used elsewhere.

### 3.2 Shared targetDir Between Adapters

The `md` and `settings` adapters both have `targetDir: '.claude'`. When scanning `.claude/`, the discovery function must correctly apply each adapter's suffix filter independently to avoid one adapter picking up the other's files. The existing `discoverProjectEntriesForAdapter()` already handles this correctly by iterating per-adapter and applying mode-specific suffix matching.

### 3.3 Symlink Detection

The `--local` flag is described as scanning files "on disk regardless of whether they are managed by ais." Two interpretations:

1. **Include symlinks**: Show everything on disk, including ais-managed symlinks. Status `i` for managed, `d` for unmanaged.
2. **Exclude symlinks**: Only show non-symlink files (truly "local" files not yet imported). This is what `discoverProjectEntriesForAdapter()` does (line 124: `if (stats.isSymbolicLink()) continue`).

The requirement says "regardless of whether they are managed by ais", which suggests interpretation 1 (include everything). But the phrasing is ambiguous. If the goal is to show what is on disk, symlinks should be included. The status indicator (`i` vs `d`) would distinguish managed from unmanaged.

**Decision needed**: Should `--local` include symlinks (ais-managed entries) in its output?

### 3.4 Cross-reference with Config vs Repo

When `--local` is used, the cross-reference for status should check the project config (combined `ai-rules-sync.json` + `.local.json`), not the repo. An entry is `i` (installed/managed) if it appears in the config, and `d` (on-disk only) if it exists on disk but is absent from config.

---

## 4. Approach Options

### Option 1: Minimal -- Inline Discovery in list.ts

- Add `handleModeE()` in `list.ts` with its own filesystem scanning logic
- ~80 lines of new code in list.ts
- No changes to import-all.ts
- Duplicates mode-dispatch logic but keeps the change self-contained

**Effort**: Small (1 file changed + tests)
**Risk**: Low (no impact on existing code paths)

### Option 2: Refactor -- Extract Shared Discovery

- Extract `scanAdapterTargetDir(adapter, projectPath, isUser)` from `discoverProjectEntriesForAdapter()`
- New function returns `Array<{ sourceName, entryName, isDirectory, suffix? }>` (no repo fields)
- `discoverProjectEntriesForAdapter()` calls the new function and adds `alreadyInRepo`
- `handleModeE()` calls the new function and maps to `ListEntry[]`
- Place in `src/commands/discover.ts` or keep in `import-all.ts`

**Effort**: Medium (refactor import-all.ts + new mode in list.ts + tests for both)
**Risk**: Medium (must ensure import-all behavior is unchanged; import-all.test.ts regression check)

### Option 3: Make repo Optional in Existing Function

- Change `discoverProjectEntriesForAdapter(adapter, repo, ...)` to accept `repo: RepoConfig | null`
- Guard `alreadyInRepo` behind `if (repo)`, default to `false`
- `handleModeE()` calls it with `repo: null`
- Map `DiscoveredProjectEntry` to `ListEntry` in the new mode handler

**Effort**: Small-Medium (modify signature + new mode + tests)
**Risk**: Medium (changes a function signature used by import-all; must update callers)

---

## 5. Areas Requiring Further Investigation

1. **Symlink inclusion policy**: Should `--local` show ais-managed symlinks alongside unmanaged files, or exclude them? This affects whether we reuse the existing discovery logic (which excludes symlinks) or need different filtering.

2. **`--local --repo` interaction**: Is `--local --repo` an error, or does `--local` simply override `--repo`? Or could there be a combined mode showing disk files cross-referenced against repo availability?

3. **`--local --user` interaction**: Should this scan `userTargetDir` paths (under `~/`) instead of project `targetDir` paths? This seems logical but needs confirmation.

4. **Status indicator character**: The requirements mention `l=local` but the existing codebase already uses `l` for `local-only` (in config but not in repo). Using `d` for on-disk avoids collision. The exact character and color need to be decided.

5. **Legend display**: Should the legend change dynamically based on active flags (as it does now with the `source:` label), or always show all status indicators?

---

## 6. Files Requiring Modification

| File | Change Type | Scope |
|------|------------|-------|
| `src/commands/list.ts` | Extend interfaces + add Mode E handler | Core logic |
| `src/index.ts` | Add `--local` flag + update `printListResult()` legend/markers | CLI + rendering |
| `src/commands/import-all.ts` | Refactor if Option 2 chosen; untouched if Option 1 | Conditional |
| `src/__tests__/claude-list.test.ts` | Add Mode E test block | Tests |
| `src/__tests__/import-all.test.ts` | Update if import-all.ts refactored | Conditional |
