# Technical Design: upstream-merge

## 1. Overview

This design specifies the merge strategy, conflict resolution procedures, and verification protocol for incorporating upstream changes from `lbb00/ai-rules-sync` (remote `upstream`, commit range `aa53caac..6b562a3`) into the SoftwareCats fork, while preserving all fork-only features, adapters, and interface extensions.

This is not a feature build -- it is a controlled merge operation. The design addresses architectural decisions about conflict resolution order, interface reconciliation, and verification sequencing rather than component construction.

### 1.1 Requirements Traceability

| Requirement | Design Section |
|------------|----------------|
| 1 (Upstream Change Analysis) | 3.1 Phase 1: Investigation |
| 2 (Fork Forward-Development Inventory) | 3.1 Phase 1: Investigation |
| 3 (Conflict Prediction & Risk Assessment) | 3.2 Phase 2: Dry-Run Merge |
| 4 (Merge Execution on Isolated Branch) | 3.3 Phase 3: Merge Execution |
| 5 (Interface & API Compatibility) | 3.4 Phase 4: Interface Reconciliation |
| 6 (Build & Type Safety Verification) | 3.5 Phase 5: Build Verification |
| 7 (Test Suite Integrity) | 3.6 Phase 6: Test Verification |
| 8 (Functional Smoke Tests) | 3.7 Phase 7: Smoke Tests |
| 9 (Merge Documentation) | 3.8 Phase 8: Documentation |
| 10 (Rollback Safety) | 3.9 Phase 9: PR Submission |

---

## 2. Merge Context

### 2.1 Upstream State

- **Remote**: `git@github.com:lbb00/ai-rules-sync.git` (remote name `upstream`)
- **Common ancestor**: `aa53caac` (approximately v0.5.0, containing `dotany`, Warp, Gemini CLI, Codex, Copilot skills)
- **Upstream HEAD**: `6b562a3` (unpublished beyond npm `0.4.0`; git HEAD is significantly ahead)
- **Supported tools (upstream README)**: Cursor, Claude Code, Copilot, OpenCode, Trae AI, Codex, Gemini CLI, Warp -- matching the fork's tool set

### 2.2 Fork State

- **Fork HEAD**: `b0386f8` (current `main`)
- **Fork version**: `0.8.0-beta.3`
- **Fork-only commits**: 11 commits since `aa53caac`
- **Fork-only features**: 6 new Claude adapters, 2 new commands (`import-all`, `list`), user-mode support, hybrid mode fixes, interface extensions (`userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes`, `skipIgnore`)

### 2.3 Key Architectural Differences

The fork extended the upstream architecture in several structural dimensions:

| Dimension | Upstream (at fork point) | Fork Extensions |
|-----------|-------------------------|-----------------|
| Adapter modes | `file`, `directory` | Added `hybrid` mode |
| User-mode support | None | `userTargetDir`, `userDefaultSourceDir`, `skipIgnore` |
| Claude subtypes | `skills`, `agents`, `md` | Added `commands`, `rules`, `status-lines`, `agent-memory`, `settings` |
| Batch operations | `add-all` | Added `import-all` with single-commit batching |
| Introspection | None | `list` command with 4 modes (A/B/C/D) |
| `SyncAdapter` interface | Base fields only | Extended with 4 optional fields |
| `AdapterConfig` | Base fields only | Extended to mirror `SyncAdapter` extensions |

### 2.4 `sourceDir` Format Compatibility

The upstream's `sourceDir` configuration uses the object format `{ [tool]: { [subtype]: string } }`. The fork's `SourceDirConfig` interface uses the identical shape: `{ [tool: string]: Record<string, string> | undefined }`. No structural incompatibility is expected for this configuration format. The fork's `getSourceDir()`, `getRepoSourceConfig()`, and `buildRepoSourceFromNestedStrings()` functions already handle this shape correctly.

---

## 3. Phased Execution Design

The merge is structured as 9 sequential phases. Each phase has explicit entry criteria, actions, exit criteria, and rollback instructions. No phase may proceed until the previous phase's exit criteria are met.

### 3.1 Phase 1: Investigation (Requirements 1, 2)

**Entry criteria**: Clean working tree on `main`. Upstream remote configured.

**Actions**:

1. **Fetch upstream refs**:
   ```
   git fetch upstream
   ```
   This updates `refs/remotes/upstream/main` without modifying any local branches (1.1).

2. **Generate upstream commit inventory**:
   ```
   git log --oneline --stat aa53caac..upstream/main
   ```
   Produces the commit-by-commit inventory with hashes, subjects, and file-level diffs (1.2).

3. **Classify upstream commits** by functional area (1.3):
   - **Adapters**: New adapter files in `src/adapters/`, registrations in `src/adapters/index.ts`
   - **Core engine**: Changes to `src/sync-engine.ts`, `src/project-config.ts`, `src/config.ts`
   - **CLI**: Changes to `src/index.ts`, `src/cli/register.ts`, `src/commands/`
   - **Config**: Changes to config schemas, `sourceDir` format
   - **Docs**: `README.md`, `README_ZH.md`, `docs/`, `KNOWLEDGE_BASE.md`
   - **Build/packaging**: `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `.changeset/`

4. **Document new upstream abstractions** (1.4): For each new file, directory, or export in upstream that did not exist at `aa53caac`, document purpose, files spanned, and API surface.

5. **Flag public interface changes** (1.5): Compare upstream's `SyncAdapter`, `SyncOptions`, `AdapterConfig`, `AdapterRegistry` against the fork's current versions. Note any fields added, removed, renamed, or re-typed.

6. **Generate fork inventory** (2.1-2.4): Already documented in the gap analysis. Verify the gap analysis is still accurate against current HEAD.

7. **Cross-reference conflict candidates** (2.3): For each fork-modified file, check whether upstream also modified it by inspecting the upstream diff stat.

**Exit criteria**: Two inventories (upstream and fork) are complete. High-risk conflict files are identified. Interface change comparison is documented. All output is written to a merge notes file.

**Artifacts**: `MERGE_NOTES.md` (created in project root, committed with the merge).

---

### 3.2 Phase 2: Dry-Run Merge (Requirement 3)

**Entry criteria**: Phase 1 complete. Inventories written.

**Actions**:

1. **Create disposable branch**:
   ```
   git checkout -b tmp/merge-dryrun
   ```

2. **Execute dry-run merge** (3.1):
   ```
   git merge --no-commit --no-ff upstream/main
   ```
   This reveals exact conflict files without completing the merge.

3. **Record conflict list**:
   ```
   git diff --name-only --diff-filter=U
   ```
   Captures every file with unresolved conflicts.

4. **Classify each conflict** (3.2) into one of four categories:

   | Category | Definition | Examples |
   |----------|-----------|----------|
   | **Trivial** | Version bumps, changelogs, lockfiles | `package.json` version field, `CHANGELOG.md`, `pnpm-lock.yaml` |
   | **Mechanical** | Both sides edited same file in non-overlapping regions | New adapter imports added at different positions in `src/adapters/index.ts` |
   | **Semantic** | Both sides changed same logic or interface | `SyncAdapter` interface extensions, `src/commands/handlers.ts` handler signatures |
   | **Structural** | One side reorganized files the other also changed | File renames, directory restructuring of shared modules |

5. **Document each conflict** (3.3): File path, nature, which fork feature and upstream feature collide, recommended resolution.

6. **Check for upstream deletions/renames** (3.4):
   ```
   git diff --diff-filter=DR aa53caac..upstream/main --name-only
   ```
   Cross-reference against fork imports listed in gap analysis section 3.3 (Deletion/Rename Risks).

7. **Assess `sourceDir` format impact** (3.5): Compare upstream's `src/project-config.ts` and related files against fork versions. Since both use the same `{ [tool]: Record<string, string> }` shape, verify no breaking structural change.

8. **Abort and clean up**:
   ```
   git merge --abort
   git checkout main
   git branch -D tmp/merge-dryrun
   ```

**Exit criteria**: Conflict prediction report complete with category, resolution strategy, and risk level for every conflict file. No modification to `main` or any real branch. `MERGE_NOTES.md` updated with conflict prediction table.

---

### 3.3 Phase 3: Merge Execution (Requirement 4)

**Entry criteria**: Phase 2 complete. Conflict prediction report approved.

**Actions**:

1. **Create merge branch** (4.1):
   ```
   git checkout -b feat/upstream-merge-2026-03-23 main
   ```

2. **Execute merge** (4.2):
   ```
   git merge --no-ff upstream/main
   ```
   No force-push, rebase, or history-rewriting operations at any point.

3. **Resolve conflicts in dependency order** -- from least-dependent to most-dependent:

   **Resolution Order**:

   | Order | File(s) | Strategy | Rationale |
   |-------|---------|----------|-----------|
   | 1 | `pnpm-lock.yaml` | Delete; will regenerate | Per requirement 4.3 |
   | 2 | `CHANGELOG.md` | Accept fork version | Per requirement 4.3; changelog managed via changesets (9.4) |
   | 3 | `package.json` | Preserve fork version `0.8.0-beta.3`, fork dep versions; incorporate new upstream deps | Per requirement 4.4 |
   | 4 | `src/adapters/types.ts` | Union of both sides' fields; fork fields are all optional so additive | Interface must be settled before adapter files |
   | 5 | `src/adapters/base.ts` | Mirror `types.ts` changes in `AdapterConfig`; preserve fork factory extensions | Factory must match interface |
   | 6 | `src/adapters/index.ts` | Merge both sets of adapter imports and registrations; verify no duplicate `name` values | Registry must include all adapters from both sides |
   | 7 | `src/project-config.ts` | Preserve fork's dynamic config types, `addUserDependency`, `removeUserDependency`; integrate upstream changes | Config layer must be stable before engine/handlers |
   | 8 | `src/sync-engine.ts` | Preserve fork's `importEntryNoCommit`, user-mode support; integrate upstream engine changes | Engine depends on config and types |
   | 9 | `src/commands/handlers.ts` | Preserve fork's user-mode logic, `CommandContext.skipIgnore`, dry-run; integrate upstream handler changes | Handlers depend on engine and types |
   | 10 | `src/commands/lifecycle.ts` | Integrate upstream `init --only`/`--exclude` options if present; preserve fork's existing `InitOptions` | New upstream features |
   | 11 | `src/cli/register.ts` | Preserve fork's `import-all` registration, user flags; integrate upstream registration changes | CLI depends on handlers |
   | 12 | `src/index.ts` | Accept upstream structure as base; re-add all fork-specific sections (Claude subcommands, list, import-all wiring) | Highest-risk file; depends on everything else |
   | 13 | `src/completion/scripts.ts` | Merge completion metadata from both sides | Low risk |
   | 14 | `docs/supported-tools.json` | Merge tool entries from both sides | Low risk |
   | 15 | `README.md`, `README_ZH.md` | Accept fork version; integrate upstream doc improvements selectively | Low risk |

4. **Preserve fork integrity** (4.5, 4.6): At each resolution step, verify:
   - No fork-added exports are dropped
   - No fork adapter registrations are removed
   - No fork CLI commands are unregistered
   - No fork test files are deleted
   - Resolution rationale is documented per file

**Exit criteria**: All conflicts resolved. `git status` shows no unmerged files. Working tree is dirty only with resolved conflict markers and staged changes.

---

### 3.4 Phase 4: Interface Reconciliation (Requirement 5)

**Entry criteria**: Phase 3 conflicts resolved. Files staged but not committed.

This phase handles semantic compatibility that goes beyond textual merge conflicts.

**Actions**:

1. **`SyncAdapter` interface audit** (5.1):
   - If upstream added new fields to `SyncAdapter`, add them to the fork's version alongside the fork's optional fields (`userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes`)
   - Verify all 6 fork-added Claude adapters (`claude-commands`, `claude-rules`, `claude-settings`, `claude-status-lines`, `claude-agent-memory`, enhanced `claude-agents`) conform to the merged interface
   - Each fork adapter must retain its fork-specific fields

2. **`SyncOptions` / `AdapterConfig` audit** (5.2):
   - If upstream added new required fields to `SyncOptions`, update all fork call sites (`handleAdd`, `handleRemove`, `handleImport`, `import-all`, `list`, `install`)
   - `skipIgnore` must remain on `SyncOptions` for user-mode support

3. **`dotany` compatibility** (5.3):
   - If upstream expanded `DotfileManager`, `DotfileComposer`, or their types, verify fork adapters' `forProject()` calls remain valid
   - Fork adapters use `dotfile.create()` with `GitRepoSource` and `AiRulesSyncManifest`; verify these plugin classes still conform to upstream's `dotany` types

4. **`sourceDir` format** (5.4):
   - Both sides use `{ [tool]: Record<string, string> }` for `sourceDir`
   - Verify `getSourceDir()`, `getRepoSourceConfig()`, `buildRepoSourceFromNestedStrings()` handle any upstream changes to the format
   - Verify the `SourceDirConfig` interface is compatible

5. **Renamed/removed function check** (5.5):
   - If upstream renamed `unlinkEntry`, `importEntry`, `linkEntry`, or any function the fork imports, update fork import sites to use the new names
   - Critical fork imports to verify:
     - `importEntryNoCommit` from `sync-engine.ts`
     - `addUserDependency`, `removeUserDependency` from `project-config.ts`
     - `getUserConfigPath`, `getUserProjectConfig` from `config.ts`
     - `dotfile`, `DotfileManager` from `dotany/index.ts`
     - `RepoResolverFn` from `dotany/types.ts`

**Exit criteria**: All adapter files type-check against the merged interface. All fork imports resolve to valid exports. No `any` types introduced to paper over incompatibilities.

---

### 3.5 Phase 5: Build Verification (Requirement 6)

**Entry criteria**: Phase 4 complete. All interface reconciliation done.

**Actions**:

1. **Regenerate lockfile** (6.1):
   ```
   pnpm install
   ```

2. **Type check** (6.2):
   ```
   npx tsc --noEmit
   ```
   Must produce zero errors.

3. **Build** (6.3):
   ```
   npm run build
   ```
   Must succeed with no errors.

4. **Fix-loop** (6.4): If type check or build fails:
   - Identify the failing file and error
   - Fix the type error (do not use `as any` or `@ts-ignore`)
   - Re-run type check
   - Document the fix in `MERGE_NOTES.md`
   - Repeat until clean

**Exit criteria**: `npx tsc --noEmit` exits 0. `npm run build` exits 0. `dist/` directory contains compiled output.

---

### 3.6 Phase 6: Test Verification (Requirement 7)

**Entry criteria**: Phase 5 complete. Build succeeds.

**Actions**:

1. **Run full test suite** (7.1):
   ```
   npx vitest run
   ```
   Every test must pass.

2. **Compare test count** (7.2): Pre-merge baseline is 466 tests. Report:
   - Tests added by upstream (new test files)
   - Tests removed (should be zero)
   - Tests newly failing (must be zero after fixes)

3. **Fix failing tests** (7.3): For each failure:
   - Investigate root cause (interface change, missing mock, renamed import)
   - Fix the test or the source code
   - Do NOT skip, disable, or mark as expected-to-fail
   - Document the fix in `MERGE_NOTES.md`

4. **Include upstream tests** (7.4): Verify any new test files from upstream are included in the test run and pass.

5. **Coverage check** (7.5):
   ```
   npx vitest run --coverage
   ```
   Coverage must not drop below 80%.

**Exit criteria**: All tests pass. Test count is documented. Coverage >= 80%.

---

### 3.7 Phase 7: Smoke Tests (Requirement 8)

**Entry criteria**: Phase 6 complete. All tests pass.

**Actions**:

1. **Version output** (8.1):
   ```
   node dist/index.js --version
   ```
   Must output a valid version string (expected: `0.8.0-beta.3` or higher).

2. **Fork command registration** (8.2): Verify these subcommands appear in help output:
   - `claude list`
   - `claude import-all` (if wired as Claude subcommand) or `import-all` (if top-level)
   - `claude settings`
   - `claude status-lines`
   - `claude agent-memory`
   - `claude rules`
   - `claude commands`
   - `claude agents`
   - `claude skills`
   - `claude md`

3. **Upstream command registration** (8.3): Verify upstream-added features are registered:
   - `init --only` and `init --exclude` options (if upstream added them)
   - Any wildcard config patterns
   - Any new tool commands

4. **Missing command blocker** (8.4): If any fork command is missing from help output, treat as a blocker. Fix the registration in `src/index.ts` before proceeding.

**Exit criteria**: All expected commands present in CLI help output. Version string valid. No missing registrations.

---

### 3.8 Phase 8: Documentation (Requirement 9)

**Entry criteria**: Phases 5-7 pass.

**Actions**:

1. **Create/finalize `MERGE_NOTES.md`** (9.1) with:
   - Upstream commit range: `aa53caac..{upstream-HEAD-hash}`
   - Every conflict encountered during Phase 3
   - How each conflict was resolved and why
   - Any interface changes made during Phase 4
   - Any type/test fixes made during Phases 5-6

2. **Compose merge commit message** (9.2):
   ```
   merge upstream aa53caac..6b562a3

   Integrates upstream changes while preserving all fork-only features:
   - 6 Claude adapters (commands, rules, settings, status-lines, agent-memory, agents)
   - import-all and list commands
   - User-mode support (userTargetDir, userDefaultSourceDir, skipIgnore)
   - Hybrid mode support

   See MERGE_NOTES.md for conflict resolution details.
   ```

3. **List follow-up items** (9.3): If upstream introduced features not yet integrated into fork workflows (e.g., `init --only`/`--exclude`, wildcard patterns, new `dotany` capabilities), list them as follow-up items in `MERGE_NOTES.md`.

4. **Do not modify CHANGELOG.md** (9.4): Changelog entries are managed separately via changesets.

5. **Commit the merge**:
   ```
   git add -A
   git commit
   ```
   Uses the merge commit message from step 2. This produces a single merge commit (not squash), preserving the merge parent (10.1).

**Exit criteria**: `MERGE_NOTES.md` is complete and committed. Merge commit has the correct message and two parents.

---

### 3.9 Phase 9: PR Submission (Requirement 10)

**Entry criteria**: Phase 8 complete. Single merge commit on feature branch.

**Actions**:

1. **Push feature branch** (10.3):
   ```
   git push origin feat/upstream-merge-2026-03-23
   ```
   Do NOT push to `main`.

2. **Create PR** (10.4) with description containing:
   - Upstream commit range
   - Conflict resolution summary (from `MERGE_NOTES.md`)
   - Test results (pass count, coverage percentage)
   - Follow-up items

3. **Preserve branch** (10.2): Do NOT delete the merge branch until the PR is approved and merged.

4. **Revert path** (10.1): Since the merge is a single merge commit (not squashed), it can be cleanly reverted via:
   ```
   git revert -m 1 <merge-commit-hash>
   ```

**Exit criteria**: PR created. Branch pushed. Merge branch intact. Review requested.

---

## 4. Conflict Resolution Decision Matrix

This matrix provides deterministic resolution rules for each conflict category and file type. The merge executor follows this matrix rather than making ad-hoc decisions.

### 4.1 File-Specific Resolution Rules

| File | Conflict Category | Resolution Rule |
|------|------------------|-----------------|
| `CHANGELOG.md` | Trivial | Accept fork version entirely |
| `pnpm-lock.yaml` | Trivial | Delete file; regenerate via `pnpm install` after all source conflicts resolved |
| `package.json` | Trivial/Mechanical | Keep fork `version` (`0.8.0-beta.3`); keep fork dep versions where higher; add any new upstream deps not present in fork |
| `README.md` / `README_ZH.md` | Mechanical | Accept fork version as base; cherry-pick upstream doc improvements for new tools/features only |
| `docs/supported-tools.json` | Mechanical | Union of both sides' tool entries; no duplicates |
| `src/adapters/types.ts` | Semantic | Union of interface fields from both sides; all fork fields remain optional; upstream required fields adopted as required |
| `src/adapters/base.ts` | Semantic | Mirror `types.ts` union in `AdapterConfig`; preserve fork's `userTargetDir`/`userDefaultSourceDir`/`hybridFileSuffixes` passthrough |
| `src/adapters/index.ts` | Mechanical | Union of adapter imports and registrations from both sides; verify no duplicate `name` values; maintain fork registration order for Claude adapters |
| `src/project-config.ts` | Semantic | Preserve fork's `addUserDependency`, `removeUserDependency`, dynamic `SourceDirConfig`; integrate upstream changes to `getSourceDir`, `getRepoSourceConfig` |
| `src/sync-engine.ts` | Semantic | Preserve fork's `importEntryNoCommit`, user-mode `importEntry` overload; integrate upstream engine changes |
| `src/commands/handlers.ts` | Semantic | Preserve fork's `CommandContext.skipIgnore`, `AddOptions.user`, user-mode logic; integrate upstream handler changes |
| `src/commands/lifecycle.ts` | Mechanical | Integrate upstream's `--only`/`--exclude` options into `InitOptions`; preserve fork's existing interface |
| `src/cli/register.ts` | Mechanical | Preserve fork's `import-all` registration, `--user` flags; integrate upstream registration changes |
| `src/index.ts` | Structural | Accept upstream's structure for non-Claude sections; re-integrate all fork Claude subcommands, `list`, `import-all` wiring. Verify every `registerAdapterCommands()` call and every `.command()` registration |
| `src/completion/scripts.ts` | Mechanical | Union of completion metadata from both sides |

### 4.2 Interface Field Preservation Rules

These fields MUST survive the merge. If upstream renamed or removed any of them, the fork's usage must be adapted to the new upstream API -- not deleted.

| Interface | Fork Field | Type | Used By |
|-----------|-----------|------|---------|
| `SyncAdapter` | `userTargetDir` | `string?` | `base.ts` factory, `claude-settings.ts`, `claude-status-lines.ts` |
| `SyncAdapter` | `userDefaultSourceDir` | `string?` | `base.ts` factory, `claude-settings.ts`, `claude-status-lines.ts` |
| `SyncAdapter` | `hybridFileSuffixes` | `string[]?` | `base.ts` factory, `claude-commands.ts`, `claude-rules.ts`, `claude-agents.ts` |
| `SyncOptions` | `skipIgnore` | `boolean?` | `handlers.ts`, `sync-engine.ts`, `base.ts` link method |
| `CommandContext` | `user` | `boolean?` | `handlers.ts` user-mode routing |
| `CommandContext` | `skipIgnore` | `boolean?` | `handlers.ts` user-mode routing |
| `AddOptions` | `user` | `boolean?` | `handlers.ts` user-mode routing |
| `AdapterConfig` | `userTargetDir` | `string?` | `base.ts` factory |
| `AdapterConfig` | `userDefaultSourceDir` | `string?` | `base.ts` factory |
| `AdapterConfig` | `hybridFileSuffixes` | `string[]?` | `base.ts` factory |

### 4.3 Fork-Only Files (No-Conflict Expected)

These files exist only in the fork. They should survive the merge cleanly with no manual intervention. If any of these files shows a conflict, it indicates upstream independently created a file with the same path -- which requires a semantic merge.

| File | Fork Feature |
|------|-------------|
| `src/adapters/claude-commands.ts` | Claude commands adapter |
| `src/adapters/claude-settings.ts` | Claude settings adapter |
| `src/adapters/claude-status-lines.ts` | Claude status-lines adapter |
| `src/adapters/claude-agent-memory.ts` | Claude agent-memory adapter |
| `src/commands/import-all.ts` | Import-all batch command |
| `src/commands/list.ts` | Multi-mode list command |
| `src/commands/version.ts` | Formatted version output |
| `src/__tests__/claude-settings.test.ts` | Settings adapter tests |
| `src/__tests__/claude-status-lines.test.ts` | Status-lines adapter tests |
| `src/__tests__/claude-commands.test.ts` | Commands adapter tests |
| `src/__tests__/claude-rules.test.ts` | Rules adapter tests |
| `src/__tests__/claude-list.test.ts` | List command tests |
| `src/__tests__/handlers-user-import.test.ts` | User import tests |

**Critical exception**: If upstream also created `claude-commands.ts`, `claude-rules.ts`, or `claude-agents.ts` (likely given the upstream README lists Claude Code support), a **semantic conflict** exists even if git reports no textual conflict. In this case:
- Compare implementations
- Prefer fork's `hybrid` mode over upstream's likely `file` or `directory` mode
- Preserve fork's `userTargetDir`/`userDefaultSourceDir` where applicable
- Merge any upstream improvements (better error handling, additional resolver logic) into the fork's version

---

## 5. Risk Mitigation

### 5.1 Risk Registry

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | `src/index.ts` has irreconcilable textual conflicts due to both sides adding 500+ lines | High | High | Resolution order 12 (last); accept upstream as base, surgically re-add fork sections; use grep to verify no fork export is lost |
| R2 | Upstream renamed `SyncAdapter` fields the fork extends | Medium | High | Phase 4 interface audit; update all fork references to new names; never drop fork functionality |
| R3 | Upstream added its own version of fork-only adapters with different implementations | Medium | High | Compare implementations; prefer fork's `hybrid` mode; merge upstream improvements into fork version |
| R4 | Upstream expanded `dotany` API in ways that break fork's `dotfile.create()` calls | Low | High | Phase 4 `dotany` audit; update fork adapter `forProject()` calls to match new API |
| R5 | Test count drops after merge | Medium | Medium | Phase 6 comparison; investigate and fix each failure; never skip |
| R6 | Coverage drops below 80% | Low | Medium | Phase 6 coverage check; add tests for new combined code paths if needed |
| R7 | Upstream deleted files fork depends on | Low | High | Phase 2 deletion check; adapt fork imports before resolving other conflicts |
| R8 | Merge introduces subtle runtime bugs not caught by type checker | Medium | Medium | Phase 7 smoke tests; manual CLI verification; PR review |

### 5.2 Fallback Strategy

If the merge produces an unmanageable number of conflicts (more than 20 semantic/structural conflicts), the fallback strategy is:

1. Abort the merge on `feat/upstream-merge-2026-03-23`
2. Create a fresh branch `feat/upstream-cherry-pick-2026-03-23`
3. Cherry-pick upstream commits in reverse chronological order, skipping commits that conflict with fork features
4. Document which upstream commits were skipped and why
5. This loses merge-commit revertability (requirement 10.1) and must be discussed with stakeholders

---

## 6. Verification Checklist Summary

| # | Check | Command | Expected |
|---|-------|---------|----------|
| V1 | Lockfile regenerated | `pnpm install` | Exit 0 |
| V2 | Zero type errors | `npx tsc --noEmit` | Exit 0 |
| V3 | Build succeeds | `npm run build` | Exit 0, `dist/` populated |
| V4 | All tests pass | `npx vitest run` | Exit 0, >= 466 tests |
| V5 | Coverage threshold | `npx vitest run --coverage` | >= 80% |
| V6 | Version output | `node dist/index.js --version` | Valid semver string |
| V7 | Fork commands in help | `node dist/index.js claude --help` | All 10 Claude subcommands listed |
| V8 | Upstream commands in help | `node dist/index.js init --help` | `--only`/`--exclude` if upstream added them |
| V9 | Adapter registry complete | Inspect `adapterRegistry.all()` | All fork + upstream adapters present |
| V10 | Merge commit has 2 parents | `git log --oneline -1 --format=%P` | Two parent hashes |
| V11 | No fork exports dropped | `grep -r` for all fork-added exports in `dist/` | All present |

---

## 7. Artifacts Produced

| Artifact | Location | Purpose |
|----------|----------|---------|
| Merge notes | `MERGE_NOTES.md` (project root) | Conflict inventory, resolution rationale, follow-up items |
| Feature branch | `feat/upstream-merge-2026-03-23` | Isolated merge work; PR source |
| Pull request | GitHub | Review gate before merge to `main` |
| This design | `.kiro/specs/upstream-merge/design.md` | Architectural record of merge strategy |

---

## 8. Out of Scope

- **CHANGELOG.md entries**: Managed via changesets, not this merge (requirement 9.4)
- **New feature integration**: If upstream added `init --only`/`--exclude` or wildcard patterns, they are preserved in the merge but not wired into fork-specific workflows. Follow-up items are documented in `MERGE_NOTES.md`
- **Version bump**: Fork remains at `0.8.0-beta.3` or current; no version change from this merge
- **README rewrite**: Documentation merge is conservative (fork version as base, selective upstream additions)
