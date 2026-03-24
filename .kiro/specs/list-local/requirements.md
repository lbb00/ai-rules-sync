# Requirements: list-local

## Project Description
Add --local flag to ais claude list that scans the project directory for Claude files on disk (commands, skills, agents, rules, md, settings, status-lines, agent-memory) regardless of whether they are managed by ais. Reuse existing discovery logic from import-all. Update legend to include l=local indicator.

---

## Requirements

### Requirement 1: Local Discovery Mode

WHEN the user invokes `ais claude list --local`, THEN ais SHALL scan the project's target directories for all Claude adapter subtypes (rules, skills, agents, commands, md, settings, status-lines, agent-memory) and return a list of files and directories that exist on disk, regardless of whether they are tracked in `ai-rules-sync.json`.

**Acceptance Criteria:**
- WHEN `--local` is passed without a type filter, THEN ais SHALL scan the `targetDir` of every registered Claude adapter and collect all matching filesystem entries.
- WHEN a target directory does not exist for a given adapter, THEN ais SHALL skip that adapter without error and continue scanning the remaining adapters.
- The `--local` flag SHALL be added to the `ListOptions` interface and wired into the CLI as a new option on `ais claude list`.

### Requirement 2: Type Filtering with --local

WHEN the user invokes `ais claude list <type> --local` (e.g., `ais claude list skills --local`), THEN ais SHALL restrict the local scan to the target directory of the specified subtype only.

**Acceptance Criteria:**
- WHEN `--local` is combined with a valid type argument, THEN ais SHALL scan only the single adapter matching that subtype.
- WHEN `--local` is combined with an invalid type argument, THEN ais SHALL throw an error listing the valid subtype names, consistent with existing type validation behavior.

### Requirement 3: Entry Status Cross-Referencing

WHEN displaying local entries, ais SHALL cross-reference each discovered on-disk entry against the project config (`ai-rules-sync.json` / `ai-rules-sync.local.json`) to determine its managed status.

**Acceptance Criteria:**
- WHEN a local entry is also present in the project config, THEN ais SHALL mark that entry with status `i` (installed/managed).
- WHEN a local entry is NOT present in any project config, THEN ais SHALL mark that entry with status `l` (local-only / unmanaged).

### Requirement 4: Symlink and Hidden File Handling

WHILE scanning target directories for local entries, ais SHALL skip symbolic links and hidden files/directories (names starting with `.`).

**Acceptance Criteria:**
- WHEN a filesystem entry is a symbolic link, THEN ais SHALL exclude it from the local listing, since symlinks represent entries already managed by ais.
- WHEN a filesystem entry's name begins with `.`, THEN ais SHALL exclude it from the local listing.

### Requirement 5: Adapter Mode Awareness

WHILE scanning for local entries, ais SHALL respect each adapter's declared `mode` (file, directory, hybrid) and associated suffix configuration.

**Acceptance Criteria:**
- WHEN an adapter's mode is `file`, THEN ais SHALL only include non-directory entries whose names match one of the adapter's `fileSuffixes`.
- WHEN an adapter's mode is `directory`, THEN ais SHALL only include directory entries.
- WHEN an adapter's mode is `hybrid`, THEN ais SHALL include directories and files matching the adapter's `hybridFileSuffixes`.

### Requirement 6: Quiet Mode Compatibility

WHEN `--local` is combined with `--quiet`, THEN ais SHALL output entry names only, one per line, with no decoration, headers, legend, or summary.

**Acceptance Criteria:**
- WHEN `--quiet` and `--local` are both set, THEN ais SHALL output each entry name on its own line with no additional formatting.
- The output format in quiet mode SHALL be consistent with the existing quiet mode behavior of other list modes.

### Requirement 7: Flag Mutual Exclusivity

WHEN `--local` is combined with `--repo`, THEN ais SHALL reject the combination with a clear error message, since `--local` scans the project directory while `--repo` scans the rules repository.

**Acceptance Criteria:**
- WHEN both `--local` and `--repo` are passed, THEN ais SHALL throw an error indicating these flags are mutually exclusive.
- WHEN `--local` is combined with `--user`, THEN ais SHALL scan the user-mode target directories (`adapter.userTargetDir` or fallback to `adapter.targetDir`) instead of the project-mode target directories.

### Requirement 8: ListResult Structure

WHEN returning results from the local scan, ais SHALL use the existing `ListResult` shape (`entries`, `totalCount`, `subtypeCount`) so that callers and output formatting remain consistent.

**Acceptance Criteria:**
- The local mode handler SHALL return a `ListResult` with `entries` typed as `ListEntry[]`, `totalCount` as the total number of discovered entries, and `subtypeCount` as the number of distinct subtypes found.
- Each `ListEntry` SHALL include `subtype`, `name`, and `status` fields.

### Requirement 9: Reuse of Existing Discovery Logic

WHERE feasible, the implementation SHALL reuse discovery patterns from `discoverProjectEntriesForAdapter` in `import-all.ts` rather than duplicating scanning and filtering logic.

**Acceptance Criteria:**
- The local scan logic SHALL apply the same adapter-mode-aware filtering (file suffixes, directory-only, hybrid) that `discoverProjectEntriesForAdapter` uses.
- The local scan SHALL NOT require a `RepoConfig` parameter, since it only needs to scan the project's target directories on disk.

### Requirement 10: Unit Test Coverage

The list-local feature SHALL have unit test coverage of at least 80%, covering the core behaviors defined in these requirements.

**Acceptance Criteria:**
- WHEN tests are run, THEN there SHALL be test cases for: local scan across all subtypes, type-filtered local scan, status cross-referencing (installed vs. local-only), symlink exclusion, hidden file exclusion, adapter mode filtering, quiet mode output, --local + --repo mutual exclusivity, and empty directory handling.
- Tests SHALL follow the existing test patterns in `claude-list.test.ts`, using vitest with mocked filesystem and config modules.
- Tests SHALL be located in `src/__tests__/` with a `.test.ts` suffix.
