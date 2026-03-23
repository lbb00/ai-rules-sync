# Design: Test Coverage Improvement

> Note: Design template (`.kiro/settings/templates/specs/design.md`) not found. Using inline structure.

## 1. Overview

This design describes the concrete plan to bring the project from its current baseline (67% statements, 55% branches, 69% functions, 67% lines) to 80%+ on all four dimensions globally, with every source file at or above 50%. The plan has three parts: coverage configuration, test file creation (priority-ordered), and file exclusions.

---

## 2. Coverage Configuration

### 2.1. Create `vitest.config.ts`

A new `vitest.config.ts` at project root. Vitest v4 supports glob-pattern-based thresholds alongside global thresholds, which allows the 80% global / 50% per-file split.

```
vitest.config.ts (configuration shape -- not implementation code)

test.include: ['src/__tests__/**/*.test.ts']
test.coverage:
  provider: 'v8'
  reporter: ['text', 'json-summary']
  include: ['src/**/*.ts']
  exclude:
    - 'src/__tests__/**'
    - 'src/index.ts'              # CLI entry point, 2407 lines of Commander glue
    - 'src/cli/register.ts'       # CLI wiring with process.exit
    - 'src/adapters/types.ts'     # Type-only, zero runtime
    - 'src/dotany/types.ts'       # Type-only, zero runtime
  thresholds:
    statements: 80
    branches: 80
    functions: 80
    lines: 80
    perFile: true
```

**Key decisions**:

- `perFile: true` applies the same 80/80/80/80 thresholds to every non-excluded file. Since the requirement asks for 50% per-file minimum, the tests must actually bring every included file above 80% (the global threshold applies per-file when `perFile` is true). If we want 50% per-file and 80% global, we would omit `perFile` and rely on the global aggregate. However, the gap analysis shows that covering the priority files should bring every remaining file well above 50% anyway. **Decision**: Start with `perFile: false` and global 80% thresholds. Add `perFile: true` only after confirming all files clear 80%, or adjust to glob-pattern thresholds if needed.

- **Alternative**: Use glob-pattern-based thresholds to set a lower bar for specific hard-to-test files:
  ```
  thresholds:
    statements: 80
    branches: 80
    functions: 80
    lines: 80
    'src/completion.ts':
      statements: 50
      branches: 50
      functions: 50
      lines: 50
  ```
  This is the fallback if any file proves difficult to reach 80%.

### 2.2. Exclusions Rationale

| Excluded File | Reason | Traceability |
|---|---|---|
| `src/index.ts` | 2407-line CLI entry point; Commander action handlers with `process.exit` calls; functions it delegates to are tested independently | Req 2 (per-file 50%), gap analysis recommendation |
| `src/cli/register.ts` | 269-line declarative Commander wiring; same `process.exit` issue; delegates to tested handlers | Gap analysis recommendation |
| `src/adapters/types.ts` | Type-only file (interfaces), no runtime code | N/A |
| `src/dotany/types.ts` | Type-only file (interfaces), no runtime code | N/A |
| `src/__tests__/**` | Test files, not production source | N/A |

---

## 3. Test File Plan (Priority Order)

All new test files go in `src/__tests__/` with `.test.ts` suffix. All imports use `.js` extensions per ESM NodeNext convention.

### Priority 0 -- Required by Spec (Req 3)

| # | New Test File | Covers | Mock Strategy | Est. Tests |
|---|---|---|---|---|
| 1 | `git.test.ts` | `src/git.ts` (99 lines, 0% coverage) | Mock `execa` for git subprocess calls; mock `fs-extra.pathExists` for local repo detection | 15-20 |
| 2 | `git-repo-source.test.ts` | `src/plugin/git-repo-source.ts` (104 lines, ~6%) | Mock `project-config.js` functions (`getRepoSourceConfig`, `getSourceDir`); mock `GitSource` | 12-18 |

**What to test in `git.ts`**: `isLocalRepo` (with/without upstream), `stripUrlCredentials` (various URL formats), `getRemoteUrl` (success/error), `cloneOrUpdateRepo` (clone path, pull path, re-clone on error), `runGitCommand` (success/failure).

**What to test in `git-repo-source.ts`**: `GitRepoSource.resolve()` (static repo, dynamic resolver, null repo), `resolveFromManifest()`, `destinationPath()`, error cases for null/missing repos.

### Priority 1 -- High Coverage Impact (Req 4)

| # | New Test File | Covers | Mock Strategy | Est. Tests |
|---|---|---|---|---|
| 3 | `add-all.test.ts` | `src/commands/add-all.ts` (440 lines) | Mock `fs-extra`, adapter `link`/`addDependency` methods; mock interactive prompts | 15-25 |
| 4 | `import-all.test.ts` | `src/commands/import-all.ts` (475 lines) | Mock `fs-extra`, `execa` (git commit/push), adapter methods, `sync-engine.js` | 15-20 |
| 5 | `completion.test.ts` | `src/completion.ts` (293 lines) | Mock `process.env.SHELL`, `process.platform`, `fs-extra`, `config.js`, `readline` | 15-25 |
| 6 | `source-dir-parser.test.ts` | `src/cli/source-dir-parser.ts` (102 lines) | Pure functions, minimal mocking | 10-15 |
| 7 | `config.test.ts` | `src/config.ts` (99 lines) | Mock `fs-extra` | 10-15 |
| 8 | `utils.test.ts` | `src/utils.ts` (107 lines) | Mock `fs-extra` for gitignore operations | 10-15 |

**What to test in `add-all.ts`**: `discoverEntriesForAdapter` (file/directory/hybrid modes), `discoverAllEntries` (filter by tools/adapters), `installDiscoveredEntries` (skip-existing, dry-run, interactive confirmation), `handleAddAll` (end-to-end flow with mocked deps).

**What to test in `import-all.ts`**: `discoverProjectEntriesForAdapter`, `discoverAllProjectEntries`, `importDiscoveredEntries` (batch git commit, push, error handling), `handleImportAll`.

**What to test in `completion.ts`**: `detectShell` (bash/zsh/fish/unknown), `getShellConfigPath` (per platform), `getCompletionSnippet`, `isCompletionInstalled`, `installCompletionToFile`, `removeCompletionCode`, `checkAndPromptCompletion`, `forceInstallCompletion`.

**What to test in `source-dir-parser.ts`**: Simple format parsing, dot-notation parsing, error cases for missing context/invalid format.

**What to test in `config.ts`**: `getConfig`/`setConfig` (read/write cycle), `getCurrentRepo`, `getUserConfigPath`, `getUserProjectConfig`/`saveUserProjectConfig`, edge cases (missing files, tilde expansion, malformed JSON).

**What to test in `utils.ts`**: `isLocalPath` (absolute, relative, tilde, URLs), `resolveLocalPath` (tilde expansion, absolute passthrough), `addIgnoreEntry`/`removeIgnoreEntry` (new file, existing file, duplicate avoidance, removal from middle/end).

### Priority 2 -- Fill Gaps to Reach 80% (Req 4)

| # | New Test File | Covers | Mock Strategy | Est. Tests |
|---|---|---|---|---|
| 9 | `dotany-sources.test.ts` | `src/dotany/sources/filesystem.ts` (31 lines), `src/dotany/sources/git.ts` (51 lines) | Mock `fs-extra`, `execa` | 12-18 |
| 10 | `dotany-manifest.test.ts` | `src/dotany/manifest/json.ts` (55 lines) | Mock `fs-extra` | 8-12 |
| 11 | `dotany-composer.test.ts` | `src/dotany/composer.ts` (27 lines) | Mock `DotfileManager` instances | 4-6 |
| 12 | `ai-rules-sync-manifest.test.ts` | `src/plugin/ai-rules-sync-manifest.ts` (66 lines) | Mock `project-config.js` | 8-12 |
| 13 | `adapters-untested.test.ts` | All 16 untested adapters (see below) | Uses existing `runStandardAdapterContract()` helper | 80 |

### Priority 2 -- Untested Adapters Detail

The following 16 adapters have no dedicated test file. Each is a small file (~10-25 lines) using `createBaseAdapter`. A single parametric test file runs the shared contract for all of them.

| Adapter File | Tool | Subtype |
|---|---|---|
| `cursor-rules.ts` | cursor | rules |
| `cursor-commands.ts` | cursor | commands |
| `cursor-skills.ts` | cursor | skills |
| `cursor-agents.ts` | cursor | agents |
| `claude-skills.ts` | claude | skills |
| `claude-agents.ts` | claude | agents |
| `claude-agent-memory.ts` | claude | agent-memory |
| `copilot-instructions.ts` | copilot | instructions |
| `codex-rules.ts` | codex | rules |
| `codex-skills.ts` | codex | skills |
| `opencode-agents.ts` | opencode | agents |
| `opencode-commands.ts` | opencode | commands |
| `opencode-skills.ts` | opencode | skills |
| `opencode-tools.ts` | opencode | tools |
| `trae-rules.ts` | trae | rules |
| `trae-skills.ts` | trae | skills |

**Pattern**: Each adapter test block follows the same shape as `claude-rules.test.ts` -- import the adapter and registry, call `runStandardAdapterContract()` with the expected properties. The parametric test file will use `describe.each` or a loop over an array of adapter configurations.

---

## 4. Testing Strategy by File Category

### 4.1. Adapters (`src/adapters/*.ts`)

- **Approach**: Shared contract test via `runStandardAdapterContract()`
- **What it validates**: Property values (name, tool, subtype, defaultSourceDir, targetDir, mode, configPath, fileSuffixes), registry registration, required method presence
- **Mock needs**: None (adapters are pure configuration objects)

### 4.2. Commands (`src/commands/*.ts`)

- **Approach**: Unit test each exported function independently
- **What it validates**: Discovery logic, filtering, dry-run behavior, error handling, git operations (commit/push)
- **Mock needs**: Heavy mocking -- `fs-extra` (readdir, pathExists, stat), `execa` (git), adapter methods (link, unlink, addDependency, removeDependency), `sync-engine.js` (linkEntry, importEntry), `project-config.js` (read/write config), readline (interactive prompts)
- **Branch coverage focus**: add-all.ts has file/directory/hybrid mode branches; import-all.ts has commit/push/error branches

### 4.3. Plugins (`src/plugin/*.ts`)

- **Approach**: Unit test with mocked dependencies
- **What it validates**: Source resolution, manifest read/write/delete, error handling
- **Mock needs**: `project-config.js`, `GitSource` class, `fs-extra`

### 4.4. Utilities (`src/config.ts`, `src/utils.ts`, `src/completion.ts`)

- **Approach**: Unit test each exported function
- **What it validates**: Config CRUD, path handling, shell detection, gitignore manipulation
- **Mock needs**: `fs-extra`, `process.env`, `process.platform`, `readline`

### 4.5. Dotany Layer (`src/dotany/*.ts`)

- **Approach**: Unit test sources, manifest, and composer independently
- **What it validates**: Source resolution, file listing, manifest persistence, multi-manager orchestration
- **Mock needs**: `fs-extra`, `execa` (for git source)

---

## 5. Coverage Impact Projection

### Lines to Cover

| Priority | Files | Est. Lines Covered | Cumulative Coverage Gain |
|---|---|---|---|
| P0 | git.ts, git-repo-source.ts | ~175-185 | +1.5-2% |
| P1 | add-all, import-all, completion, source-dir-parser, config, utils | ~1,000-1,100 | +10-11% |
| P2 | dotany sources/manifest/composer, ai-rules-sync-manifest, 16 adapters | ~390-470 | +4-5% |
| **Total** | | **~1,565-1,755** | **+15.5-18%** |

**Projected final coverage**: 82-85% on all dimensions (from 67% baseline).

### Branch Coverage Strategy

Branch coverage is the lowest dimension at 55%. Files with the most uncovered branches:

1. **`src/commands/add-all.ts`** -- file/directory/hybrid mode detection, filter flags, skip-existing logic
2. **`src/commands/import-all.ts`** -- commit batching, push vs no-push, error recovery
3. **`src/completion.ts`** -- shell type detection (bash/zsh/fish/unknown), platform-specific paths, installed-check branches
4. **`src/config.ts`** -- missing file fallbacks, tilde expansion edge cases
5. **`src/git.ts`** -- clone vs pull vs re-clone paths, credential stripping patterns

Each test file must explicitly test both sides of every conditional to maximize branch coverage.

---

## 6. Implementation Order

Recommended execution order (combines requirements-first with impact ordering):

1. **Create `vitest.config.ts`** with exclusions and global 80% thresholds (Req 6)
2. **P0**: `git.test.ts` then `git-repo-source.test.ts` (Req 3)
3. **P1 high-impact**: `add-all.test.ts`, `import-all.test.ts` (Req 4, largest coverage gain)
4. **P1 medium**: `completion.test.ts`, `source-dir-parser.test.ts` (Req 4)
5. **P1 small**: `config.test.ts`, `utils.test.ts` (Req 4)
6. **P2 dotany**: `dotany-sources.test.ts`, `dotany-manifest.test.ts`, `dotany-composer.test.ts` (Req 4)
7. **P2 plugin**: `ai-rules-sync-manifest.test.ts` (Req 4)
8. **P2 adapters**: `adapters-untested.test.ts` parametric file (Req 4)
9. **Verify**: Run `vitest run --coverage`, confirm 80%+ global, review per-file numbers
10. **Tune**: Enable `perFile: true` or add glob-pattern thresholds if any file is below 50%

---

## 7. Verification Approach

### 7.1. Per-Step Verification

After each test file is created:
1. Run `vitest run` -- confirm all tests pass (existing + new), zero failures
2. Run `vitest run --coverage` -- confirm coverage numbers are increasing
3. Check that no existing tests have been broken or skipped

### 7.2. Final Verification

After all test files are in place:
1. `vitest run --coverage` must exit 0 (thresholds enforced)
2. Coverage report shows 80%+ on statements, branches, functions, lines
3. No individual included file is below 50% on any dimension
4. No `it.skip`, `describe.skip`, or `it.todo` in new test files (Req 5.1)
5. All new test files are in `src/__tests__/` with `.test.ts` suffix (Req 5.2)
6. All imports use `.js` extensions (Req 5.4)

### 7.3. Regression Safety

- The 466 existing tests must all continue to pass
- New `vitest.config.ts` must not change test discovery for existing files (verify the `include` pattern matches current behavior)
- If `vitest.config.ts` introduces any behavioral change to existing tests, investigate and fix before proceeding

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `perFile: true` applies global 80% threshold per-file, not 50% | Files between 50-80% would fail | Start with `perFile: false`; use glob-pattern thresholds for specific files if needed |
| Mock complexity in add-all/import-all causes brittle tests | Tests break on unrelated changes | Mock at module boundaries only; test public function behavior, not internal calls |
| Branch coverage remains below 80% despite line coverage passing | Threshold check fails | Explicitly test both sides of every conditional; prioritize branch-heavy files |
| `vitest.config.ts` changes test discovery or behavior | Existing tests break | Verify 466 existing tests pass immediately after creating config, before adding new tests |
| Some adapters may have unique properties not covered by contract tests | False sense of coverage | Review each adapter file before adding to parametric test; add adapter-specific assertions where needed |

---

## Requirements Traceability

| Requirement | Design Section | Verification |
|---|---|---|
| 1 (80%+ overall thresholds) | Sec 2.1 vitest.config.ts, Sec 5 projection | Sec 7.2 final verification |
| 2 (50%+ per-file) | Sec 2.1 thresholds, Sec 2.2 exclusions | Sec 7.2 final verification |
| 3 (critical gaps: git.ts, git-repo-source.ts) | Sec 3 Priority 0 | Sec 7.1 per-step verification |
| 4 (files below 50%) | Sec 3 Priority 1 and 2 | Sec 7.2 final verification |
| 5 (test quality standards) | Sec 4 testing strategy, conventions | Sec 7.2 items 4-6 |
| 6 (coverage configuration) | Sec 2.1 vitest.config.ts | Sec 7.2 item 1 |
