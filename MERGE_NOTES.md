# Merge Notes: Upstream Integration

## Merge Parameters

- **Upstream remote**: `git@github.com:lbb00/ai-rules-sync.git`
- **Upstream commit range**: `aa53caac..6b562a3`
- **Fork HEAD at merge start**: `efef8b1` (branch `main`)
- **Fork version**: `0.8.0-beta.3`
- **Upstream version at HEAD**: `0.8.1`
- **Common ancestor**: `aa53caac` (~v0.5.0)

---

## 1. Upstream Change Inventory

### 1.1 Commit List (16 commits)

| # | Hash | Subject | Functional Area | Category |
|---|------|---------|-----------------|----------|
| 1 | `4b00a04` | Feat/ais use local path symlink (#33) | CLI, core engine | New feature |
| 2 | `f92a179` | chore(release): bump version to 0.7.0 (#34) | Build/packaging | Release |
| 3 | `7011f02` | chore(homebrew): update formula to v0.7.0 | Build/packaging | Release |
| 4 | `0a8b3cb` | feat(config): add sourceDir object format for one-source-multi-target sync (#35) | Config, adapters, core engine | New feature |
| 5 | `eb769ab` | feat(config): extend sourceDir for directory/hybrid mode (#36) | Config, adapters, core engine | New feature |
| 6 | `252e19f` | Docs (#37) | Docs | Documentation |
| 7 | `56b45ef` | docs: simplify README_ZH.md to match README.md structure | Docs | Documentation |
| 8 | `80dd913` | chore(release): bump version to 0.8.0 | Build/packaging | Release |
| 9 | `665e8be` | Github action error (#38) | CI | Bug fix |
| 10 | `c1a8aa1` | chore(release): bump version to 0.8.1 | Build/packaging | Release |
| 11 | `8bc21da` | chore(homebrew): update formula to v0.8.1 | Build/packaging | Release |
| 12 | `aa6dc9d` | feat(init): add --only and --exclude options (#39) | CLI | New feature |
| 13 | `dbf93ee` | refactor: improve ai-rules-sync.json extensibility and type safety | Core engine, config | Refactor |
| 14 | `058edc2` | docs: rewrite configuration reference | Docs | Documentation |
| 15 | `896a93b` | feat(config): add wildcard (*) fallback for ai-rules-sync.json (#39) | Config, core engine | New feature |
| 16 | `6b562a3` | docs: improve structure, onboarding, and API reference (#40) | Docs | Documentation |

**Summary**: 5 features, 4 releases, 4 docs, 1 refactor, 1 CI fix, 1 local-path feature.

### 1.2 Upstream Files Changed per Commit

#### Commit 1: `4b00a04` -- Local path symlink support
- `README.md`, `README_ZH.md` -- doc updates
- `src/__tests__/use-local-path.test.ts` -- **new test file** (87 lines)
- `src/commands/helpers.ts` -- local path resolution logic (+74 lines)
- `src/commands/install.ts` -- local path install support (+25 lines)
- `src/git.ts` -- `getRemoteUrl` export, local path handling (+71 lines)
- `src/index.ts` -- `use` command expanded for local paths (+79 lines)
- `src/utils.ts` -- `isLocalPath`, `resolveLocalPath` exports (+25 lines)

#### Commit 4: `0a8b3cb` -- sourceDir object format
- `src/__tests__/claude-md.test.ts` -- **new test file** (87 lines)
- `src/__tests__/project-config-source-dir.test.ts` -- extended (+38 lines)
- `src/adapters/base.ts`, `src/adapters/types.ts` -- `configPath` type widened `[string, string]` -> `string[]`
- `src/adapters/claude-md.ts` -- `resolveSource` gets `sourceFileOverride` support (+34 lines)
- `src/dotany/manager.ts`, `src/dotany/types.ts` -- `sourceFileOverride` option added
- `src/plugin/git-repo-source.ts` -- override plumbing
- `src/project-config.ts` -- `SourceDirValue` union type, `SourceDirFileValue`, `SourceDirDirectoryValue` types (+75 lines)

#### Commit 5: `eb769ab` -- sourceDir directory/hybrid mode
- `src/__tests__/project-config-source-dir.test.ts` -- extended (+38 lines)
- `src/adapters/base.ts` -- `createMultiSuffixResolver` gets `sourceDirOverride` option (+27 lines)
- `src/adapters/types.ts` -- `resolveSource` signature expanded with `options` param
- `src/plugin/git-repo-source.ts` -- `sourceDirOverride` plumbing (+29 lines)
- `src/project-config.ts` -- directory mode source dir resolution (+56 lines)
- `src/sync-engine.ts` -- override plumbing (+26 lines)
- `tests/cursor-rules-hybrid.test.ts` -- **new test file** (22 lines)
- `tests/sync-engine.test.ts` -- **new test file** (20 lines)

#### Commit 6: `252e19f` -- VitePress docs site
- `docs/` -- **56 new files** (VitePress site: EN + ZH guides, references, tool pages)
- `package.json` -- added `vitepress` + `docs:dev`/`docs:build` scripts (+4 deps)
- `pnpm-lock.yaml` -- regenerated (+1347 lines)
- `.github/workflows/deploy-docs.yml` -- **new CI workflow**
- `.gitignore` -- VitePress cache entries
- `README.md` -- trimmed (content moved to docs site, -1179 lines)

#### Commit 12: `aa6dc9d` -- init --only/--exclude
- `src/__tests__/lifecycle-init.test.ts` -- **new test file** (46 lines)
- `src/commands/lifecycle.ts` -- `InitOptions.only`, `InitOptions.exclude`, `getFilteredAdapters()` (+23 lines)
- `src/index.ts` -- `--only` and `--exclude` CLI options on `init` command (+8 lines)
- `KNOWLEDGE_BASE.md` -- documented (+30 lines)

#### Commit 13: `dbf93ee` -- extensibility refactor
- `src/adapters/agents-md.ts` -- removed custom `addDependency`/`removeDependency` overrides, uses base adapter (-86 lines)
- `src/adapters/index.ts` -- removed `agentsMd`-specific special cases (-8 lines)
- `src/project-config.ts` -- new `getAtPath`, `setAtPath`, `deleteAtPath`, `getRuleSection`, `getConfigSectionWithFallback` exports; `ProjectConfig` index signature tightened from `any` to union type (+246/-198 lines)
- `src/commands/helpers.ts`, `src/commands/lifecycle.ts` -- adapted to new config API
- `src/plugin/ai-rules-sync-manifest.ts` -- adapted to new config API
- Test files updated to match

#### Commit 15: `896a93b` -- wildcard (*) fallback
- `src/project-config.ts` -- `WILDCARD_TOOL` constant, `readNestedStringValue`/`readNestedSourceDirValue` check `*` fallback (+118 lines)
- `src/__tests__/project-config-source-dir.test.ts` -- wildcard tests (+93 lines)
- `src/adapters/index.ts` -- uses `getConfigSectionWithFallback` (+17 lines)
- `src/commands/handlers.ts`, `src/commands/install.ts`, `src/commands/lifecycle.ts` -- adapted to fallback API
- `src/plugin/ai-rules-sync-manifest.ts` -- adapted

### 1.3 New Upstream Abstractions

#### 1.3.1 `sourceDir` Object Format (Commits 4, 5)

**Purpose**: Allow a single source file/directory in a rules repo to map to multiple targets with different names or modes. Previously `sourceDir` values were plain strings (directory paths). Now they can be discriminated-union objects.

**New types** (in `src/project-config.ts`):
- `SourceDirValue = string | SourceDirFileValue | SourceDirDirectoryValue`
- `SourceDirFileValue { mode: 'file'; dir: string; sourceFile?: string; targetFile?: string }`
- `SourceDirDirectoryValue { mode: 'directory'; dir: string; sourceDir?: string; targetName?: string }`

**Files spanned**: `src/project-config.ts`, `src/adapters/types.ts`, `src/adapters/base.ts`, `src/adapters/claude-md.ts`, `src/dotany/manager.ts`, `src/dotany/types.ts`, `src/plugin/git-repo-source.ts`, `src/sync-engine.ts`

**API surface changes**:
- `resolveSource()` on `SyncAdapter` gains optional `options?: { sourceFileOverride?: string; sourceDirOverride?: string }` parameter
- `createMultiSuffixResolver()` gains optional `options?: { sourceDirOverride?: string }` parameter
- `SourceDirConfig` value type changes from `Record<string, string>` to `Record<string, SourceDirValue>`
- `RepoSourceConfig` index type changes from `any` to `string | Record<string, SourceDirValue> | undefined`

#### 1.3.2 Wildcard (*) Config Fallback (Commit 15)

**Purpose**: Allow a `"*"` tool key in `ai-rules-sync.json` sourceDir config to serve as a fallback when no tool-specific entry exists. Reduces config duplication for repos that use the same source directory layout across multiple tools.

**New exports** (in `src/project-config.ts`):
- `WILDCARD_TOOL = '*'`
- `CURRENT_CONFIG_VERSION = 1`
- `getConfigSectionWithFallback(config, topLevel, subLevel)` -- checks `config[topLevel][subLevel]` then `config['*'][subLevel]`

**Files spanned**: `src/project-config.ts`, `src/adapters/index.ts`, `src/commands/handlers.ts`, `src/commands/install.ts`, `src/commands/lifecycle.ts`, `src/plugin/ai-rules-sync-manifest.ts`

#### 1.3.3 `init --only` / `--exclude` (Commit 12)

**Purpose**: Allow selective tool initialization when creating a rules repo template. `ais init --only cursor claude` generates sourceDir config and directories only for the specified tools. `--exclude` is the inverse.

**New API** (in `src/commands/lifecycle.ts`):
- `InitOptions.only?: string[]`
- `InitOptions.exclude?: string[]`
- `getFilteredAdapters(only?, exclude?)` -- filters `adapterRegistry.all()` by tool name

**CLI surface** (in `src/index.ts`):
- `ais init --only <tools...>`
- `ais init --exclude <tools...>`

#### 1.3.4 Local Path Symlink Support (Commit 1)

**Purpose**: Allow `ais use /path/to/local/repo` to symlink a local directory into the AIS repos cache instead of cloning. Supports both git repos with remotes and plain directories.

**New exports**:
- `src/utils.ts`: `isLocalPath(input)`, `resolveLocalPath(input, cwd)`
- `src/git.ts`: `getRemoteUrl(repoPath)`

**Files spanned**: `src/utils.ts`, `src/git.ts`, `src/commands/helpers.ts`, `src/commands/install.ts`, `src/index.ts`

#### 1.3.5 Config Extensibility Refactor (Commit 13)

**Purpose**: Replace `any`-typed dynamic access in `ProjectConfig` and `RepoSourceConfig` with proper typed helpers. Remove `agents-md`-specific special-case code by making the generic config path system work for all adapters.

**New exports** (in `src/project-config.ts`):
- `ConfigPath = readonly string[]`
- `getAtPath(obj, configPath)` -- type-safe nested access
- `setAtPath(obj, configPath, key, value)` -- type-safe nested write
- `deleteAtPath(obj, configPath, key)` -- type-safe nested delete
- `getRuleSection(config, configPath)` -- get rules map at config path
- `RuleMap`, `SubtypeMap`, `ToolSections` type aliases

**Type tightening**:
- `ProjectConfig[tool]` changed from `any` to `number | string | SourceDirConfig | SubtypeMap | undefined`
- `RepoSourceConfig[tool]` changed from `any` to `string | Record<string, SourceDirValue> | undefined`
- `SyncAdapter.configPath` changed from `[string, string]` (tuple) to `string[]`
- `AdapterConfig.configPath` changed from `[string, string]` to `string[]`

---

## 2. Fork Forward-Development Inventory

### 2.1 Fork Commit List (14 entries from reflog)

| # | Hash | Subject | Key Changes |
|---|------|---------|-------------|
| 1 | `d68b06d` | feat(claude): commands adapter, import-all, import --user | New `claude-commands` adapter, `import-all` command, `--user` flag on import |
| 2 | `ed2255b` | fix(import-all): handle no-op force imports gracefully | Edge case fix for import-all |
| 3 | `8f3f548` | fix(claude-commands): change mode from file to hybrid | Mode correction |
| 4 | `c3d224c` | fix(claude-agents,claude-rules): change mode from file to hybrid | Mode correction |
| 5 | `4d0e193` | chore: release v0.7.0 | Version bump + CHANGELOG |
| 6 | `58508b5` | Merge PR #1: feat/agt-9-new-claude-adapters | PR merge |
| 7 | `c281175` | fix: update vitest to ^4.1.0 | Dev dependency peer alignment |
| 8 | `54e0167` | 0.8.0-beta.3 | Version bump |
| 9 | `26c777f` | feat(claude): add status-lines, agent-memory, settings adapters; remove output-styles | 3 new Claude adapters |
| 10 | `b0386f8` | chore: Prepare for upstream-merge | Spec/kiro files |
| 11 | `4d1f325` | chore: .nwave | Nwave config cleanup |
| 12 | `d6a856b` | chore: .nwave | Nwave config |
| 13 | `efef8b1` | chore: merge down .kiro | Kiro spec merge |

Commits 10-13 are housekeeping (specs, nwave, kiro configs). Core feature work is in commits 1-9.

### 2.2 Fork-Only Features

#### 2.2.1 New Adapters (6 total)

| Adapter File | Name | Tool | Subtype | Mode | Source Dir | User Support |
|-------------|------|------|---------|------|------------|-------------|
| `claude-commands.ts` | `claude-commands` | claude | commands | hybrid | `.claude/commands` | No |
| `claude-rules.ts` | `claude-rules` | claude | rules | hybrid | `.claude/rules` | No |
| `claude-agents.ts` | `claude-agents` | claude | agents | hybrid | `.claude/agents` | No |
| `claude-settings.ts` | `claude-settings` | claude | settings | file | `.claude` | Yes (`userTargetDir`, `userDefaultSourceDir`) |
| `claude-status-lines.ts` | `claude-status-lines` | claude | status-lines | directory | `.claude/status-lines` | Yes (`userTargetDir`, `userDefaultSourceDir`) |
| `claude-agent-memory.ts` | `claude-agent-memory` | claude | agent-memory | directory | `.claude/agent-memory` | No |

#### 2.2.2 New Commands (2 total)

1. **`import-all`** (`src/commands/import-all.ts`): Batch import with single git commit. Options: `--dry-run`, `--force`, `--interactive`, `--user`, `--push`, `--quiet`, `--message`, `--local`.
2. **`list`** (`src/commands/list.ts`): Multi-mode list command. 4 modes: (A) project config, (B) user config, (C) repo source dirs, (D) repo user-source dirs.

#### 2.2.3 Interface Extensions

| Interface | Field | Type | Purpose |
|-----------|-------|------|---------|
| `SyncAdapter` | `userTargetDir` | `string?` | Override target dir for user-mode |
| `SyncAdapter` | `userDefaultSourceDir` | `string?` | Override source dir for user-mode |
| `SyncAdapter` | `hybridFileSuffixes` | `string[]?` | File suffixes for hybrid mode |
| `SyncOptions` | `skipIgnore` | `boolean?` | Skip gitignore management in user-mode |
| `CommandContext` | `user` | `boolean?` | User-mode flag |
| `CommandContext` | `skipIgnore` | `boolean?` | Skip gitignore in user-mode |
| `AddOptions` | `user` | `boolean?` | User-mode flag |
| `AdapterConfig` | `userTargetDir` | `string?` | Factory passthrough |
| `AdapterConfig` | `userDefaultSourceDir` | `string?` | Factory passthrough |
| `AdapterConfig` | `hybridFileSuffixes` | `string[]?` | Factory passthrough |

#### 2.2.4 Other Fork Changes

- **`agents-md.ts`**: Fork overrides `addDependency` and `removeDependency` with custom flat-config handling. Upstream refactored this away in commit 13 by making the generic config path system handle `agentsMd` natively.
- **`sync-engine.ts`**: Fork adds `importEntryNoCommit()` for batch import, and user-mode routing in `importEntry()`.
- **`handlers.ts`**: Fork adds user-mode routing in `handleAdd`, dry-run preview in `handleRemove` and `handleImport`.
- **`cli/register.ts`**: Fork adds `import-all` registration and `--user` flags.
- **Version**: Fork at `0.8.0-beta.3` (upstream `0.8.1`). Fork's `commander` is `^14.0.2`, upstream's is `^13.x`.

---

## 3. Interface Conflict Points

### 3.1 `SyncAdapter.configPath` Type Change

| Side | Type | Impact |
|------|------|--------|
| Upstream (at common ancestor) | `[string, string]` (2-tuple) | Exact pair required |
| Upstream (at HEAD) | `string[]` | Relaxed to array |
| Fork | `[string, string]` (unchanged from ancestor) | Will auto-merge to `string[]` |

**Risk**: LOW. Upstream widened the type; fork's existing tuple values are valid `string[]`. Auto-merged cleanly.

### 3.2 `SyncAdapter.resolveSource` Signature Change

| Side | Signature |
|------|-----------|
| Upstream (at ancestor) | `resolveSource?(repoDir, rootPath, name): Promise<ResolvedSource>` |
| Upstream (at HEAD) | `resolveSource?(repoDir, rootPath, name, options?: { sourceFileOverride?; sourceDirOverride? }): Promise<ResolvedSource>` |
| Fork | Unchanged from ancestor |

**Risk**: LOW. The new `options` parameter is optional. Fork's existing resolvers remain valid. Auto-merged cleanly.

### 3.3 `AdapterConfig.resolveSource` Signature Change

Same pattern as `SyncAdapter.resolveSource`. Upstream added optional `options` parameter. Fork unchanged. Auto-merged.

### 3.4 `SourceDirConfig` Value Type Change

| Side | Type |
|------|------|
| Upstream (at ancestor) | `Record<string, string>` |
| Upstream (at HEAD) | `Record<string, SourceDirValue>` (union: `string \| SourceDirFileValue \| SourceDirDirectoryValue`) |
| Fork | `Record<string, string>` (unchanged) |

**Risk**: MEDIUM. Fork code that reads `SourceDirConfig` values as strings will need to handle the new object format. However, fork's `getSourceDir()`, `getRepoSourceConfig()`, and `buildRepoSourceFromNestedStrings()` calls are consumed through upstream's updated functions, so the auto-merge should handle this correctly.

### 3.5 `ProjectConfig` Index Signature Tightening

| Side | Index type |
|------|-----------|
| Upstream (at ancestor) | `[tool: string]: any` |
| Upstream (at HEAD) | `[tool: string]: number \| string \| SourceDirConfig \| SubtypeMap \| undefined` |
| Fork | `[tool: string]: any` (unchanged) |

**Risk**: MEDIUM. Fork code using `(config as any)[tool]` patterns will work but should be updated to use the new typed helpers (`getAtPath`, `setAtPath`, `getRuleSection`) for consistency.

### 3.6 New Upstream Exports Fork Must Integrate

| Export | From | Purpose |
|--------|------|---------|
| `CURRENT_CONFIG_VERSION` | `project-config.ts` | Config version field |
| `WILDCARD_TOOL` | `project-config.ts` | `'*'` fallback key |
| `SourceDirValue` | `project-config.ts` | Union type for sourceDir values |
| `SourceDirFileValue` | `project-config.ts` | File-mode sourceDir object |
| `SourceDirDirectoryValue` | `project-config.ts` | Directory-mode sourceDir object |
| `ConfigPath` | `project-config.ts` | Readonly string array for config paths |
| `getAtPath` | `project-config.ts` | Type-safe nested object access |
| `setAtPath` | `project-config.ts` | Type-safe nested object write |
| `deleteAtPath` | `project-config.ts` | Type-safe nested object delete |
| `getRuleSection` | `project-config.ts` | Get rules map at config path |
| `getConfigSectionWithFallback` | `project-config.ts` | Check tool then wildcard fallback |
| `isLocalPath` | `utils.ts` | Local path detection |
| `resolveLocalPath` | `utils.ts` | Local path resolution |
| `getRemoteUrl` | `git.ts` | Get git remote URL |
| `getFilteredAdapters` | `lifecycle.ts` (private) | Filter adapters by --only/--exclude |

---

## 4. Conflict File Cross-Reference

### 4.1 Files Modified by Both Fork and Upstream

| File | Upstream Change | Fork Change | Textual Conflict? | Dry-Run Result |
|------|----------------|-------------|-------------------|----------------|
| `.gitignore` | Added VitePress cache entries | Added `.nwave` entry | YES | Trivial |
| `CHANGELOG.md` | Version 0.7.0, 0.8.0, 0.8.1 entries | Version 0.7.0 entry | YES | Trivial -- accept fork |
| `package.json` | Version 0.8.1, added vitepress deps | Version 0.8.0-beta.3, commander ^14, vitest ^4.1 | YES | Keep fork version, merge deps |
| `pnpm-lock.yaml` | Regenerated with vitepress | Regenerated with vitest ^4.1 | YES | Delete and regenerate |
| `src/adapters/agents-md.ts` | Removed custom addDependency/removeDependency, simplified to use base adapter | Added detailed AGENTS.md path resolution improvements | YES | Semantic -- need careful merge |
| `src/adapters/base.ts` | `configPath` type, `resolveSource` signature, `createMultiSuffixResolver` override support | `userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes` passthrough | NO | Auto-merged |
| `src/adapters/index.ts` | Added `claude-agents`, `claude-rules` imports/registrations, `getConfigSectionWithFallback` usage | Added 5 fork adapter imports/registrations | NO | Auto-merged |
| `src/adapters/types.ts` | `configPath` type widened, `resolveSource` options param, `SourceDirConfig` type change | Added `userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes`, `skipIgnore` | NO | Auto-merged |
| `src/commands/handlers.ts` | Wildcard fallback integration | User-mode routing, dry-run, `forProject().remove()` | NO | Auto-merged |
| `src/index.ts` | Local path support, init --only/--exclude, version bumps | Claude subcommands, list, import-all, version interception | NO | Auto-merged |
| `src/sync-engine.ts` | sourceDir override plumbing | `importEntryNoCommit`, user-mode routing | NO | Auto-merged |
| `src/__tests__/helpers/adapter-contract.ts` | Updated for config extensibility | Updated for fork adapter fields | NO | Auto-merged |

### 4.2 Semantic Conflicts (No Textual Conflict, But Competing Implementations)

| File | Upstream Implementation | Fork Implementation | Resolution |
|------|------------------------|--------------------|-----------|
| `src/adapters/claude-rules.ts` | **file** mode, `createSingleSuffixResolver(.md)` | **hybrid** mode, `createMultiSuffixResolver(['.md'])` | Prefer fork hybrid -- strictly more capable |
| `src/adapters/claude-agents.ts` | **directory** mode, no resolver | **hybrid** mode, `createMultiSuffixResolver(['.md'])` | Prefer fork hybrid -- strictly more capable |
| `src/adapters/claude-commands.ts` | Does not exist upstream | **hybrid** mode, fork-only | No conflict |

**Note**: Upstream's `claude-rules.ts` and `claude-agents.ts` were independently created. Git will auto-merge by accepting the fork's version (since both sides added the file independently from the common ancestor). However, the upstream version will be silently overwritten. Post-merge, verify the fork's hybrid implementations are intact.

### 4.3 Fork-Only Files (No Conflict Expected)

These files exist only in the fork and should survive the merge untouched:

- `src/adapters/claude-commands.ts`
- `src/adapters/claude-settings.ts`
- `src/adapters/claude-status-lines.ts`
- `src/adapters/claude-agent-memory.ts`
- `src/commands/import-all.ts`
- `src/commands/list.ts`
- `src/commands/version.ts`
- `src/cli/register.ts` (fork-modified only)
- All fork test files (`claude-commands.test.ts`, `claude-rules.test.ts`, `claude-settings.test.ts`, `claude-status-lines.test.ts`, `claude-list.test.ts`, `handlers-user-import.test.ts`, `sync-engine-user.test.ts`, `import-user-mode.test.ts`, `handlers-coverage.test.ts`, `handlers-dry-run.test.ts`, `handle-remove-forproject.test.ts`, `version.test.ts`)

### 4.4 Upstream-Only Files (New Content to Integrate)

- `docs/` -- entire VitePress documentation site (56 files, EN + ZH)
- `.github/workflows/deploy-docs.yml` -- docs CI workflow
- `src/__tests__/claude-md.test.ts` -- new upstream test
- `src/__tests__/use-local-path.test.ts` -- new upstream test
- `src/__tests__/lifecycle-init.test.ts` -- new upstream test
- `src/__tests__/project-config-source-dir.test.ts` -- expanded upstream tests
- `tests/cursor-rules-hybrid.test.ts` -- new upstream test
- `tests/sync-engine.test.ts` -- new upstream test

---

## 5. Upstream Deletions and Renames

**None.** `git diff --diff-filter=DR aa53caac..upstream/main` returned empty. All fork imports remain valid against upstream's current file structure.

---

## 6. Pre-Merge Verification Baseline

| Metric | Fork Value |
|--------|-----------|
| Test files | 38 in `src/__tests__/` |
| Test count | 466 |
| Coverage target | >= 80% |
| Fork version | `0.8.0-beta.3` |
| Fork adapter count | 33 registered |

---

## 7. Conflict Prediction Report (Verified by Dry-Run Merge)

*Dry-run performed on 2026-03-23 on disposable branch `tmp/merge-dryrun`. Merge aborted cleanly; `main` unmodified.*

### 7.1 Dry-Run Procedure

1. Created `tmp/merge-dryrun` from `main` (`efef8b1`)
2. Ran `git merge --no-commit --no-ff upstream/main` (upstream HEAD: `6b562a3`)
3. Recorded conflicts via `git diff --name-only --diff-filter=U` -- exactly 5 files
4. Inspected each conflict's diff3 markers to classify nature
5. Verified auto-merged files have no leftover markers (`git diff --check` -- clean for all non-conflict files)
6. Verified `claude-rules.ts` and `claude-agents.ts` retain fork's hybrid implementations on disk
7. Checked upstream deletions/renames: none (`git diff --diff-filter=DR aa53caac..upstream/main` -- empty)
8. Ran `git merge --abort`, switched to `main`, deleted `tmp/merge-dryrun`

### 7.2 Conflict Prediction Table (5 Textual Conflicts)

| # | File | Category | Nature | Fork Feature | Upstream Feature | Conflict Region | Resolution Strategy |
|---|------|----------|--------|-------------|-----------------|-----------------|-------------------|
| 1 | `.gitignore` | **Trivial** | Both sides appended new entries at end-of-file. Fork added `.nwave`; upstream added VitePress cache entries (`docs/.vitepress/dist`, `docs/.vitepress/cache`). | `.nwave` config | VitePress docs site | Lines 9-17 (EOF) | Manual merge: keep both additions. Add `.nwave` line and VitePress block. |
| 2 | `CHANGELOG.md` | **Trivial** | Both sides added new version entries between the header and `## 0.6.0`. Fork has `0.7.0` entry. Upstream has `0.7.0`, `0.8.0`, `0.8.1` entries with different content. | Fork v0.7.0 changelog | Upstream v0.7.0-0.8.1 changelogs | Lines 3-39 (top section) | Accept fork version entirely. Changelog is managed via changesets (Req 9.4). |
| 3 | `package.json` | **Trivial** | Two conflict hunks: (a) `version` field -- fork `0.8.0-beta.3` vs upstream `0.8.1`; (b) `devDependencies` -- fork has `@vitest/coverage-v8` and `vitest ^4.1.0`, upstream has `vitepress` and `vitest ^4.0.16`. | Fork version + vitest ^4.1 | Upstream version + vitepress dep | Lines 3-9 (version), Lines 49-61 (devDeps) | Keep fork version `0.8.0-beta.3`; keep fork `vitest ^4.1.0` and `@vitest/coverage-v8`; add upstream's `vitepress ^1.6.4` dep. |
| 4 | `pnpm-lock.yaml` | **Trivial** | Massive lockfile divergence. Fork regenerated for `vitest ^4.1.0`; upstream regenerated for `vitepress ^1.6.4`. Hundreds of conflicting package resolution entries. | vitest upgrade | vitepress addition | Throughout (hundreds of markers) | Delete file entirely. Regenerate via `pnpm install` after resolving `package.json`. |
| 5 | `src/adapters/agents-md.ts` | **Semantic** | Single conflict hunk at lines 23-60. Fork retains `findAgentsMdInDir()` helper (directory-scan for case-insensitive macOS), `readConfigFile`/`writeConfigFile` helpers, and assigns to `baseAdapter` variable with custom `addDependency`/`removeDependency` overrides. Upstream simplified to direct `export const agentsMdAdapter = createBaseAdapter({...})` -- removed config helpers and custom dep methods because commit 13 refactored generic config path system to handle agents-md natively. | Case-insensitive AGENTS.md resolution + custom flat-config handling | Config extensibility refactor (generic config path system) | Lines 23-60 (adapter declaration) + lines 143-192 (fork's custom addDependency/removeDependency, absent from upstream) | Adopt upstream's simplified export pattern (direct `export const agentsMdAdapter`). Preserve fork's `findAgentsMdInDir()` for case-insensitive filesystem safety. Remove fork's custom `addDependency`/`removeDependency` and `readConfigFile`/`writeConfigFile` -- upstream's generic config system handles this now. The `resolveSource` body uses `findAgentsMdInDir()` (fork) instead of `for..of variant` loops (upstream) for more robust case handling. |

### 7.3 Auto-Merged Files (No Conflict -- Verified Clean)

These files were modified by both sides but merged automatically with no conflict markers:

| File | Upstream Changes | Fork Changes | Auto-Merge Quality |
|------|-----------------|-------------|-------------------|
| `src/adapters/base.ts` | `configPath: string[]`, `resolveSource` options param, `createMultiSuffixResolver` override | `userTargetDir`/`userDefaultSourceDir`/`hybridFileSuffixes` passthrough, user-mode `link()` logic | Clean -- changes in non-overlapping regions |
| `src/adapters/index.ts` | Added `claude-agents`, `claude-rules` imports + `getConfigSectionWithFallback` usage | Added 5 fork adapter imports/registrations | Clean -- different import lines and registration blocks |
| `src/adapters/types.ts` | `configPath` widened to `string[]`, `resolveSource` options param, `SourceDirConfig` value type | Added `userTargetDir`, `userDefaultSourceDir`, `hybridFileSuffixes`, `skipIgnore` | Clean -- additive fields from both sides |
| `src/commands/handlers.ts` | Wildcard config fallback integration | User-mode routing, dry-run, `forProject().remove()` | Clean -- different function bodies |
| `src/index.ts` | Local path support, `init --only/--exclude` options, version bumps | Claude subcommands, list, import-all, version interception | Clean -- changes in separate regions of the 2100-line file |
| `src/sync-engine.ts` | `sourceDir` override plumbing | `importEntryNoCommit()`, user-mode routing | Clean -- different functions |
| `src/__tests__/helpers/adapter-contract.ts` | Config extensibility updates | Fork adapter field updates | Clean |

### 7.4 Semantic Adapter Conflicts (No Textual Conflict, Competing Implementations)

These files exist in both upstream and fork but git auto-resolved them without markers. The fork's version is preserved on disk. Post-merge verification required.

| # | File | Category | Upstream Mode | Fork Mode | Git Resolution | Verification Required |
|---|------|----------|--------------|-----------|---------------|----------------------|
| 1 | `src/adapters/claude-rules.ts` | **Semantic** | `file` mode, `fileSuffixes: ['.md']`, `createSingleSuffixResolver` | `hybrid` mode, `hybridFileSuffixes: ['.md']`, `createSingleSuffixResolver` | Fork version kept (HEAD wins) | Confirm `mode: 'hybrid'` and `hybridFileSuffixes` on disk |
| 2 | `src/adapters/claude-agents.ts` | **Semantic** | `directory` mode, no resolver, no suffixes | `hybrid` mode, `hybridFileSuffixes: ['.md']`, `createSingleSuffixResolver`, `createSuffixAwareTargetResolver` | Fork version kept (HEAD wins) | Confirm `mode: 'hybrid'` and resolver functions on disk |

**Resolution rationale**: Fork's `hybrid` mode is strictly more capable than upstream's `file` or `directory` mode. Hybrid mode supports both individual files and directories, which is the fork's design decision for Claude adapters. Upstream's simpler implementations would lose this capability.

### 7.5 Upstream Deletions and Renames

**None.** `git diff --diff-filter=DR aa53caac..upstream/main` returned empty. All fork imports remain valid.

### 7.6 `sourceDir` Format Compatibility Assessment

| Aspect | Finding |
|--------|---------|
| Upstream `sourceDir` object format | `SourceDirValue = string \| SourceDirFileValue \| SourceDirDirectoryValue` -- new discriminated union in `project-config.ts` |
| Fork's `SourceDirConfig` usage | Fork uses `Record<string, string>` values (plain strings). These remain valid as the `string` arm of the `SourceDirValue` union. |
| Fork's `getSourceDir()` | Calls upstream's function, which auto-merged cleanly. Handles new union type internally. |
| Fork's `getRepoSourceConfig()` | Same -- upstream's updated version handles the new format. |
| Fork's `buildRepoSourceFromNestedStrings()` | Fork-only function. Operates on string values which remain valid. |
| Fork adapter `defaultSourceDir` fields | All use plain strings (e.g., `.claude/rules`). These are not affected by the object format change. |
| **Verdict** | **Compatible.** No fork code changes needed for `sourceDir` format. Fork adapters pass string values; upstream's updated config functions handle the union type transparently. |

### 7.7 Conflict Resolution Order (For Task 3)

Conflicts will be resolved in dependency order per the design document (section 3.3):

| Order | File | Category | Strategy |
|-------|------|----------|----------|
| 1 | `pnpm-lock.yaml` | Trivial | Delete; regenerate via `pnpm install` |
| 2 | `CHANGELOG.md` | Trivial | Accept fork version entirely |
| 3 | `.gitignore` | Trivial | Manual merge: keep both sides' additions |
| 4 | `package.json` | Trivial | Keep fork version + deps; add upstream's `vitepress` |
| 5 | `src/adapters/agents-md.ts` | Semantic | Adopt upstream's direct-export pattern; preserve fork's `findAgentsMdInDir()`; drop custom config helpers |

Post-resolution: verify the 2 semantic adapter auto-merges (`claude-rules.ts`, `claude-agents.ts`) preserved fork's hybrid mode.

---

## 8. Follow-Up Items (Post-Merge)

These upstream features will be preserved by the merge but are not yet integrated into fork-specific workflows:

1. **`init --only` / `--exclude`**: Upstream's tool-filtering for `ais init`. Works out of the box; no fork-specific integration needed.
2. **Wildcard (*) config fallback**: Upstream's `"*"` tool key in sourceDir config. Transparent to fork adapters; no action needed.
3. **`sourceDir` object format**: Upstream's `SourceDirFileValue` / `SourceDirDirectoryValue` types. Fork adapters use string sourceDir values and are unaffected, but could adopt the object format for advanced use cases in the future.
4. **Local path symlink support**: Upstream's `ais use /path/to/local/repo`. Works out of the box.
5. **VitePress documentation site**: New `docs/` directory. Fork may want to update docs to cover fork-specific features (user-mode, import-all, list command, hybrid adapters).
6. **Config version field**: Upstream's `CURRENT_CONFIG_VERSION = 1`. Fork should adopt this for future config migrations.

---

*Document created: 2026-03-23*
*Dry-run merge completed: 2026-03-23 (Task 2)*
*Status: Conflict prediction verified. Ready for Task 3 (merge execution).*
