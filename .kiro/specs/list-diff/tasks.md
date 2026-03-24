# Tasks: list-diff

## Task 1: Add diff types, merge logic, and mode handler to list.ts

**Requirements**: 1, 2, 6, 7

### Task 1.1: Add DiffRow, DiffResult interfaces and isDiffResult type guard (P)

- [x] Add the `DiffRow` interface (subtype, name, local, repo, user fields with their literal union types), the `DiffResult` interface (rows, totalCount, subtypeCount), and the `isDiffResult()` type guard function. Add `diff?: boolean` to the existing `ListOptions` interface. Export `DiffResult` and `isDiffResult` from the module.

### Task 1.2: Implement mergeIntoDiffRows function (P)

- [x] Create the pure `mergeIntoDiffRows(localEntries, repoEntries, userEntries)` function that takes three `ListEntry[]` arrays and returns `DiffRow[]`. Use a `Map<string, DiffRow>` keyed by `${subtype}:${name}`. Initialize new rows with all statuses set to `'-'`. Set local status from the entry's status value (`'i'` or `'l'`), repo status to `'a'` for any repo entry, and user status to `'i'` for any user entry. This is a pure function with no I/O.

### Task 1.3: Implement handleModeDiff and wire dispatch in handleClaudeList

- [x] Create `handleModeDiff(adapters, projectPath, repoPath)` that calls `handleModeE` for local data, optionally `handleModeC` for repo data when repoPath is defined, and `getUserProjectConfig()` + `extractConfigEntries()` for user data. Call `mergeIntoDiffRows`, sort rows by subtype then name, and return a `DiffResult`. Update `handleClaudeList` return type to `Promise<ListResult | DiffResult>`. Add the dispatch branch: after type validation and adapter filtering, check for mutual exclusivity (`--diff` with `--local`, `--repo`, or `--user` throws an error), then dispatch to `handleModeDiff` when `options.diff` is true.

## Task 2: Add CLI option and output formatting to index.ts

**Requirements**: 1, 3, 4, 5

### Task 2.1: Register --diff CLI option and update action handler

- [x] Add the `-d, --diff` option to the `claude list` command registration. Update the `cmdOptions` type annotation to include `diff?: boolean`. Pass `diff: cmdOptions.diff` into the list options object. In the action handler, use `isDiffResult()` to dispatch between `printListResult` and `printDiffResult`.

### Task 2.2: Implement printDiffResult function (P)

- [x] Create `printDiffResult(result, quiet)` in `src/commands/list.ts` (exported, imported by `src/index.ts`). In normal mode: print column headers (Type, Name, Local, Repo, User) with chalk bold, a separator line of dashes, then each row with padEnd-aligned columns and colorized status indicators (green for `'i'`, cyan for `'a'`, magenta for `'l'`, gray for `'-'`). Print a summary line and a legend. Handle empty results with a gray message. In quiet mode: print tab-separated values with no headers, no color.

## Task 3: Add unit tests for diff mode

**Requirements**: 8

### Task 3.1: Test mergeIntoDiffRows and handleModeDiff

- [x] Add a `describe('Mode Diff (--diff)')` block in `src/__tests__/claude-list.test.ts`. Test merge behavior: entry in all three sources produces one row with correct statuses; entry in only one source shows `'-'` for absent columns; local-only entry shows `'l'`; managed local entry shows `'i'`. Test mutual exclusivity: `--diff --local`, `--diff --repo`, `--diff --user` each throw. Test type filtering with `--diff`. Test graceful handling when repoPath is undefined (all repo values `'-'`). Test sort order (subtype then name). Test empty result.

### Task 3.2: Test printDiffResult output formatting (P)

- [x] Test `printDiffResult` by capturing `console.log` output. Verify normal mode produces aligned columns with headers, separator, colored statuses, summary, and legend. Verify quiet mode produces tab-separated values without headers or color. Verify empty result shows the "No entries found." message.
