# Requirements: upstream-merge

## Project Description
We need to investigate the changes made upstream, understand our forward development work in this fork and make a solid plan for safely merging upstream progress without sacrificing our own.

## Requirements

### Requirement 1: Pre-Merge Investigation -- Upstream Change Analysis

The merge agent SHALL produce a written inventory of all upstream commits between the common ancestor (`aa53caac`) and the current upstream HEAD, grouped by functional area (adapters, core engine, CLI, config, docs, build/packaging).

**Acceptance Criteria:**

1.1. WHEN the merge process begins, THEN the merge agent SHALL fetch the latest upstream refs from `git@github.com:lbb00/ai-rules-sync.git` without modifying any local branches.

1.2. WHEN generating the upstream inventory, THEN the merge agent SHALL list each upstream commit with its hash, subject, and the files it touches.

1.3. The merge agent SHALL classify upstream changes into at least these categories: new features, refactors, bug fixes, dependency updates, documentation changes, and breaking changes.

1.4. WHEN an upstream change introduces a new abstraction (e.g., `dotany`, `sourceDir` object format, wildcard config), THEN the merge agent SHALL document the abstraction's purpose, the files it spans, and any API surface changes it creates.

1.5. WHEN an upstream change modifies a public interface (`SyncAdapter`, `SyncOptions`, adapter config shapes), THEN the merge agent SHALL flag it as a potential conflict point with fork extensions.

---

### Requirement 2: Pre-Merge Investigation -- Fork Forward-Development Inventory

The merge agent SHALL produce a written inventory of all fork-only commits between the common ancestor and the current fork HEAD, highlighting every extension and divergence from upstream.

**Acceptance Criteria:**

2.1. The merge agent SHALL enumerate all fork-only commits with hash, subject, and affected files.

2.2. The merge agent SHALL identify and document each fork-only feature: new adapters (`claude-settings`, `claude-status-lines`), new commands (`list`, `import-all`), `agents-md` adapter improvements, user-import/user-mode support, and macOS case-sensitivity fixes.

2.3. WHEN a fork commit modifies a file that upstream also modified, THEN the merge agent SHALL flag that file as a high-risk conflict candidate.

2.4. The merge agent SHALL document any fork changes to shared interfaces (`SyncAdapter`, `SyncOptions`, `base.ts` factory, `handlers.ts`) that upstream may also have changed.

---

### Requirement 3: Conflict Prediction and Risk Assessment

The merge agent SHALL produce a conflict prediction report before attempting any merge operation.

**Acceptance Criteria:**

3.1. The merge agent SHALL perform a dry-run merge (e.g., `git merge --no-commit --no-ff`) on a disposable branch to identify exact conflict files, then abort cleanly without modifying the working tree of any real branch.

3.2. WHEN a conflict is detected, THEN the merge agent SHALL classify it as one of: trivial (version bumps, changelogs), mechanical (both sides edited the same file in non-overlapping regions), semantic (both sides changed the same logic or interface), or structural (one side reorganized files the other side also changed).

3.3. For each predicted conflict, the merge agent SHALL document: the file path, the nature of the conflict, which fork feature and which upstream feature collide, and a recommended resolution strategy.

3.4. The merge agent SHALL identify any upstream deletions or renames of files that the fork still depends on.

3.5. The merge agent SHALL assess whether upstream's `sourceDir` object format change affects the fork's adapter definitions or config read/write paths.

---

### Requirement 4: Merge Execution on an Isolated Branch

The merge agent SHALL perform the actual merge on a dedicated feature branch, never on `main` directly.

**Acceptance Criteria:**

4.1. WHEN the merge is initiated, THEN the merge agent SHALL create a new branch named `feat/upstream-merge-<date>` from the current `main` HEAD.

4.2. The merge agent SHALL NOT force-push, rebase, or use any history-rewriting operation at any point during the merge.

4.3. WHEN a merge conflict occurs in `CHANGELOG.md` or `pnpm-lock.yaml`, THEN the merge agent SHALL resolve it by accepting the fork's version and regenerating the lockfile afterward.

4.4. WHEN a merge conflict occurs in `package.json`, THEN the merge agent SHALL preserve the fork's version number (`0.8.0-beta.3` or higher) and the fork's dependency versions, while incorporating any new upstream dependencies.

4.5. WHEN a merge conflict occurs in a source file (e.g., `src/adapters/agents-md.ts`), THEN the merge agent SHALL preserve all fork-added functionality while integrating upstream's structural changes, and SHALL document the resolution rationale in the commit message or a merge notes file.

4.6. The merge agent SHALL NOT silently drop any fork-added exports, adapter registrations, CLI commands, or test files during conflict resolution.

---

### Requirement 5: Interface and API Compatibility

The merge agent SHALL ensure that all fork extensions remain functional after incorporating upstream changes.

**Acceptance Criteria:**

5.1. WHEN upstream changes the `SyncAdapter` interface, THEN the merge agent SHALL update all fork-added adapters (`claude-settings`, `claude-status-lines`, enhanced `agents-md`) to conform to the new interface while retaining their fork-specific fields (`userTargetDir`, `userDefaultSourceDir`, `skipIgnore` support).

5.2. WHEN upstream introduces a new required field on `SyncOptions` or adapter config, THEN the merge agent SHALL ensure all fork call sites supply the new field with correct values.

5.3. WHEN upstream introduces the `dotany` abstraction layer, THEN the merge agent SHALL verify that fork adapters either integrate with `dotany` or remain compatible as standalone adapters without breaking the adapter registry.

5.4. WHEN upstream changes the `sourceDir` from a string to an object format, THEN the merge agent SHALL update all fork code that reads or writes `sourceDir` to handle the new format.

5.5. IF upstream removes or renames a function that fork code depends on, THEN the merge agent SHALL NOT delete the fork's usage but instead adapt it to the new upstream API.

---

### Requirement 6: Post-Merge Verification -- Build and Type Safety

The merge agent SHALL verify that the merged codebase compiles and passes type checking.

**Acceptance Criteria:**

6.1. WHEN the merge is complete, THEN the merge agent SHALL run `pnpm install` to regenerate the lockfile from the merged `package.json`.

6.2. WHEN `pnpm install` completes, THEN the merge agent SHALL run `npx tsc --noEmit` and confirm zero type errors.

6.3. WHEN `npx tsc --noEmit` completes, THEN the merge agent SHALL run `npm run build` and confirm the build succeeds with no errors.

6.4. IF the build or type check fails, THEN the merge agent SHALL NOT proceed to test verification but SHALL fix the compilation errors first and document what was fixed.

---

### Requirement 7: Post-Merge Verification -- Test Suite Integrity

The merge agent SHALL verify that all tests pass after the merge, with no regressions.

**Acceptance Criteria:**

7.1. WHEN the build verification passes, THEN the merge agent SHALL run `npx vitest run` and confirm that every test passes.

7.2. The merge agent SHALL compare the post-merge test count against the pre-merge baseline (466 tests) and report any difference (tests added by upstream, tests removed, tests newly failing).

7.3. WHEN any test fails after the merge, THEN the merge agent SHALL investigate and fix the failure rather than skipping, disabling, or marking the test as expected-to-fail.

7.4. WHEN upstream introduces new test files, THEN the merge agent SHALL ensure they are included in the test run and pass.

7.5. The merge agent SHALL run tests with coverage (`npx vitest run --coverage`) and confirm coverage does not drop below 80%.

---

### Requirement 8: Post-Merge Verification -- Functional Smoke Tests

The merge agent SHALL verify that key CLI commands still work correctly after the merge.

**Acceptance Criteria:**

8.1. WHEN all unit tests pass, THEN the merge agent SHALL verify that `node dist/index.js --version` outputs a valid version string.

8.2. WHEN the CLI loads, THEN the merge agent SHALL verify that all fork-added subcommands (`claude list`, `claude import-all`, `claude settings`, `claude status-lines`) are registered and appear in help output.

8.3. WHEN the CLI loads, THEN the merge agent SHALL verify that all upstream-added subcommands or options (`init --only`, `init --exclude`, wildcard config patterns) are registered and appear in help output.

8.4. IF any fork command is missing from help output after the merge, THEN the merge agent SHALL treat this as a blocker and fix the registration before proceeding.

---

### Requirement 9: Merge Documentation and Traceability

The merge agent SHALL produce documentation of the merge for future reference.

**Acceptance Criteria:**

9.1. The merge agent SHALL create or update a merge notes file documenting: the upstream commit range merged, every conflict encountered, and how each conflict was resolved.

9.2. The merge commit message SHALL reference the upstream commit range (e.g., `merge upstream aa53caac..{upstream-HEAD}`).

9.3. WHEN the merge introduces upstream features not yet integrated into fork workflows, THEN the merge agent SHALL list them as follow-up items in the merge notes.

9.4. The merge agent SHALL NOT modify `CHANGELOG.md` with merge details -- changelog entries are managed separately via changesets.

---

### Requirement 10: Rollback Safety

The merge agent SHALL ensure the merge can be cleanly reverted if problems are discovered later.

**Acceptance Criteria:**

10.1. The merge agent SHALL perform the merge as a single merge commit (not squashed) so that `git revert -m 1 <merge-commit>` can cleanly undo it.

10.2. WHILE the merge branch has not been approved and merged to `main` via PR, the merge agent SHALL NOT delete the merge branch.

10.3. The merge agent SHALL NOT push directly to `main` -- the merge branch SHALL be submitted as a pull request for review.

10.4. WHEN creating the PR, THEN the merge agent SHALL include the conflict resolution summary and test results in the PR description.
