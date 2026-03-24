# Requirements: list-diff

## Project Description
Add --diff flag to ais claude list that produces a unified table combining --local, --repo, and --user views. Five columns: Type, Name, Local (l/i/-), Repo (a/-), User (i/-). Each entry appears once with its status across all three sources. Supports type filtering and quiet mode.

---

## Requirements

### Requirement 1: Unified Diff Table Output

WHEN the user runs `ais claude list --diff`, THEN the system SHALL produce a single table with five columns: Type, Name, Local, Repo, User.

**Acceptance Criteria:**
- WHEN `--diff` is provided, THEN the system SHALL display a formatted table with column headers "Type", "Name", "Local", "Repo", "User".
- WHEN `--diff` is provided, THEN the system SHALL collect data from existing Mode A (project config), Mode C (repo source dirs), Mode D (repo user-source dirs), and Mode E (local disk scan) internally.
- WHEN `--diff` is provided, THEN the system SHALL merge all collected entries by a composite key of (type, name) so that each unique entry appears exactly once in the output.

### Requirement 2: Status Indicators per Column

WHILE displaying the diff table, the system SHALL show the correct status indicator for each entry in each column.

**Acceptance Criteria:**
- The Local column SHALL display `l` when the entry exists on disk but is not managed by any config (local-only).
- The Local column SHALL display `i` when the entry exists on disk and is tracked in the project or user config (installed/managed).
- The Local column SHALL display `-` when the entry is not present on disk.
- The Repo column SHALL display `a` when the entry exists in the repo source directory (available).
- The Repo column SHALL display `-` when the entry does not exist in the repo source directory.
- The User column SHALL display `i` when the entry is tracked in the user config (`user.json`).
- The User column SHALL display `-` when the entry is not tracked in the user config.

### Requirement 3: Mutual Exclusivity with Existing Flags

WHEN the user provides `--diff` together with `--local`, `--repo`, or `--user`, THEN the system SHALL reject the command with an error.

**Acceptance Criteria:**
- WHEN `--diff` is combined with `--local`, THEN the system SHALL output an error message indicating that `--diff` is mutually exclusive with `--local`.
- WHEN `--diff` is combined with `--repo`, THEN the system SHALL output an error message indicating that `--diff` is mutually exclusive with `--repo`.
- WHEN `--diff` is combined with `--user`, THEN the system SHALL output an error message indicating that `--diff` is mutually exclusive with `--user`.
- WHEN `--diff` is combined with any combination of `--local`, `--repo`, and `--user`, THEN the system SHALL reject the command with an appropriate error message.

### Requirement 4: Type Filtering Support

WHERE the user specifies a type argument (e.g., `ais claude list skills --diff`), the system SHALL restrict the diff table to entries matching that type only.

**Acceptance Criteria:**
- WHEN `--diff` is provided with a valid type argument, THEN the system SHALL display only entries whose type matches the specified argument.
- WHEN `--diff` is provided with an invalid type argument, THEN the system SHALL report an error listing valid types.
- WHEN `--diff` is provided without a type argument, THEN the system SHALL include entries of all types in the table.

### Requirement 5: Quiet Mode Output

WHEN the user runs `ais claude list --diff --quiet`, THEN the system SHALL output tab-separated values without column headers.

**Acceptance Criteria:**
- WHEN `--diff` and `--quiet` are both provided, THEN the system SHALL output each row as tab-separated values (Type, Name, Local status, Repo status, User status) with no header row.
- WHEN `--diff` is provided without `--quiet`, THEN the system SHALL output the table with aligned column headers.

### Requirement 6: Entry Deduplication and Merge Logic

WHILE merging entries from multiple data sources, the system SHALL ensure each (type, name) combination appears exactly once.

**Acceptance Criteria:**
- WHEN the same entry name and type appear in multiple sources (e.g., local disk, repo, and user config), THEN the system SHALL produce a single row with the correct status indicator in each column.
- WHEN an entry appears in only one source, THEN the system SHALL produce a row with `-` in the columns for the absent sources.
- The system SHALL NOT produce duplicate rows for the same (type, name) combination.

### Requirement 7: Graceful Handling When No Repo Is Configured

WHEN `--diff` is provided and no rules repository is configured, THEN the system SHALL still produce the table with the Repo column showing `-` for all entries.

**Acceptance Criteria:**
- WHEN no repo path is available, THEN the system SHALL populate the Local column from disk scan and the User column from user config, with all Repo values set to `-`.
- The system SHALL NOT throw an error due to a missing repo when `--diff` is used.

### Requirement 8: Test Coverage

The system SHALL have unit test coverage of at least 80% for all new code introduced by the list-diff feature.

**Acceptance Criteria:**
- All new functions and branches related to `--diff` mode SHALL be covered by unit tests.
- Tests SHALL verify correct merge behavior when entries overlap across sources.
- Tests SHALL verify correct status indicators for all column/status combinations (l, i, a, -).
- Tests SHALL verify mutual exclusivity validation with `--local`, `--repo`, and `--user`.
- Tests SHALL verify type filtering in diff mode.
- Tests SHALL verify quiet mode output format (tab-separated, no headers).
- Tests SHALL verify graceful handling when no repo is configured.
