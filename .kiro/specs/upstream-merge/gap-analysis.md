# Gap Analysis: upstream-merge

## Analysis Summary

- **Scope**: Merge upstream `lbb00/ai-rules-sync` (commit `aa53caac`..`6b562a3`) into the SoftwareCats fork (commit `aa53caac`..`efef8b1`), preserving all fork-only features while integrating upstream progress.
- **Fork divergence**: 14 fork-only commits (reflog-verified) adding 6 new adapters, 2 new commands, hybrid mode fixes, user-mode enhancements, and version/dependency bumps from `0.6.0` to `0.8.0-beta.3`. Latest 3 commits are .kiro/nwave housekeeping.
- **Upstream divergence**: 16 upstream commits since common ancestor. Key additions: `sourceDir` object format, `init --only/--exclude`, wildcard config, VitePress docs site, version bumped to `0.8.1`. 91 files changed (+7163/-2571 lines), mostly docs.
- **Actual conflicts (dry-run confirmed)**: Only **5 files** conflict: `.gitignore`, `CHANGELOG.md`, `package.json`, `pnpm-lock.yaml`, `src/adapters/agents-md.ts`. Files predicted as CRITICAL (`src/index.ts`, `src/adapters/index.ts`) **auto-merge cleanly**.
- **Semantic conflict confirmed**: Upstream independently created `claude-rules.ts` (file mode) and `claude-agents.ts` (directory mode). Fork has both in hybrid mode. Upstream does NOT have `claude-commands.ts`.
- **No upstream deletions or renames** — all fork imports remain valid.
- **Overall assessment**: This merge is significantly more manageable than initially predicted. The 5 textual conflicts are mostly trivial; the semantic adapter conflicts require careful mode reconciliation.

---

## 1. Fork Forward-Development Inventory

### 1.1 Fork Commit History (aa53caac..HEAD)

Extracted from `.git/logs/refs/heads/main` (reflog). 14 entries total:

| # | Commit | Subject | Key Changes |
|---|--------|---------|-------------|
| 1 | `d68b06d` | feat(claude): commands adapter, import-all, import --user | New `claude-commands` adapter, `import-all` command, `--user` flag on import |
| 2 | `ed2255b` | fix(import-all): handle no-op force imports gracefully | Edge case fix for import-all |
| 3 | `8f3f548` | fix(claude-commands): change mode from file to hybrid | Mode correction |
| 4 | `c3d224c` | fix(claude-agents,claude-rules): change mode from file to hybrid | Mode correction for agents and rules |
| 5 | `4d0e193` | chore: release v0.7.0 | Version bump + CHANGELOG |
| 6 | `58508b5` | Merge PR #1: feat/agt-9-new-claude-adapters | Merged via PR on origin (fast-forward pull) |
| 7 | `c281175` | fix: update vitest to ^4.1.0 | Dev dependency peer alignment |
| 8 | `54e0167` | 0.8.0-beta.3 | Version bump |
| 9 | `26c777f` | feat(claude): add status-lines, agent-memory, settings adapters; remove output-styles | 3 new Claude adapters |
| 10 | `b0386f8` | chore: Prepare for upstream-merge | Spec/kiro files |
| 11 | `4d1f325` | chore: .nwave | Nwave config |
| 12 | `d6a856b` | chore: .nwave | Nwave config |
| 13 | `efef8b1` | chore: merge down .kiro | Kiro spec merge |

Note: the reflog shows 14 lines (including the initial clone), but only 13 are actual commits on fork; commits 10-13 are housekeeping (specs, nwave, kiro).

### 1.2 Fork-Only Features (Verified by Source Code Review)

#### New Adapters (6 total, all confirmed in source)

| Adapter File | Name | Tool | Subtype | Mode | Source Dir | User Support |
|-------------|------|------|---------|------|------------|-------------|
| `src/adapters/claude-commands.ts` | `claude-commands` | claude | commands | hybrid | `.claude/commands` | No |
| `src/adapters/claude-rules.ts` | `claude-rules` | claude | rules | hybrid | `.claude/rules` | No |
| `src/adapters/claude-agents.ts` | `claude-agents` | claude | agents | hybrid | `.claude/agents` | No |
| `src/adapters/claude-settings.ts` | `claude-settings` | claude | settings | file | `.claude` | Yes (`userTargetDir: .claude`, `userDefaultSourceDir: .claude/user`) |
| `src/adapters/claude-status-lines.ts` | `claude-status-lines` | claude | status-lines | directory | `.claude/status-lines` | Yes (`userTargetDir: .claude/status_lines`, `userDefaultSourceDir: .claude/user/status-lines`) |
| `src/adapters/claude-agent-memory.ts` | `claude-agent-memory` | claude | agent-memory | directory | `.claude/agent-memory` | No |

Note: `claude-agents`, `claude-rules`, and `claude-commands` were initially `file` mode, then corrected to `hybrid` in separate fix commits. The `hybrid` mode is a fork-specific design decision to support both individual files and directories.

#### New Commands (2 total, confirmed in source)

1. **`import-all`** (`src/commands/import-all.ts`): Batch import project entries into rules repo with single git commit. Options: `--dry-run`, `--force`, `--interactive`, `--user`, `--push`, `--quiet`, `--message`, `--local`. Registered in `src/cli/register.ts` as a standard adapter subcommand.

2. **`list`** (`src/commands/list.ts`): Multi-mode list command (`handleClaudeList`). 4 modes:
   - A: project config entries (installed)
   - B: user config entries
   - C: repo source directories (available)
   - D: repo user-source directories
   Currently Claude-specific but pattern is generalizable. Wired directly in `src/index.ts` lines 1239-1267.

#### Interface Extensions (Verified in Source)

All extensions are additive (optional fields), minimizing interface breakage risk:

| Interface | Field | Type | Added In | Used By |
|-----------|-------|------|----------|---------|
| `SyncAdapter` (types.ts) | `userTargetDir` | `string?` | d68b06d | base.ts factory, claude-settings, claude-status-lines |
| `SyncAdapter` (types.ts) | `userDefaultSourceDir` | `string?` | d68b06d | base.ts factory, claude-settings, claude-status-lines |
| `SyncAdapter` (types.ts) | `hybridFileSuffixes` | `string[]?` | d68b06d | base.ts factory, claude-commands, claude-rules, claude-agents |
| `SyncOptions` (types.ts) | `skipIgnore` | `boolean?` | d68b06d | handlers.ts, sync-engine.ts, base.ts link method |
| `AdapterConfig` (base.ts) | `userTargetDir` | `string?` | d68b06d | createBaseAdapter passthrough |
| `AdapterConfig` (base.ts) | `userDefaultSourceDir` | `string?` | d68b06d | createBaseAdapter passthrough |
| `AdapterConfig` (base.ts) | `hybridFileSuffixes` | `string[]?` | d68b06d | createBaseAdapter passthrough |
| `CommandContext` (handlers.ts) | `user` | `boolean?` | d68b06d | user-mode routing |
| `CommandContext` (handlers.ts) | `skipIgnore` | `boolean?` | d68b06d | user-mode routing |
| `AddOptions` (handlers.ts) | `user` | `boolean?` | d68b06d | user-mode routing |

#### Version and Dependencies (from package.json)

| Dependency | Fork Version | Purpose |
|-----------|-------------|---------|
| `ai-rules-sync` (self) | `0.8.0-beta.3` | Fork version (upstream npm: `0.4.0`) |
| `commander` | `^14.0.2` | CLI framework |
| `@types/node` | `^25.0.3` | TypeScript types |
| `vitest` | `^4.1.0` | Test runner (bumped for `@vitest/coverage-v8` peer) |
| `@vitest/coverage-v8` | `^4.1.0` | Coverage provider |
| `typescript` | `^5.9.3` | Compiler |

### 1.3 Fork-Modified Shared Files (High Risk for Conflicts)

Files touched by fork commits that upstream almost certainly also modified:

| File | Predicted Risk | Actual Result | Notes |
|------|---------------|---------------|-------|
| `src/index.ts` | CRITICAL | **AUTO-MERGED** | No conflict — changes in non-overlapping regions |
| `src/adapters/index.ts` | CRITICAL | **AUTO-MERGED** | No conflict |
| `src/adapters/types.ts` | HIGH | **AUTO-MERGED** | No conflict — additive fields from both sides compatible |
| `src/adapters/base.ts` | HIGH | **AUTO-MERGED** | No conflict |
| `src/commands/handlers.ts` | HIGH | **AUTO-MERGED** | No conflict |
| `src/sync-engine.ts` | MEDIUM-HIGH | **AUTO-MERGED** | No conflict |
| `src/adapters/agents-md.ts` | not predicted | **CONFLICT** | Both sides modified; semantic resolution needed |
| `.gitignore` | not predicted | **CONFLICT** | Trivial — both sides added entries |
| `CHANGELOG.md` | LOW | **CONFLICT** | Trivial — accept fork's version |
| `package.json` | MEDIUM | **CONFLICT** | Keep fork version, merge deps |
| `pnpm-lock.yaml` | TRIVIAL | **CONFLICT** | Delete and regenerate |
| `src/adapters/claude-rules.ts` | HIGH (semantic) | **SEMANTIC** | Upstream has `file` mode, fork has `hybrid` — prefer fork |
| `src/adapters/claude-agents.ts` | HIGH (semantic) | **SEMANTIC** | Upstream has `directory` mode, fork has `hybrid` — prefer fork |
| `src/adapters/claude-commands.ts` | HIGH (semantic) | **NO CONFLICT** | Upstream does not have this file |

### 1.4 Fork-Only Files (No Textual Conflict Expected)

These files exist only in the fork. Git should auto-merge them cleanly. However, if upstream independently created a file at the same path, a **semantic conflict** occurs (git may not report a textual conflict, but two competing implementations of the same adapter would exist).

| File | Purpose | Semantic Conflict Risk |
|------|---------|----------------------|
| `src/adapters/claude-commands.ts` | Claude commands adapter | **HIGH** if upstream added its own `claude-commands.ts` |
| `src/adapters/claude-rules.ts` | Claude rules adapter | **HIGH** if upstream added its own `claude-rules.ts` |
| `src/adapters/claude-agents.ts` | Claude agents adapter | **HIGH** if upstream added its own `claude-agents.ts` |
| `src/adapters/claude-settings.ts` | Claude settings adapter | LOW (unlikely upstream added this) |
| `src/adapters/claude-status-lines.ts` | Claude status-lines adapter | LOW (unlikely upstream added this) |
| `src/adapters/claude-agent-memory.ts` | Claude agent-memory adapter | LOW (unlikely upstream added this) |
| `src/commands/import-all.ts` | Import-all command handler | LOW |
| `src/commands/list.ts` | List command handler | LOW |
| `src/commands/version.ts` | Formatted version output | LOW |
| `src/__tests__/claude-settings.test.ts` | Settings adapter tests | LOW |
| `src/__tests__/claude-status-lines.test.ts` | Status-lines adapter tests | LOW |
| `src/__tests__/claude-commands.test.ts` | Commands adapter tests | **HIGH** if upstream added matching test |
| `src/__tests__/claude-rules.test.ts` | Rules adapter tests | **HIGH** if upstream added matching test |
| `src/__tests__/claude-list.test.ts` | List command tests | LOW |
| `src/__tests__/handlers-user-import.test.ts` | User import tests | LOW |
| `.kiro/` | Kiro spec files (this merge) | NONE (upstream has no `.kiro/`) |

---

## 2. Upstream Change Analysis (CONFIRMED via Bash)

### 2.1 Data Collection Status

| Data Point | Status | Method |
|-----------|--------|--------|
| Upstream remote configured | CONFIRMED | `[remote "upstream"]` → `git@github.com:lbb00/ai-rules-sync.git` |
| Upstream fetched | CONFIRMED | `git fetch upstream` (latest: `6b562a3`) |
| Upstream commit list | CONFIRMED | `git log --oneline aa53caac..upstream/main` — 16 commits |
| Upstream diff stat | CONFIRMED | `git diff --stat` — 91 files, +7163/-2571 lines |
| Upstream deletions/renames | CONFIRMED | None (`git diff --diff-filter=DR` — empty) |
| Dry-run merge conflicts | CONFIRMED | 5 files conflict (see section 2.3) |
| Fork commit list | CONFIRMED | 14 entries from reflog |

### 2.2 Upstream Commits (aa53caac..6b562a3)

| # | Hash | Subject | Category |
|---|------|---------|----------|
| 1 | `4b00a04` | Feat/ais use local path symlink (#33) | Feature |
| 2 | `f92a179` | chore(release): bump version to 0.7.0 (#34) | Release |
| 3 | `7011f02` | chore(homebrew): update formula to v0.7.0 | Release |
| 4 | `0a8b3cb` | feat(config): add sourceDir object format for one-source-multi-target sync (#35) | Feature |
| 5 | `eb769ab` | feat(config): extend sourceDir for directory/hybrid mode (#36) | Feature |
| 6 | `252e19f` | Docs (#37) | Docs |
| 7 | `56b45ef` | docs: simplify README_ZH.md to match README.md structure | Docs |
| 8 | `80dd913` | chore(release): bump version to 0.8.0 | Release |
| 9 | `665e8be` | Github action error (#38) | CI fix |
| 10 | `c1a8aa1` | chore(release): bump version to 0.8.1 | Release |
| 11 | `8bc21da` | chore(homebrew): update formula to v0.8.1 | Release |
| 12 | `aa6dc9d` | feat(init): add --only and --exclude options (#39) | Feature |
| 13 | `dbf93ee` | refactor: improve ai-rules-sync.json extensibility and type safety | Refactor |
| 14 | `058edc2` | docs: rewrite configuration reference | Docs |
| 15 | `896a93b` | feat(config): add wildcard (*) fallback for ai-rules-sync.json (#39) | Feature |
| 16 | `6b562a3` | docs: improve structure, onboarding, and API reference (#40) | Docs |

**Functional breakdown**: 5 features, 4 releases, 4 docs, 1 refactor, 1 CI fix, 1 local path feature.

### 2.3 Confirmed Conflict Files (Dry-Run Merge)

Only **5 files** have textual conflicts:

| File | Severity | Resolution Strategy |
|------|----------|-------------------|
| `.gitignore` | Trivial | Manual merge, keep both additions |
| `CHANGELOG.md` | Trivial | Accept fork's version |
| `package.json` | Moderate | Keep fork version number, merge deps |
| `pnpm-lock.yaml` | Trivial | Delete and regenerate via `pnpm install` |
| `src/adapters/agents-md.ts` | Semantic | Preserve fork enhancements, integrate upstream |

**Auto-merged successfully** (no conflict): `src/adapters/base.ts`, `src/adapters/index.ts`, `src/adapters/types.ts`, `src/commands/handlers.ts`, `src/index.ts`, `src/sync-engine.ts`, `src/__tests__/helpers/adapter-contract.ts`

### 2.4 Semantic Conflict: Upstream Adapter Files (CONFIRMED)

| Adapter File | Upstream | Fork | Conflict Type |
|-------------|----------|------|---------------|
| `claude-commands.ts` | **NOT FOUND** | hybrid mode | No conflict — fork-only |
| `claude-rules.ts` | **EXISTS** (file mode, `.md` suffix) | hybrid mode | Semantic — competing implementations |
| `claude-agents.ts` | **EXISTS** (directory mode) | hybrid mode | Semantic — competing implementations |

Upstream's `claude-rules.ts` uses `file` mode with `createSingleSuffixResolver`. Upstream's `claude-agents.ts` uses `directory` mode with no file suffixes. Fork's versions use `hybrid` mode for both, which is strictly more capable. **Resolution**: prefer fork's hybrid implementations, verify they pass both sides' tests.

### 2.5 No Upstream Deletions or Renames

`git diff --diff-filter=DR aa53caac..upstream/main` returned empty. All fork imports remain valid.

---

## 3. Detailed File-Level Risk Assessment

### 3.1 `src/index.ts` -- CRITICAL (2110 lines)

This is the single highest-risk file. Both sides modify it extensively.

**Fork-specific sections to preserve** (verified by grep and line-by-line analysis):
- Lines 31: `import { handleClaudeList, ListResult, ListOptions } from './commands/list.js'`
- Lines 34: `import { getFormattedVersion } from './commands/version.js'`
- Lines 38-42: Version interception (`-v`/`--version` flags, `getFormattedVersion()`)
- Lines 1098-1101: `claude` command group parent declaration
- Lines 1103-1114: `claude install` subcommand
- Lines 1116-1182: `claude add-all` subcommand
- Lines 1184-1237: `printListResult()` helper function
- Lines 1239-1267: `claude list` subcommand
- Lines 1269-1271: `claude rules` subgroup + `registerAdapterCommands`
- Lines 1273-1275: `claude skills` subgroup + `registerAdapterCommands`
- Lines 1277-1279: `claude agents` subgroup + `registerAdapterCommands`
- Lines 1281-1283: `claude commands` subgroup + `registerAdapterCommands`
- Lines 1285-1287: `claude md` subgroup + `registerAdapterCommands`
- Lines 1289-1291: `claude status-lines` subgroup + `registerAdapterCommands`
- Lines 1293-1295: `claude agent-memory` subgroup + `registerAdapterCommands`
- Lines 1297-1299: `claude settings` subgroup + `registerAdapterCommands`
- Lines 2057+: Source dir resolution cases for all Claude subtypes
- Lines 2092-2111: `claude-skills`, `claude-agents`, `claude-commands`, `claude-rules`, `claude-status-lines`, `claude-agent-memory`, `claude-settings` sourceDir cases
- Line 2321: User mode description string

**Resolution strategy**: Accept upstream's version as base for non-Claude sections. Surgically re-add all fork sections listed above. Verify every `registerAdapterCommands()` call and `.command()` registration.

### 3.2 `src/adapters/index.ts` -- CRITICAL (196 lines)

Fork adds 6 imports and 6 registrations (lines 10-15, 63-67):
- `claudeCommandsAdapter` from `./claude-commands.js`
- `claudeRulesAdapter` from `./claude-rules.js`
- `claudeStatusLinesAdapter` from `./claude-status-lines.js`
- `claudeAgentMemoryAdapter` from `./claude-agent-memory.js`
- `claudeSettingsAdapter` from `./claude-settings.js`

If upstream also added `claude-commands`, `claude-rules`, or `claude-agents` adapters, the imports would conflict at the exact same lines.

**Resolution strategy**: Union of all imports and registrations from both sides. Verify no duplicate `name` values. If upstream has competing adapter implementations, prefer fork's version (uses `hybrid` mode with user-mode support).

### 3.3 `src/adapters/types.ts` -- HIGH (169 lines)

Fork adds 4 fields:
- `SyncAdapter.userTargetDir?: string` (line 29)
- `SyncAdapter.userDefaultSourceDir?: string` (line 35)
- `SyncAdapter.hybridFileSuffixes?: string[]` (line 44)
- `SyncOptions.skipIgnore?: boolean` (line 144)

All are optional, so they are purely additive. If upstream also added fields, the merged interface must include all fields from both sides.

### 3.4 `src/adapters/base.ts` -- HIGH (177 lines)

Fork extends `AdapterConfig` (lines 23-27) and `createBaseAdapter` (lines 44-48, 74-76):
- `userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes` passthrough
- User-mode logic in `link()`: `effectiveTargetDir` selection based on `skipIgnore` and `userTargetDir`

### 3.5 `src/commands/handlers.ts` -- HIGH (513 lines)

Fork adds:
- `CommandContext.user?: boolean` and `CommandContext.skipIgnore?: boolean` (lines 22-24)
- `AddOptions.user?: boolean` (line 34)
- User-mode routing in `handleAdd` (lines 94-118): separate path using `adapter.link()` + `addUserDependency()`
- `RemoveCommandOptions.dryRun?: boolean` (line 181)
- Dry-run preview in `handleRemove` (lines 286-306)
- `forProject().remove()` pattern in project-mode `handleRemove` (line 349)
- `previewImport()` helper (lines 378-418)
- Dry-run preview in `handleImport` (lines 431-453)

### 3.6 `src/sync-engine.ts` -- MEDIUM-HIGH (379 lines)

Fork adds:
- `importEntryNoCommit()` function (lines 327-378): mirrors `importEntry()` but skips git commit for batch use by `import-all`
- User-mode `targetDirPath` routing in `importEntry()` (lines 259-262): uses `adapter.userTargetDir` when `skipIgnore` is true
- User-mode `sourceDir` routing in `importEntry()` (lines 279-284): uses `adapter.userDefaultSourceDir` when `skipIgnore` is true

### 3.7 Semantic Conflict: Upstream May Have Same Adapter Files

The highest-priority semantic conflict is around three Claude adapter files that both sides may have independently created:

| File | Fork Mode | Fork Feature | Likely Upstream Mode | Resolution |
|------|-----------|-------------|---------------------|------------|
| `claude-commands.ts` | hybrid | `hybridFileSuffixes: ['.md']`, `createSingleSuffixResolver` | file (per `supported-tools.json` at fork point) | Prefer fork hybrid mode |
| `claude-rules.ts` | hybrid | `hybridFileSuffixes: ['.md']`, `createSingleSuffixResolver` | file (per upstream `supported-tools.json`) | Prefer fork hybrid mode |
| `claude-agents.ts` | hybrid | `hybridFileSuffixes: ['.md']`, `createSingleSuffixResolver` | directory (per upstream `supported-tools.json`) | Prefer fork hybrid mode |

If upstream created these files too, git may auto-merge (creating the file from the upstream side since it doesn't exist in the common ancestor from either side's perspective). This would result in duplicate implementations that compile but behave differently. Detection requires post-merge inspection.

---

## 4. Dependency and Import Chain Analysis

### 4.1 Fork Import Dependencies (Must Survive Merge)

Critical import chains that must remain valid after merge:

```
src/commands/import-all.ts
  -> src/sync-engine.ts (importEntryNoCommit)
  -> src/adapters/types.ts (SyncAdapter, AdapterRegistry)
  -> src/project-config.ts (addUserDependency, getRepoSourceConfig, getSourceDir)

src/commands/list.ts
  -> src/adapters/types.ts (SyncAdapter)
  -> src/project-config.ts (getCombinedProjectConfig, getRepoSourceConfig, getSourceDir)
  -> src/config.ts (getUserProjectConfig, getUserConfigPath)

src/cli/register.ts
  -> src/commands/import-all.ts (handleImportAll)
  -> src/commands/handlers.ts (handleAdd, handleRemove, handleImport, ImportCommandOptions)
  -> src/commands/install.ts (installEntriesForAdapter, installUserEntriesForAdapter)
  -> src/commands/add-all.ts (handleAddAll)
  -> src/adapters/index.ts (adapterRegistry)

src/adapters/base.ts
  -> src/sync-engine.ts (unlinkEntry)
  -> src/project-config.ts (addDependencyGeneric, removeDependencyGeneric)
  -> src/dotany/index.ts (dotfile)
  -> src/plugin/git-repo-source.ts (GitRepoSource)
  -> src/plugin/ai-rules-sync-manifest.ts (AiRulesSyncManifest)

src/commands/handlers.ts
  -> src/config.ts (getUserConfigPath, getUserProjectConfig)
  -> src/project-config.ts (addUserDependency, removeUserDependency, getCombinedProjectConfig, getRepoSourceConfig, getSourceDir, getTargetDir)
  -> src/sync-engine.ts (importEntry, ImportOptions)
```

If upstream renamed or moved any of these exports, every import chain above breaks.

### 4.2 Functions the Fork Exported That Did Not Exist at Fork Point

| Function | File | Purpose |
|----------|------|---------|
| `importEntryNoCommit` | `src/sync-engine.ts` | Batch import without git commit |
| `addUserDependency` | `src/project-config.ts` | Add to user config |
| `removeUserDependency` | `src/project-config.ts` | Remove from user config |
| `handleImportAll` | `src/commands/import-all.ts` | Batch import handler |
| `handleClaudeList` | `src/commands/list.ts` | List command handler |
| `getFormattedVersion` | `src/commands/version.ts` | Version display |
| `installUserEntriesForAdapter` | `src/commands/install.ts` | User-mode install |
| `installAllUserEntries` | `src/commands/install.ts` | User-mode install all |
| `buildRepoSourceFromNestedStrings` | `src/project-config.ts` | Dynamic config iteration |

---

## 5. Implementation Approach Options

### Option A: Full Merge on Isolated Branch (Recommended)

1. Create `feat/upstream-merge-2026-03-23` from current `main`
2. Run `git merge --no-ff upstream/main` to initiate merge
3. Resolve conflicts in dependency order (types -> base -> registry -> config -> engine -> handlers -> CLI -> index.ts)
4. Build, type-check, and run full test suite
5. Submit as PR for review

**Pros**: Preserves full history from both sides; clean revert path via `git revert -m 1`; meets all 10 requirements.
**Cons**: `src/index.ts` will likely have extensive textual conflicts requiring careful manual resolution.

### Option B: Cherry-Pick Upstream Commits (Fallback Only)

Only use if Option A produces more than 20 semantic/structural conflicts.

**Pros**: Granular control over what gets integrated.
**Cons**: Loses merge history; violates Requirement 10.1 (single merge commit with two parents); cherry-pick conflicts compound.

### Option C: Rebase Fork Onto Upstream

**Not viable** -- project rules prohibit rebase and force-push.

### Recommended: Option A

The requirements explicitly call for a single merge commit on an isolated branch. Option A is the only approach that satisfies all 10 requirements.

---

## 6. Conflict Resolution Strategies

### 6.1 Resolution Order (Dependency-First)

This order is critical: resolve leaf dependencies before files that import them.

| Order | File(s) | Category | Strategy |
|-------|---------|----------|----------|
| 1 | `pnpm-lock.yaml` | Trivial | Delete; regenerate via `pnpm install` |
| 2 | `CHANGELOG.md` | Trivial | Accept fork version entirely |
| 3 | `package.json` | Trivial/Mechanical | Keep fork version `0.8.0-beta.3` and dep versions; add any new upstream deps |
| 4 | `src/adapters/types.ts` | Semantic | Union of all interface fields from both sides |
| 5 | `src/adapters/base.ts` | Semantic | Mirror types.ts in AdapterConfig; preserve fork factory extensions |
| 6 | `src/adapters/index.ts` | Mechanical | Union of imports + registrations; no duplicate names |
| 7 | `src/project-config.ts` | Semantic | Preserve fork's `addUserDependency`, `removeUserDependency`, dynamic config; integrate upstream |
| 8 | `src/sync-engine.ts` | Semantic | Preserve fork's `importEntryNoCommit`, user-mode routing; integrate upstream |
| 9 | `src/commands/handlers.ts` | Semantic | Preserve fork's user-mode, dry-run, `forProject().remove()`; integrate upstream |
| 10 | `src/commands/lifecycle.ts` | Mechanical | Integrate upstream `--only`/`--exclude` if present |
| 11 | `src/cli/register.ts` | Mechanical | Preserve fork's import-all and user flags |
| 12 | `src/index.ts` | Structural | **Last** -- depends on everything else. Accept upstream as base, re-add fork sections |
| 13 | `src/completion/scripts.ts` | Mechanical | Union of completion entries |
| 14 | `docs/supported-tools.json` | Mechanical | Union of tool entries |
| 15 | `README.md`, `README_ZH.md` | Mechanical | Fork version as base; selective upstream improvements |

### 6.2 `src/index.ts` Detailed Strategy

Because this file is 2110 lines and both sides modify it heavily:

1. Accept upstream's version as the starting base (it will have any new tool groups, new options, structural changes).
2. Re-add these fork-specific blocks in order:
   a. Version interception at top (lines 38-42)
   b. `import { handleClaudeList, ListResult, ListOptions }` and `import { getFormattedVersion }`
   c. `printListResult()` helper
   d. Claude `install`, `add-all`, `list` subcommands on the `claude` parent command
   e. All 8 `registerAdapterCommands` calls for Claude subtypes (rules, skills, agents, commands, md, status-lines, agent-memory, settings)
   f. Source dir resolution cases for all Claude subtypes in the completion/discovery function
   g. User mode description text
3. Verify every `registerAdapterCommands()` call from both sides.
4. Test `node dist/index.js claude --help` to confirm all subcommands visible.

### 6.3 Adapter Mode Reconciliation

If upstream also created `claude-commands.ts`, `claude-rules.ts`, or `claude-agents.ts`:
- **Prefer fork's `hybrid` mode** -- it supports both files and directories, which is strictly more capable than `file` or `directory` mode alone.
- Merge any upstream improvements (better error messages, additional resolver logic) into the fork's version.
- Verify the merged adapter passes the fork's tests (e.g., `claude-commands.test.ts`, `claude-rules.test.ts`).

---

## 7. Post-Merge Verification Checklist

| # | Check | Command | Expected |
|---|-------|---------|----------|
| V1 | Lockfile regenerated | `pnpm install` | Exit 0 |
| V2 | Zero type errors | `npx tsc --noEmit` | Exit 0 |
| V3 | Build succeeds | `npm run build` | Exit 0, `dist/` populated |
| V4 | All tests pass | `npx vitest run` | Exit 0, >= 466 tests |
| V5 | Coverage threshold | `npx vitest run --coverage` | >= 80% |
| V6 | Version output | `node dist/index.js --version` | `0.8.0-beta.3` or higher |
| V7 | Fork commands in help | `node dist/index.js claude --help` | All 10 Claude subcommands: skills, agents, commands, rules, md, status-lines, agent-memory, settings, list, install, add-all |
| V8 | Upstream commands in help | `node dist/index.js init --help` | `--only`/`--exclude` if upstream added them |
| V9 | Adapter registry complete | `adapterRegistry.all().length` | All fork + upstream adapters (currently 33 in fork) |
| V10 | Merge commit has 2 parents | `git log --oneline -1 --format=%P` | Two parent hashes |
| V11 | No fork exports dropped | `grep -r` for all fork-added exports in `dist/` | All present |
| V12 | No semantic duplicates | Check for duplicate adapter `name` values in registry | Zero duplicates |

---

## 8. Test Baseline

### Current Fork Test Stats
- **38 test files** in `src/__tests__/`
- **466 tests** (baseline)
- **Coverage target**: >= 80%

### Fork-Only Test Files (must survive merge)
| Test File | Tests For |
|----------|-----------|
| `claude-commands.test.ts` | Claude commands adapter (hybrid mode) |
| `claude-rules.test.ts` | Claude rules adapter (hybrid mode) |
| `claude-settings.test.ts` | Claude settings adapter (file mode, user support) |
| `claude-status-lines.test.ts` | Claude status-lines adapter (directory mode, user support) |
| `claude-list.test.ts` | List command handler |
| `handlers-user-import.test.ts` | User-mode import flow |
| `handlers-dry-run.test.ts` | Dry-run preview for remove/import |
| `handlers-coverage.test.ts` | Handler edge case coverage |
| `handle-remove-forproject.test.ts` | `forProject().remove()` pattern |
| `sync-engine-user.test.ts` | User-mode sync engine |
| `import-user-mode.test.ts` | User-mode import integration |
| `version.test.ts` | Version display formatting |

### Potential Upstream Test Additions
If upstream added test files for new features (`init --only`/`--exclude`, wildcard patterns, new adapters), those tests must pass after merge. If upstream added tests for `claude-commands`, `claude-rules`, or `claude-agents`, they may conflict with the fork's test files and need reconciliation.

---

## 9. Risk Mitigation

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | `src/index.ts` has irreconcilable textual conflicts due to 2110-line monolith | High | High | Resolution order 12 (last); accept upstream base; surgically re-add fork sections; verify no fork export lost |
| R2 | Upstream created same adapter files (`claude-commands.ts`, etc.) with different mode | Medium | High | Compare implementations; prefer fork's `hybrid` mode; merge upstream improvements into fork version |
| R3 | Upstream renamed `SyncAdapter` fields the fork extends | Medium | High | Phase 4 interface audit; update all fork references; never drop fork functionality |
| R4 | Upstream expanded `dotany` API breaking fork's `dotfile.create()` calls | Low | High | Audit `dotany` types; update fork adapter `forProject()` calls |
| R5 | Test count drops after merge | Medium | Medium | Compare counts; investigate each failure; never skip |
| R6 | Coverage drops below 80% | Low | Medium | Add tests for combined code paths |
| R7 | Upstream deleted files fork depends on | Low | High | Check deletions during dry-run merge; adapt fork imports first |
| R8 | Subtle runtime bugs not caught by type checker | Medium | Medium | Phase 7 smoke tests; manual CLI verification |
| R9 | `import-all` / `list` commands lose registration after merge | Medium | High | Verify CLI help output; test command execution |

---

## 10. Remaining Blockers

**None.** All previously blocked items have been resolved:

| Item | Status |
|------|--------|
| Upstream commit enumeration | COMPLETE — 16 commits enumerated |
| Upstream diff stat | COMPLETE — 91 files, +7163/-2571 |
| Upstream deletions/renames | COMPLETE — none found |
| Dry-run merge conflict list | COMPLETE — 5 textual conflicts |
| Semantic adapter conflict check | COMPLETE — `claude-rules.ts` and `claude-agents.ts` exist upstream |

---

## Document Status

**Revision 3** (2026-03-23) — fully data-complete. All git commands executed successfully.

This analysis was conducted by examining:
- Fork git reflog (`aa53caac..HEAD`, 14 entries)
- Upstream commits (`git log --oneline aa53caac..upstream/main`, 16 commits)
- Upstream diff stat (`git diff --stat`, 91 files, +7163/-2571 lines)
- Upstream deletion/rename check (`git diff --diff-filter=DR`, none)
- Dry-run merge (`git merge --no-commit --no-ff upstream/main`, 5 conflicts)
- Semantic conflict check (`git show upstream/main:src/adapters/claude-{commands,rules,agents}.ts`)
- Complete source code review of all fork-modified files
- Import chain tracing (5 critical dependency chains)
- Steering documents and KNOWLEDGE_BASE.md

## Next Steps

1. **Proceed to merge execution** on `feat/upstream-merge-2026-03-23` per the approved design and tasks.
2. Resolve the 5 textual conflicts (4 trivial + 1 semantic in `agents-md.ts`).
3. Reconcile the 2 semantic adapter conflicts (`claude-rules.ts`, `claude-agents.ts`) — prefer fork's hybrid mode.
4. Run full verification checklist (build, tests, smoke tests).

Sources:
- [lbb00/ai-rules-sync GitHub](https://github.com/lbb00/ai-rules-sync)
- [ai-rules-sync on Libraries.io](https://libraries.io/npm/ai-rules-sync)
- [ai-rules-sync npm](https://www.npmjs.com/package/ai-rules-sync)
- [lbb00/ai-rules-sync Pull Requests](https://github.com/lbb00/ai-rules-sync/pulls)
