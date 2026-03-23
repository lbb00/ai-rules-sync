# Tasks: Claude Type List Command & User-Level Repo Storage

- **Feature**: type-list
- **Version**: 1.0
- **Date**: 2026-03-19
- **Status**: Generated

---

## Overview

Implementation tasks for four related areas:
1. `userDefaultSourceDir` field on adapter interfaces and two Claude adapters
2. `--user` import/install bug fix in `sync-engine.ts` and `handlers.ts`
3. New `ais claude list [type] [--repo] [--user]` command
4. Test coverage for all new code paths

---

## Task List

### 1. Extend adapter interfaces with `userDefaultSourceDir` (P)

Add the optional `userDefaultSourceDir` string field to both the `SyncAdapter` interface in `src/adapters/types.ts` and the `AdapterConfig` interface in `src/adapters/base.ts`. Update `createBaseAdapter` to accept and pass through the new field verbatim.

**Requirements**: 8.4

**Sub-tasks**:

- [x] 1.1. Add `userDefaultSourceDir?: string` to the `SyncAdapter` interface in `src/adapters/types.ts`, with a JSDoc comment explaining its purpose (distinct repo path for user-level imports to prevent path collisions). (P)
- [x] 1.2. Add `userDefaultSourceDir?: string` to the `AdapterConfig` interface in `src/adapters/base.ts`. Update `createBaseAdapter` to read the field from the config object and include it in the returned `SyncAdapter` object. (P)

---

### 2. Declare `userDefaultSourceDir` on Claude adapters (P)

Configure the two Claude adapters that support user-level imports to declare their user-segregated repo paths.

**Requirements**: 8.1, 8.2, 8.3

**Sub-tasks**:

- [x] 2.1. In `src/adapters/claude-settings.ts`, add `userDefaultSourceDir: '.claude/user'` to the `createBaseAdapter` call. Confirm that the existing `defaultSourceDir: '.claude'` is unchanged. (P)
- [x] 2.2. In `src/adapters/claude-status-lines.ts`, add `userDefaultSourceDir: '.claude/user/status-lines'` to the `createBaseAdapter` call. Confirm that the existing `defaultSourceDir: '.claude/status-lines'` is unchanged. (P)

---

### 3. Fix `handleImport` to propagate `skipIgnore` from user context

In `src/commands/handlers.ts`, update `handleImport()` so that the `importOpts` object it constructs includes `skipIgnore: ctx.skipIgnore`. This single-line fix ensures that when `ctx.user === true` (which already causes `cli/register.ts` to set `ctx.skipIgnore = true`), the user-mode flag reaches `importEntry`.

**Requirements**: 6.4

**Sub-tasks**:

- [x] 3.1. Locate the `importOpts` construction block in `handleImport()` (the object assigned to a variable of type `ImportOptions`, currently around lines 456–464). Add `skipIgnore: ctx.skipIgnore` as one of its properties.
- [x] 3.2. Verify via code review that `cli/register.ts` already sets `ctx.skipIgnore = isUser` for the import action, confirming no change is needed at the CLI registration layer.

---

### 4. Fix `importEntry` and `importEntryNoCommit` to use user-mode paths

In `src/sync-engine.ts`, update the path-resolution logic in both `importEntry()` and `importEntryNoCommit()` to branch on `options.skipIgnore` for two distinct paths:
- Source path in user home: use `adapter.userTargetDir` instead of the config-resolved `targetDir` when `skipIgnore=true` and `adapter.userTargetDir` is defined.
- Destination path in repo: use `adapter.userDefaultSourceDir` instead of `defaultSourceDir` when `skipIgnore=true` and `adapter.userDefaultSourceDir` is defined.

Both functions share the same path-resolution logic and must receive the same fix to avoid divergence between single-import and batch-import user-mode paths.

**Requirements**: 6.1, 6.2, 6.3, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2

**Sub-tasks**:

- [x] 4.1. In `importEntry()`, update the `targetDirPath` computation: when `options.skipIgnore === true` and `adapter.userTargetDir` is defined, set `targetDirPath` to `adapter.userTargetDir` instead of calling `getTargetDir`. Keep existing behaviour for all other cases.
- [x] 4.2. In `importEntry()`, update the `sourceDir`/`destPath` computation: when `options.skipIgnore === true` and `adapter.userDefaultSourceDir` is defined, use `adapter.userDefaultSourceDir` instead of calling `getSourceDir`. Keep existing behaviour for all other cases.
- [x] 4.3. Apply the same two changes (4.1 and 4.2) to `importEntryNoCommit()`, which shares identical path-resolution logic.
- [x] 4.4. Confirm that the `relativePath` variable passed to `git add` and to any log output is derived from the (now possibly user-segregated) `destPath`, satisfying the requirement that git commits reference the correct user-segregated path.

---

### 5. Create `src/commands/list.ts` with `handleClaudeList`

Create a new file `src/commands/list.ts` that exports the `ListOptions`, `ListEntry`, and `ListResult` interfaces and the `handleClaudeList` async function. The function implements four modes based on the `--repo` and `--user` flag combination, with optional type filtering applied before entering any mode.

**Requirements**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 13.1, 13.2, 13.4

**Sub-tasks**:

- [x] 5.1. Define and export the three interfaces: `ListOptions` (with `type?`, `user?`, `repo?`, `quiet?` fields), `ListEntry` (with `subtype`, `name`, `installed?` fields), and `ListResult` (with `entries`, `totalCount`, `subtypeCount` fields).
- [x] 5.2. Implement type validation at the top of `handleClaudeList`: when `options.type` is set, check it against the set of registered Claude adapter subtypes; throw an `Error` with a message listing valid types if the value does not match.
- [x] 5.3. Implement Mode A (no flags): read the combined project config via `getCombinedProjectConfig(projectPath)`, extract entries under `config['claude'][subtype]` for each adapter (filtered by `options.type` if set), and return grouped `ListEntry[]`. When the config file is absent, `getCombinedProjectConfig` returns `{}`; handle this gracefully (no entries, `totalCount === 0`).
- [x] 5.4. Implement Mode B (`--user`, no `--repo`): read the user config via `getUserProjectConfig()`, apply the same extraction and grouping logic as Mode A, returning user-level entries only.
- [x] 5.5. Implement Mode C (`--repo`, no `--user`): for each adapter, resolve `sourceDir` using `getSourceDir(repoConfig, tool, subtype, adapter.defaultSourceDir)`, call `fs.readdir(join(repoPath, sourceDir))` and catch ENOENT gracefully. For each discovered entry name, cross-reference the combined project config to set `entry.installed`. Throw a descriptive error when `repoPath` itself is inaccessible so the CLI can exit with code 1.
- [x] 5.6. Implement Mode D (`--repo --user`): for each adapter, skip (with a noted omission) if `adapter.userDefaultSourceDir` is undefined. Otherwise call `fs.readdir(join(repoPath, adapter.userDefaultSourceDir))`; catch ENOENT and return an empty result for that adapter with a message. Cross-reference user config for `entry.installed`.
- [x] 5.7. Compute and return the final `ListResult` with accurate `totalCount` (total entries across all subtypes) and `subtypeCount` (number of distinct subtypes that have at least one entry).

---

### 6. Register `ais claude list` in `src/index.ts`

Add the `list` subcommand directly to the `claude` parent `Command` object. This command must not be generated by `registerAdapterCommands()` (which is per-subtype); it spans all Claude subtypes and belongs at the parent level, mirroring how `claude install` and `claude add-all` are currently registered.

**Requirements**: 5.1, 5.2, 5.3, 5.4, 12.1, 12.2, 12.3

**Sub-tasks**:

- [x] 6.1. After the existing `claude add-all` block in `src/index.ts`, register `claude.command('list [type]')` with description, `--repo` / `-r`, `--user` / `-u`, and `--quiet` options, matching the signatures defined in the design.
- [x] 6.2. In the action body, resolve the target repo using the same pattern as other claude commands (reading `program.opts()`), obtain `claudeAdapters` via `adapterRegistry.getForTool('claude')`, call `handleClaudeList(claudeAdapters, projectPath, repoPath, options)`, and call `printListResult(result, cmdOptions)`.
- [x] 6.3. Implement the `printListResult` helper (module-private, not exported) that groups entries by `subtype` with a heading per non-empty subtype, uses distinct ASCII markers for installed vs available in `--repo` mode, prints a summary line (`N entries across M types`), and outputs names-only (one per line, no decoration) when `--quiet` is set. Use chalk for colour; TTY detection is automatic via chalk.
- [x] 6.4. In the action body, catch errors thrown by `handleClaudeList` (invalid type, inaccessible repo) and print them with `console.error`, then `process.exit(1)`.

---

### 7. Write unit tests for `handleClaudeList` (P)

Create `src/__tests__/claude-list.test.ts` covering all four list modes, type filtering, empty states, and error paths. Use vitest with `vi.mock` for config reads and `fs.readdir`. Do not interact with a real filesystem or git repo.

**Requirements**: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 13.1, 13.2, 13.4

**Sub-tasks**:

- [x] 7.1. Scaffold the test file with `vi.mock` for `'../project-config.js'` (to stub `getCombinedProjectConfig`) and `'../config.js'` (to stub `getUserProjectConfig`). Stub `fs.readdir` via `vi.mock('fs-extra')` as appropriate for the project.
- [x] 7.2. Write Mode A tests: (a) entries in config returns grouped `ListEntry[]` matching all subtypes; (b) missing config file yields `totalCount === 0`; (c) `type='rules'` filter returns only rules entries; (d) `type='invalid'` throws with a message containing the valid type list.
- [x] 7.3. Write Mode B tests: (a) `--user` with entries in user.json returns user entries; (b) `--user` with empty user.json returns `totalCount === 0`; (c) `type='settings' --user` returns only settings entries.
- [x] 7.4. Write Mode C tests: (a) `--repo` with entries in repo dir sets `entry.installed` correctly based on project config; (b) `--repo` when repo path is inaccessible throws with a descriptive error.
- [x] 7.5. Write Mode D tests: (a) `--repo --user` with `userDefaultSourceDir` defined reads the correct directory; (b) `--repo --user` when adapter lacks `userDefaultSourceDir` skips adapter without throwing; (c) `--repo --user` when `userDefaultSourceDir` dir is missing returns empty for that adapter without throwing.

---

### 8. Write unit tests for `importEntry` user-mode path fix (P)

Create `src/__tests__/sync-engine-user.test.ts` to verify that `importEntry` (and `importEntryNoCommit`) use `userTargetDir` as the source path and `userDefaultSourceDir` as the destination path when `skipIgnore=true`.

**Requirements**: 6.1, 6.2, 6.3, 9.1, 9.2, 9.3, 9.4, 10.1

**Sub-tasks**:

- [x] 8.1. Mock `execa` via `vi.mock('execa', ...)` to prevent real git subprocess calls. Use `os.tmpdir()` with `fs-extra` to create temporary source files for real filesystem assertions; clean up in `afterEach`.
- [x] 8.2. Write a test: when `skipIgnore=true` and the adapter defines both `userTargetDir` and `userDefaultSourceDir`, assert that `targetPath` resolves to `join(homedir, adapter.userTargetDir, name)` and `destPath` resolves to `join(repoDir, adapter.userDefaultSourceDir, name)`. Verify the `git add` execa call receives the user-segregated relative path.
- [x] 8.3. Write a test: when `skipIgnore=true` but the adapter does not define `userDefaultSourceDir`, assert that `destPath` falls back to `join(repoDir, adapter.defaultSourceDir, name)`.
- [x] 8.4. Write a regression guard test: when `skipIgnore=false`, assert that both paths use the non-user defaults (existing behaviour is preserved).

---

### 9. Write unit tests for `handleImport` `skipIgnore` propagation (P)

Create `src/__tests__/handlers-user-import.test.ts` to verify that `handleImport` correctly passes `skipIgnore` in the `importOpts` it builds for `importEntry`.

**Requirements**: 6.4

**Sub-tasks**:

- [x] 9.1. Mock `importEntry` via `vi.mock('../sync-engine.js')` so tests can assert on the arguments it was called with. Build a minimal `ctx` and `adapter` fixture sufficient to call `handleImport`.
- [x] 9.2. Write a test: when `ctx.user=true` (and therefore `ctx.skipIgnore=true` as set by `cli/register.ts`), assert that `importEntry` is called with `importOpts.skipIgnore === true`.
- [x] 9.3. Write a test: when `ctx.user=false`, assert that `importEntry` is called with `importOpts.skipIgnore` being falsy.
- [x] 9.4. Write a test: when `ctx.skipIgnore=true` is set explicitly (independent of `ctx.user`), assert it is propagated to `importOpts` unchanged.

---

### 10. Extend existing adapter tests to verify `userDefaultSourceDir` declarations (P)

Extend (or create) the test files for `claude-settings` and `claude-status-lines` to assert that the adapters export the correct `userDefaultSourceDir` value after the changes in Task 2.

**Requirements**: 8.2, 8.3

**Sub-tasks**:

- [x] 10.1. In `src/__tests__/claude-settings.test.ts` (extend if it exists, create if not), add an assertion that the adapter object exposes `userDefaultSourceDir === '.claude/user'`.
- [x] 10.2. In `src/__tests__/claude-status-lines.test.ts` (extend if it exists, create if not), add an assertion that the adapter object exposes `userDefaultSourceDir === '.claude/user/status-lines'`.

---

### 11. Validate `--user` install behaviour requires no code change

Verify by code review that the install/link path already handles user mode correctly (`link()` in `src/adapters/base.ts` already uses `userTargetDir` when `skipIgnore=true`), and that Requirements 7.1, 7.2, and 7.3 are already satisfied without a code change. Document the finding in a code comment if the logic is non-obvious.

**Requirements**: 7.1, 7.2, 7.3

**Sub-tasks**:

- [x] 11.1. Read `src/adapters/base.ts` `link()` or equivalent symlink creation logic and confirm it branches on `userTargetDir` when `skipIgnore=true`. If it does not, implement the equivalent fix as was done for `importEntry` in Task 4.
- [x] 11.2. If no code change is needed, add a brief inline comment at the relevant branch in `base.ts` explaining the user-mode behaviour so future contributors do not accidentally remove it.

---

### 12. Export `list.ts` from `src/commands/index.ts` and run full test suite

Wire up the new `list.ts` module through the commands barrel export, confirm TypeScript compiles without errors, and run the full vitest suite to verify 80% minimum coverage is met across all changed files.

**Requirements**: 11.1, 11.2, 11.3, 12.1, 12.2, 12.3

**Sub-tasks**:

- [x] 12.1. Add an export for `handleClaudeList`, `ListOptions`, `ListEntry`, and `ListResult` from `src/commands/list.ts` through `src/commands/index.ts` (the barrel re-export file), following the existing re-export pattern in that file.
- [x] 12.2. Run `pnpm tsc --noEmit` and resolve any TypeScript type errors introduced by the new `userDefaultSourceDir` field, the updated `importOpts`, or the new `list.ts` types.
- [x] 12.3. Run `pnpm test` and confirm all new and existing tests pass. Check coverage output for `sync-engine.ts`, `handlers.ts`, `list.ts`, `claude-settings.ts`, and `claude-status-lines.ts`; address any gaps below 80%.

---

## Requirements Coverage

| Requirement | Tasks |
|---|---|
| 1.1 | 5.3, 7.2 |
| 1.2 | 5.3, 7.2 |
| 1.3 | 5.2, 5.3, 7.2 |
| 1.4 | 5.2, 7.2 |
| 2.1 | 5.4, 7.3 |
| 2.2 | 5.4, 7.3 |
| 2.3 | 5.4, 7.3 |
| 3.1 | 5.5, 7.4 |
| 3.2 | 5.5, 7.4 |
| 3.3 | 5.5, 7.4 |
| 3.4 | 5.5, 7.4 |
| 4.1 | 5.6, 7.5 |
| 4.2 | 5.6, 7.5 |
| 4.3 | 5.6, 7.5 |
| 4.4 | 5.6, 7.5 |
| 5.1 | 6.3 |
| 5.2 | 6.3 |
| 5.3 | 6.3 |
| 5.4 | 6.3 |
| 6.1 | 4.1, 8.2 |
| 6.2 | 4.1, 8.2 |
| 6.3 | 4.1, 8.2 |
| 6.4 | 3.1, 9.2 |
| 6.5 | 4.1 |
| 7.1 | 11.1 |
| 7.2 | 11.1 |
| 7.3 | 11.1 |
| 8.1 | 2.1, 2.2 |
| 8.2 | 2.1, 10.1 |
| 8.3 | 2.2, 10.2 |
| 8.4 | 1.1, 1.2 |
| 9.1 | 4.2, 8.2 |
| 9.2 | 4.2, 8.2 |
| 9.3 | 4.2, 8.2 |
| 9.4 | 4.2, 8.3 |
| 9.5 | 4.2 |
| 10.1 | 4.4, 8.2 |
| 10.2 | 4.4 |
| 11.1 | 5.3, 5.4, 5.5, 5.6, 12.1 |
| 11.2 | 6.2, 12.1 |
| 11.3 | 5.3, 12.1 |
| 12.1 | 6.1, 6.3 |
| 12.2 | 6.1 |
| 12.3 | 6.1 |
| 13.1 | 5.3, 7.2 |
| 13.2 | 5.5, 7.4 |
| 13.3 | 6.4 |
| 13.4 | 5.6, 7.5 |
