# Tasks: upstream-merge

## Task 1: Fetch Upstream and Generate Change Inventories
> Requirements: 1, 2

- [x] Fetch upstream refs from `git@github.com:lbb00/ai-rules-sync.git` without modifying local branches (`git fetch upstream`)
- [x] Generate the upstream commit inventory (`aa53caac..upstream/main`) listing each commit with hash, subject, and affected files
- [x] Classify each upstream commit by functional area: adapters, core engine, CLI, config, docs, build/packaging
- [x] Document any new upstream abstractions (purpose, files spanned, API surface changes)
- [x] Flag upstream changes to public interfaces (`SyncAdapter`, `SyncOptions`, `AdapterConfig`, adapter config shapes) as potential conflict points
- [x] Verify the fork inventory in `gap-analysis.md` is still accurate against current HEAD and update if needed
- [x] Cross-reference fork-modified files against upstream-modified files to identify high-risk conflict candidates
- [x] Write both inventories and the interface comparison to `MERGE_NOTES.md` in the project root

## Task 2: Perform Dry-Run Merge and Conflict Prediction
> Requirements: 3

- [x] Create a disposable branch `tmp/merge-dryrun` from current `main`
- [x] Execute `git merge --no-commit --no-ff upstream/main` on the disposable branch to reveal exact conflict files
- [x] Record every conflicting file path via `git diff --name-only --diff-filter=U`
- [x] Classify each conflict as trivial, mechanical, semantic, or structural per the design's category definitions
- [x] Document each conflict with file path, nature, colliding fork/upstream features, and recommended resolution strategy
- [x] Check for upstream deletions or renames of files the fork depends on (`git diff --diff-filter=DR aa53caac..upstream/main`)
- [x] Assess whether upstream's `sourceDir` format changes affect fork adapter definitions or config read/write paths
- [x] Abort the merge cleanly and delete the disposable branch, leaving `main` unmodified
- [x] Update `MERGE_NOTES.md` with the complete conflict prediction table

## Task 3: Execute Merge on Isolated Feature Branch
> Requirements: 4

- [x] Create feature branch `feat/upstream-merge-2026-03-23` from current `main` HEAD
- [x] Run `git merge --no-ff upstream/main` to initiate the merge (no rebase, no force-push, no history rewriting)
- [x] Resolve trivial conflicts first: delete `pnpm-lock.yaml` for regeneration, accept fork's `CHANGELOG.md`
- [x] Resolve `package.json` conflict: preserve fork version (`0.8.0-beta.3`), fork dependency versions, and incorporate new upstream dependencies
- [x] Resolve interface and type conflicts (`src/adapters/types.ts`, `src/adapters/base.ts`) by unioning fields from both sides, keeping fork optional fields
- [x] Resolve adapter registry conflict (`src/adapters/index.ts`) by merging both sets of imports and registrations with no duplicate names
- [x] Resolve core conflicts (`src/project-config.ts`, `src/sync-engine.ts`) preserving fork's `addUserDependency`, `removeUserDependency`, `importEntryNoCommit`, and user-mode support
- [x] Resolve handler and CLI conflicts (`src/commands/handlers.ts`, `src/commands/lifecycle.ts`, `src/cli/register.ts`) preserving fork's user-mode logic, dry-run, and command registrations while integrating upstream changes
- [x] Resolve `src/index.ts` last: accept upstream structure as base, surgically re-add all fork Claude subcommands, `list`, and `import-all` wiring
- [x] Resolve remaining low-risk conflicts (completion scripts, docs, README) by merging content from both sides
- [x] Verify no fork-added exports, adapter registrations, CLI commands, or test files were dropped during resolution
- [x] Document the resolution rationale for each conflicting file in `MERGE_NOTES.md`

## Task 4: Reconcile Interfaces and Verify API Compatibility
> Requirements: 5

- [x] Audit the merged `SyncAdapter` interface: ensure all upstream-added fields coexist with fork fields (`userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes`); update all 6 fork-added Claude adapters to conform
- [x] Audit `SyncOptions` and `AdapterConfig`: ensure upstream-added required fields are supplied at all fork call sites (`handleAdd`, `handleRemove`, `handleImport`, `import-all`, `list`, `install`); preserve `skipIgnore`
- [x] Verify `dotany` compatibility: confirm fork adapters' `dotfile.create()` and `forProject()` calls remain valid against any upstream `DotfileManager`/`DotfileComposer` expansions
- [x] Verify `sourceDir` format compatibility: confirm `getSourceDir()`, `getRepoSourceConfig()`, `buildRepoSourceFromNestedStrings()` handle any upstream format changes
- [x] Check for renamed or removed upstream functions that fork code imports (`importEntryNoCommit`, `addUserDependency`, `removeUserDependency`, `getUserConfigPath`, `getUserProjectConfig`, `dotfile`, `DotfileManager`, `RepoResolverFn`) and adapt fork references to new names

## Task 5: Verify Build and Type Safety
> Requirements: 6

- [x] Regenerate the lockfile with `pnpm install` from the merged `package.json`
- [x] Run `npx tsc --noEmit` and confirm zero type errors
- [x] Run `npm run build` and confirm the build succeeds with `dist/` populated
- [x] If type check or build fails, fix compilation errors without using `as any` or `@ts-ignore`, document each fix in `MERGE_NOTES.md`, and repeat until clean

## Task 6: Verify Test Suite Integrity
> Requirements: 7

- [x] Run `npx vitest run` and confirm every test passes
- [x] Compare post-merge test count against the pre-merge baseline (466 tests) and report differences (added, removed, newly failing)
- [x] Investigate and fix any failing tests rather than skipping, disabling, or marking as expected-to-fail; document fixes in `MERGE_NOTES.md`
- [x] Verify any new upstream test files are included in the test run and pass
- [x] Run `npx vitest run --coverage` and confirm coverage does not drop below 80%

## Task 7: Perform Functional Smoke Tests
> Requirements: 8

- [x] Verify `node dist/index.js --version` outputs a valid version string (expected `0.8.0-beta.3` or higher)
- [x] Verify all fork-added subcommands appear in CLI help output: `claude list`, `claude import-all`, `claude settings`, `claude status-lines`, `claude agent-memory`, `claude rules`, `claude commands`, `claude agents`, `claude skills`, `claude md`
- [x] Verify upstream-added subcommands or options (`init --only`, `init --exclude`, wildcard config patterns) are registered and appear in help output
- [x] If any fork command is missing from help output, treat as blocker: fix the registration in `src/index.ts` before proceeding

## Task 8: Finalize Merge Documentation and Commit
> Requirements: 9

- [x] Finalize `MERGE_NOTES.md` with: upstream commit range (`aa53caac..{upstream-HEAD}`), every conflict encountered, resolution rationale for each, interface changes from Task 4, and type/test fixes from Tasks 5-6
- [x] List any upstream features not yet integrated into fork workflows (e.g., `init --only`/`--exclude`, wildcard patterns, new `dotany` capabilities) as follow-up items in `MERGE_NOTES.md`
- [x] Compose the merge commit message referencing the upstream commit range per the design template
- [x] Stage all changes and create a single merge commit (not squashed) preserving both parents for clean revertability
- [x] Do NOT modify `CHANGELOG.md` -- changelog entries are managed via changesets

## Task 9: Push Feature Branch and Create Pull Request
> Requirements: 10

- [x] Push `feat/upstream-merge-2026-03-23` to `origin` (do NOT push to `main`)
- [x] Create a pull request with the description containing: upstream commit range, conflict resolution summary from `MERGE_NOTES.md`, test results (pass count, coverage percentage), and follow-up items
- [x] Verify the merge commit has two parents (`git log --oneline -1 --format=%P`) confirming it can be reverted via `git revert -m 1`
- [x] Do NOT delete the merge branch until the PR is approved and merged to `main`
