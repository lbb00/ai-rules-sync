# Tasks: list-local

## Task 1: Extract scanAdapterTargetDir from import-all.ts

### Description
Extract the pure filesystem scanning logic from `discoverProjectEntriesForAdapter()` in `src/commands/import-all.ts` into a new exported function `scanAdapterTargetDir()`. This function takes an adapter, project path, and user flag, and returns an array of `ScannedEntry` objects representing matching filesystem entries. It handles target directory resolution, ENOENT tolerance, hidden file filtering, symlink exclusion, and mode-aware entry matching (file/directory/hybrid with suffix filtering). After extraction, refactor `discoverProjectEntriesForAdapter()` to call `scanAdapterTargetDir()` internally and layer on the `alreadyInRepo` check, preserving its existing contract and return type.

**Requirements**: 4, 5, 9

### Sub-tasks
- [x] 1.1: Define and export the `ScannedEntry` interface in `src/commands/import-all.ts` with fields `sourceName`, `entryName`, `isDirectory`, and optional `suffix`.
- [x] 1.2: Implement and export `scanAdapterTargetDir(adapter, projectPath, isUser)` containing the directory reading, hidden file filtering, symlink exclusion via `lstat()`, and mode-dispatch logic (file suffixes, directory-only, hybrid suffixes) extracted from `discoverProjectEntriesForAdapter()`.
- [x] 1.3: Refactor `discoverProjectEntriesForAdapter()` to call `scanAdapterTargetDir()` and map its results to `DiscoveredProjectEntry[]` by adding the `alreadyInRepo` check. Verify no change to the existing function's return type or external behavior.

---

## Task 2: Add handleModeE and ListOptions changes in list.ts

### Description
Add the `local` flag to the `ListOptions` interface in `src/commands/list.ts` and implement the `handleModeE()` function that performs the local disk scan. This function iterates over the filtered adapters, calls `scanAdapterTargetDir()` for each, cross-references discovered entries against the combined project config (or user config when `--user` is set) to assign status `i` (managed) or `l` (local-only), and returns a standard `ListResult`. Add the mutual exclusivity guard for `--local` + `--repo` and wire Mode E dispatch into `handleClaudeList()` before the existing mode checks.

**Requirements**: 1, 2, 3, 7, 8

### Sub-tasks
- [x] 2.1: Add `local?: boolean` to the `ListOptions` interface.
- [x] 2.2: Implement `handleModeE(adapters, projectPath, isUser)` that calls `scanAdapterTargetDir()` per adapter, loads the appropriate config for cross-referencing, assigns `i` or `l` status to each entry, and returns a `ListResult` with `entries`, `totalCount`, and `subtypeCount`.
- [x] 2.3: Add the `--local` + `--repo` mutual exclusivity guard and Mode E dispatch block at the top of `handleClaudeList()`, before existing mode checks.

---

## Task 3: Register --local CLI option and update output formatting (P)

### Description
Add the `-l, --local` option to the `claude list` command registration in `src/index.ts` and pass the flag through to `ListOptions`. Update the source label logic in `printListResult()` to display the appropriate label when `--local` is active (e.g., `disk [--local]` or `disk [--user]`). No changes to `STATUS_MARKERS` or the legend string are needed since Mode E reuses the existing `i` and `l` status values.

**Requirements**: 1, 6

### Sub-tasks
- [x] 3.1: Add `.option('-l, --local', 'Scan project directory for Claude files on disk')` to the `claude list` command and pass `local: cmdOptions.local` into the `ListOptions` object.
- [x] 3.2: Update the `source` label logic in `printListResult()` to handle the `--local` flag, showing `disk [--local]` or `disk [--user]` as appropriate.

---

## Task 4: Add unit tests for scanAdapterTargetDir (P)

### Description
Add a new describe block in `src/__tests__/import-all.test.ts` with tests for the extracted `scanAdapterTargetDir()` function. Mock `fs-extra` methods (`readdir`, `lstat`, `pathExists`) to simulate various filesystem scenarios. Cover: file-mode adapter with suffix filtering, directory-mode adapter excluding files, hybrid-mode adapter with both, hidden file exclusion, symlink exclusion, non-existent target directory returning an empty array, and user-mode target directory resolution. Also verify that the existing `discoverProjectEntriesForAdapter()` tests still pass after the refactor.

**Requirements**: 9, 10

### Sub-tasks
- [x] 4.1: Add test cases for `scanAdapterTargetDir()` covering file-mode filtering (matching and non-matching suffixes), directory-mode (excluding non-directories), and hybrid-mode (directories plus suffix-matched files).
- [x] 4.2: Add test cases for hidden file exclusion (`.` prefix names), symlink exclusion (mocked `lstat` returning `isSymbolicLink: true`), and non-existent directory returning `[]`.
- [x] 4.3: Run the existing `discoverProjectEntriesForAdapter()` tests to confirm no regressions from the refactor.

---

## Task 5: Add unit tests for Mode E in claude-list.test.ts

### Description
Add a `describe('Mode E: --local flag')` block in `src/__tests__/claude-list.test.ts` with tests for the local scan mode. Mock `scanAdapterTargetDir` (from `import-all.js`) and the project config modules. Cover: local scan across all subtypes returning correct entries, type-filtered local scan returning only the matching subtype, status cross-referencing (entries in config get `i`, entries not in config get `l`), `--local --repo` throwing a mutual exclusivity error, `--local --user` using user config, empty target directories returning `totalCount: 0` without error, and quiet mode compatibility.

**Requirements**: 1, 2, 3, 6, 7, 10

### Sub-tasks
- [x] 5.1: Add test cases for all-subtype local scan and type-filtered local scan, verifying correct entries and subtype counts.
- [x] 5.2: Add test cases for status cross-referencing (managed vs local-only), `--local --repo` error, and `--local --user` using user config.
- [x] 5.3: Add test cases for empty directory handling (zero results, no errors) and verify quiet-mode output compatibility at the result level.
