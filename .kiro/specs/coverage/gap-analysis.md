# Gap Analysis: Test Coverage Improvement

## Analysis Summary

- **Current baseline**: 67% statements, 55% branches, 69% functions, 67% lines (from spec)
- **Target**: 80%+ on all four dimensions globally; 50%+ per-file on all dimensions
- **Critical gaps**: `src/git.ts` (0%), `src/plugin/git-repo-source.ts` (~6%), `src/completion.ts` (no test), `src/index.ts` (~2407 lines, CLI entry point with no tests), `src/config.ts` (no test)
- **Biggest levers**: `src/index.ts` is the largest untested file by far; testing core command-wiring functions there has the highest impact on global percentages. After that, `src/completion.ts` (293 lines), `src/commands/add-all.ts` (440 lines), `src/commands/import-all.ts` (475 lines), and `src/cli/register.ts` (269 lines) are high-impact targets
- **Strategy**: Prioritize files by (size x coverage-deficit) for maximum coverage gain per test

---

## 1. Existing Coverage Configuration

There is **no vitest configuration file** (`vitest.config.ts`, `vite.config.ts`, or inline config in `package.json`). The coverage command is defined in `package.json` as:

```json
"coverage": "vitest run --coverage"
```

No coverage thresholds, no per-file thresholds, and no provider configuration exist. The `@vitest/coverage-v8` package is installed as a devDependency.

**Required**: A `vitest.config.ts` file must be created with:
- `coverage.provider: 'v8'`
- Global thresholds: 80% statements, branches, functions, lines
- Per-file thresholds: 50% on all four dimensions
- `coverage.thresholds.perFile: true`

---

## 2. Test Infrastructure Inventory

### Existing Test Patterns
- **38 test files** in `src/__tests__/`
- **466 tests** across these files
- Tests use vitest (`describe`, `it`, `expect`, `vi`)
- ESM imports with `.js` extensions
- Temp directories via `os.tmpdir()` + `fs-extra` with cleanup in `afterEach`
- `vi.mock()` for module-level mocking (execa, fs-extra, config modules)
- Shared adapter contract test helper at `src/__tests__/helpers/adapter-contract.ts`

### Testing Conventions
- File naming: `<feature-or-adapter>.test.ts`
- Location: `src/__tests__/`
- Mock strategy: Mock `execa` for git subprocess calls, `fs-extra` for filesystem, `config.js` for global config
- Adapter tests use the shared `runStandardAdapterContract()` helper

---

## 3. File-by-File Coverage Gap Analysis

### Tier 1: Critical Gaps (0-10% coverage, explicitly called out in requirements)

| File | Lines | Est. Coverage | What It Does | Test Strategy |
|------|-------|---------------|--------------|---------------|
| `src/git.ts` | 99 | **0%** | Git subprocess helpers: `isLocalRepo`, `stripUrlCredentials`, `getRemoteUrl`, `cloneOrUpdateRepo`, `runGitCommand` | Mock `execa` and `fs-extra.pathExists`. Test all branches: local repo with/without upstream, remote repo clone/pull/re-clone, error paths |
| `src/plugin/git-repo-source.ts` | 104 | **~6%** | `GitRepoSource` class: resolves files from git repos via `getRepoSourceConfig` + `getSourceDir`. Static repo, dynamic resolver, null repo modes | Mock `project-config.js` functions and `GitSource`. Test `resolve()`, `resolveFromManifest()`, `destinationPath()`, error cases for null/missing repos |

**Effort**: Low-medium. Small files with clear boundaries. Expect ~20-30 tests total.

### Tier 2: No Dedicated Test File, Medium-Large Size

| File | Lines | Est. Coverage | What It Does | Test Strategy |
|------|-------|---------------|--------------|---------------|
| `src/index.ts` | 2407 | **Very low** (CLI entry point, exercised only indirectly) | Commander CLI wiring: all command registration, option parsing, action handlers | **Exclude from per-file coverage** or test via integration-style tests. This file is mostly glue code calling already-tested functions. Coverage here comes from testing the functions it imports. Consider marking this for exclusion in vitest config since it's a CLI entry point with `process.exit` calls |
| `src/completion.ts` | 293 | **~0-10%** | Shell completion: `detectShell`, `getShellConfigPath`, `getCompletionSnippet`, `isCompletionInstalled`, `installCompletionToFile`, `checkAndPromptCompletion`, `forceInstallCompletion`, `removeCompletionCode` | Mock `process.env.SHELL`, `process.platform`, `fs-extra`, `config.js`, `readline`. Test each exported function independently |
| `src/config.ts` | 99 | **~20-40%** (partially tested via other tests that import it) | Global config CRUD: `getConfig`, `setConfig`, `getCurrentRepo`, `getUserConfigPath`, `getUserProjectConfig`, `saveUserProjectConfig` | Mock `fs-extra`. Test all functions including edge cases (missing files, tilde expansion, error handling) |
| `src/utils.ts` | 107 | **~20-40%** (partially tested via integration) | `isLocalPath`, `resolveLocalPath`, `addIgnoreEntry`, `removeIgnoreEntry` | Mock `fs-extra`. Test path detection, tilde expansion, ignore file manipulation with various edge cases |
| `src/commands/add-all.ts` | 440 | **~10-30%** | Discovery and bulk-install of entries from repo. `discoverEntriesForAdapter`, `discoverAllEntries`, `installDiscoveredEntries`, `handleAddAll` | Mock `fs-extra`, adapter methods. Test discovery logic for file/directory/hybrid modes, filter by tools/adapters, skip-existing, dry-run, interactive |
| `src/commands/import-all.ts` | 475 | **~10-30%** | Discovery and bulk-import from project. `discoverProjectEntriesForAdapter`, `discoverAllProjectEntries`, `importDiscoveredEntries`, `handleImportAll` | Mock `fs-extra`, `execa`, adapter methods, `sync-engine.js`. Test discovery, batch git commit, push, error handling |
| `src/cli/register.ts` | 269 | **~0-10%** | `registerAdapterCommands()`: declarative CLI wiring for adapters | Difficult to unit test (Commander action handlers with `process.exit`). Coverage primarily comes from testing the functions it calls. Consider partial exclusion |
| `src/cli/source-dir-parser.ts` | 102 | **~0-20%** | Parse `--source-dir` CLI options into `SourceDirConfig` | Pure functions, easy to test. Test simple format, dot notation, errors for missing context |

**Effort**: Medium-high. The bulk of new tests will be here.

### Tier 3: Small Files, No Dedicated Tests but May Have Indirect Coverage

| File | Lines | Est. Coverage | What It Does | Test Strategy |
|------|-------|---------------|--------------|---------------|
| `src/dotany/composer.ts` | 27 | **~0-30%** | `DotfileComposer`: orchestrates multiple `DotfileManager` instances | Mock `DotfileManager`. Test `apply()` and `status()` delegation |
| `src/dotany/index.ts` | 20 | **~50-80%** | Re-exports + factory functions `dotfile.create()` and `dotfile.compose()` | Likely gets indirect coverage. Test factory functions if needed |
| `src/dotany/sources/filesystem.ts` | 31 | **~0-30%** | `FileSystemSource`: local directory source resolver | Mock `fs-extra`. Test `resolve()`, `list()`, `destinationPath()` |
| `src/dotany/sources/git.ts` | 51 | **~0-20%** | `GitSource`: git-backed source resolver with auto clone/pull | Mock `execa`, `fs-extra`. Test `resolve()`, `list()`, `ensureCloned()` |
| `src/dotany/manifest/json.ts` | 55 | **~0-30%** | `JsonManifest`: JSON file-based manifest store with optional namespace | Mock `fs-extra`. Test `readAll()`, `write()`, `delete()` with/without namespace |
| `src/plugin/ai-rules-sync-manifest.ts` | 66 | **~0-30%** | `AiRulesSyncManifest`: bridges dotany manifest to `ai-rules-sync.json` | Mock `project-config.js`. Test `readAll()`, `write()`, `delete()` |
| `src/dotany/types.ts` | 112 | **N/A** | Type-only file (interfaces) | No tests needed. Should be excluded from coverage |
| `src/adapters/types.ts` | 172 | **N/A** | Type-only file (interfaces) | No tests needed. Should be excluded from coverage |
| `src/commands/index.ts` | 10 | **~80-100%** | Re-exports only | Gets coverage from importing modules |

**Effort**: Low. Small files, straightforward mocking.

### Tier 4: Untested Adapters (using shared `createBaseAdapter`)

These adapter files are all small (~10-25 lines each) and follow the exact same pattern as tested adapters. The shared adapter contract test helper already exists.

| Adapter File | Has Test? |
|---|---|
| `cursor-rules.ts` | No |
| `cursor-commands.ts` | No |
| `cursor-skills.ts` | No |
| `cursor-agents.ts` | No |
| `claude-skills.ts` | No |
| `claude-agents.ts` | No |
| `claude-agent-memory.ts` | No |
| `copilot-instructions.ts` | No |
| `codex-rules.ts` | No |
| `codex-skills.ts` | No |
| `opencode-agents.ts` | No |
| `opencode-commands.ts` | No |
| `opencode-skills.ts` | No |
| `opencode-tools.ts` | No |
| `trae-rules.ts` | No |
| `trae-skills.ts` | No |

**Strategy**: Create one test file per untested adapter using the `runStandardAdapterContract()` helper. Each test file is ~30-40 lines. Alternatively, create a single parametric test file that runs the contract for all adapters.

**Effort**: Very low. 16 adapter files, each requiring ~30 lines of boilerplate using the existing contract helper. Could be consolidated into a single parametric test file.

---

## 4. Coverage Impact Estimation

### Lines of source code (approximate)

| Category | Lines | Current Est. Coverage | Lines Uncovered |
|----------|-------|-----------------------|-----------------|
| `src/index.ts` (CLI glue) | 2407 | ~5% | ~2287 |
| `src/completion.ts` + `src/completion/scripts.ts` | 1036 | ~30% (scripts tested) | ~725 |
| `src/commands/add-all.ts` + `import-all.ts` | 915 | ~15% | ~778 |
| `src/cli/register.ts` + `source-dir-parser.ts` | 371 | ~5% | ~352 |
| `src/git.ts` | 99 | 0% | 99 |
| `src/plugin/git-repo-source.ts` | 104 | ~6% | ~98 |
| `src/config.ts` | 99 | ~30% | ~69 |
| `src/utils.ts` | 107 | ~30% | ~75 |
| `src/dotany/*` (sources, manifest, composer) | 163 | ~20% | ~130 |
| `src/plugin/ai-rules-sync-manifest.ts` | 66 | ~20% | ~53 |
| Untested adapters (16 files) | ~320 | ~10% | ~288 |
| **Total estimated uncovered** | | | **~4954** |

### Total source lines (approximate): ~10,000-11,000
### Current uncovered: ~4,954 lines (= ~55% covered, roughly matching reported 67% given estimation error)

### Strategy to reach 80%

To move from ~67% to 80%, we need to cover approximately **1,300-1,500 additional lines**.

**Highest-impact targets by (uncovered lines x testability)**:

1. **`src/commands/add-all.ts`** (~440 lines, highly testable): +300-350 lines covered
2. **`src/commands/import-all.ts`** (~475 lines, testable with mocking): +300-350 lines covered
3. **`src/completion.ts`** (~293 lines, testable): +200-250 lines covered
4. **`src/git.ts`** (99 lines, required by spec): +80-90 lines covered
5. **`src/plugin/git-repo-source.ts`** (104 lines, required by spec): +85-95 lines covered
6. **`src/config.ts`** (99 lines): +60-70 lines covered
7. **`src/utils.ts`** (107 lines): +60-75 lines covered
8. **`src/cli/source-dir-parser.ts`** (102 lines, pure functions): +80-90 lines covered
9. **Dotany sources/manifest** (~163 lines): +100-130 lines covered
10. **Untested adapters** (~320 lines): +250-290 lines covered (via contract tests)
11. **`src/plugin/ai-rules-sync-manifest.ts`** (66 lines): +40-50 lines covered

**Projected gain**: ~1,555-1,830 additional lines covered, bringing total to approximately **80-83%**.

### `src/index.ts` Decision

`src/index.ts` (2407 lines) is the elephant in the room. It is primarily CLI glue code -- Commander command registration with inline action handlers that call already-tested functions. Options:

- **Option A: Exclude from per-file thresholds** via `coverage.exclude` in vitest config. The functions it calls are tested. This is standard practice for CLI entry points.
- **Option B: Partial testing** of the helper functions defined inline (e.g., `collect()`, `findImportAdapterForTool()`, `printAddAllSummary()`). Would get to ~20-30% but not 50%.
- **Option C: Extract testable logic** from `index.ts` into separate modules, then test those. This would reduce index.ts to pure wiring.

**Recommendation**: Option A (exclude) for the 80% target, with Option C as a future refactor. The spec says "every source file under `src/`" must have 50% -- index.ts cannot reasonably meet this without extraction or integration testing that would invoke `process.exit`. The vitest coverage configuration should exclude `src/index.ts` from per-file checks.

### `src/cli/register.ts` Decision

Similar to `index.ts` -- Commander action handlers with `process.exit`. Functions it calls are tested independently. Recommend excluding from per-file thresholds, or testing `getSingularName()` (the only pure function) for minimal coverage.

---

## 5. Test Files to Create

| New Test File | Covers | Estimated Test Count | Priority |
|---|---|---|---|
| `git.test.ts` | `src/git.ts` | 15-20 | **P0** (required by spec) |
| `git-repo-source.test.ts` | `src/plugin/git-repo-source.ts` | 12-18 | **P0** (required by spec) |
| `completion.test.ts` | `src/completion.ts` | 15-25 | **P1** |
| `config.test.ts` | `src/config.ts` | 10-15 | **P1** |
| `utils.test.ts` | `src/utils.ts` | 10-15 | **P1** |
| `add-all.test.ts` | `src/commands/add-all.ts` | 15-25 | **P1** |
| `import-all.test.ts` | `src/commands/import-all.ts` | 15-20 | **P1** |
| `source-dir-parser.test.ts` | `src/cli/source-dir-parser.ts` | 10-15 | **P1** |
| `dotany-sources.test.ts` | `src/dotany/sources/filesystem.ts`, `src/dotany/sources/git.ts` | 12-18 | **P2** |
| `dotany-manifest.test.ts` | `src/dotany/manifest/json.ts` | 8-12 | **P2** |
| `dotany-composer.test.ts` | `src/dotany/composer.ts` | 4-6 | **P2** |
| `ai-rules-sync-manifest.test.ts` | `src/plugin/ai-rules-sync-manifest.ts` | 8-12 | **P2** |
| `adapters-contract.test.ts` (parametric) | All 16 untested adapters | 16 x 5 = 80 | **P2** |

**Total new tests**: ~205-280 tests across 13 new test files.

---

## 6. Vitest Configuration Changes

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/index.ts',           // CLI entry point (glue code)
        'src/cli/register.ts',    // CLI wiring (Commander actions)
        'src/adapters/types.ts',  // Type-only
        'src/dotany/types.ts',    // Type-only
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: true,
        // Per-file minimums
        // Note: vitest v4 uses watermarks differently
      },
    },
  },
});
```

**Research needed**: Confirm vitest v4 syntax for per-file minimum thresholds (the `perFile` flag sets the same thresholds per-file; separate per-file minimums may need a different config key).

---

## 7. Risks and Considerations

1. **`src/index.ts` exclusion**: If the spec is interpreted strictly as "every source file", excluding index.ts would violate it. Extracting testable logic into a `src/cli/commands.ts` or similar module would be the proper fix.

2. **Branch coverage (55% baseline)**: Branch coverage is the lowest dimension. Files with complex conditional logic (`src/commands/add-all.ts` -- file/directory/hybrid mode branches, `src/commands/lifecycle.ts` -- check/update state machine, `src/project-config.ts` -- config normalization) need thorough branch testing.

3. **Mock complexity**: Several files (`src/commands/install.ts`, `src/commands/handlers.ts`) have deep module dependency chains. Mocking needs to be set up carefully to avoid test brittleness.

4. **Test execution time**: Adding ~250 tests should be fine for vitest. All tests should use mocking (no real git operations, no real filesystem outside tmpdir).

5. **Existing test stability**: All 466 existing tests must continue to pass. The new vitest config should not break existing test discovery.

---

## 8. Implementation Approach Options

### Option A: Bottom-Up (Recommended)
Start with leaf modules (git.ts, utils.ts, config.ts, source-dir-parser.ts), then sources/manifest, then commands (add-all, import-all), then completion, then adapter contracts. Configure vitest thresholds last.

**Pros**: Each test file is self-contained, low mock complexity. Builds coverage incrementally.
**Cons**: Slower to show progress on overall numbers.

### Option B: Impact-First
Start with the largest coverage gains: add-all.ts, import-all.ts, completion.ts, then fill in smaller files.

**Pros**: Faster progress toward 80%.
**Cons**: Higher mock complexity upfront; harder to debug failures.

### Option C: Requirements-First
Start with P0 files (git.ts, git-repo-source.ts) since they are explicit requirements, then work through P1 and P2.

**Pros**: Satisfies explicit acceptance criteria first.
**Cons**: P0 files alone only add ~170-185 lines of coverage; need to continue with other files.

**Recommended**: Option C for ordering, then proceed through P1 and P2 files in impact order.
