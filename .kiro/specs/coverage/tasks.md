# Tasks: Test Coverage Improvement

## Task 1: Create vitest configuration with coverage thresholds and exclusions (P)

**Requirements:** R1, R2, R6

Create a `vitest.config.ts` at project root that configures the v8 coverage provider, sets global thresholds of 80% on statements/branches/functions/lines, includes all `src/**/*.ts` files, and excludes test files, type-only files (`src/adapters/types.ts`, `src/dotany/types.ts`), and hard-to-test CLI entry points (`src/index.ts`, `src/cli/register.ts`). Start with `perFile: false` and global 80% thresholds. Verify the existing 466 tests still pass and produce coverage output after adding the config. Include `text` and `json-summary` reporters.

- [x] Create `vitest.config.ts` with v8 provider, test include pattern, coverage include/exclude, and global 80% thresholds
- [x] Run `vitest run` to confirm all existing tests pass with the new config
- [x] Run `vitest run --coverage` to confirm coverage output is produced and baseline numbers are visible

## Task 2: Write unit tests for git.ts (P)

**Requirements:** R3, R5

Write unit tests for `src/git.ts` in `src/__tests__/git.test.ts`. Mock `execa` for all git subprocess calls and `fs-extra.pathExists` for local repo detection. Cover `isLocalRepo` (with/without upstream remote), `stripUrlCredentials` (HTTPS with credentials, SSH URLs, clean URLs), `getRemoteUrl` (success and error), `cloneOrUpdateRepo` (clone path, pull path, re-clone on pull failure), and `runGitCommand` (success and failure). Test both sides of every conditional to maximize branch coverage. Confirm the file reaches at least 50% coverage on all four dimensions.

- [x] Write tests covering all exported functions with both success and error paths
- [x] Run tests and confirm all pass with zero failures
- [x] Run coverage and confirm `src/git.ts` reports at least 50% on all dimensions

## Task 3: Write unit tests for git-repo-source.ts (P)

**Requirements:** R3, R5

Write unit tests for `src/plugin/git-repo-source.ts` in `src/__tests__/git-repo-source.test.ts`. Mock `project-config.js` functions (`getRepoSourceConfig`, `getSourceDir`) and the `GitSource` class. Cover `GitRepoSource.resolve()` (static repo, dynamic resolver, null repo), `resolveFromManifest()`, `destinationPath()`, and error cases for null/missing repos. Use `.js` extensions in all imports and follow existing test conventions.

- [x] Write tests for all public methods with mocked dependencies
- [x] Run tests and confirm all pass with zero failures
- [x] Run coverage and confirm `src/plugin/git-repo-source.ts` reports at least 50% on all dimensions

## Task 4: Write unit tests for add-all.ts (P)

**Requirements:** R4, R5

Write unit tests for `src/commands/add-all.ts` in `src/__tests__/add-all.test.ts`. Mock `fs-extra` (readdir, pathExists, stat), adapter `link`/`addDependency` methods, and interactive prompts (readline). Cover `discoverEntriesForAdapter` (file, directory, and hybrid modes), `discoverAllEntries` (filtering by tools/adapters), `installDiscoveredEntries` (skip-existing, dry-run, interactive confirmation), and `handleAddAll` (end-to-end flow). Explicitly test both sides of every conditional -- file/directory/hybrid mode detection, filter flags, skip-existing logic -- to maximize branch coverage.

- [x] Write tests for discovery logic, installation logic, and the main handler
- [x] Run tests and confirm all pass with zero failures
- [x] Run coverage and confirm `src/commands/add-all.ts` reports at least 50% on all dimensions

## Task 5: Write unit tests for import-all.ts (P)

**Requirements:** R4, R5

Write unit tests for `src/commands/import-all.ts` in `src/__tests__/import-all.test.ts`. Mock `fs-extra`, `execa` (git commit/push), adapter methods, and `sync-engine.js` (linkEntry, importEntry). Cover `discoverProjectEntriesForAdapter`, `discoverAllProjectEntries`, `importDiscoveredEntries` (batch git commit, push, error handling), and `handleImportAll`. Test commit batching, push vs no-push, and error recovery branches.

- [x] Write tests for discovery, import, and the main handler with both success and error paths
- [x] Run tests and confirm all pass with zero failures
- [x] Run coverage and confirm `src/commands/import-all.ts` reports at least 50% on all dimensions

## Task 6: Write unit tests for completion.ts (P)

**Requirements:** R4, R5

Write unit tests for `src/completion.ts` in `src/__tests__/completion.test.ts`. Mock `process.env.SHELL`, `process.platform`, `fs-extra`, `config.js`, and `readline`. Cover `detectShell` (bash/zsh/fish/unknown), `getShellConfigPath` (per platform), `getCompletionSnippet`, `isCompletionInstalled`, `installCompletionToFile`, `removeCompletionCode`, `checkAndPromptCompletion`, and `forceInstallCompletion`. Test platform-specific branches for both macOS and Linux paths.

- [x] Write tests for all exported functions including platform and shell variations
- [x] Run tests and confirm all pass with zero failures
- [x] Run coverage and confirm `src/completion.ts` reports at least 50% on all dimensions

## Task 7: Write unit tests for source-dir-parser.ts, config.ts, and utils.ts (P)

**Requirements:** R4, R5

Write three test files covering smaller utility modules:

For `src/cli/source-dir-parser.ts` in `src/__tests__/source-dir-parser.test.ts`: test simple format parsing, dot-notation parsing, and error cases for missing context or invalid format. These are pure functions requiring minimal mocking.

For `src/config.ts` in `src/__tests__/config.test.ts`: mock `fs-extra` and test `getConfig`/`setConfig` (read/write cycle), `getCurrentRepo`, `getUserConfigPath`, `getUserProjectConfig`/`saveUserProjectConfig`, and edge cases (missing files, tilde expansion, malformed JSON).

For `src/utils.ts` in `src/__tests__/utils.test.ts`: mock `fs-extra` for gitignore operations and test `isLocalPath` (absolute, relative, tilde, URLs), `resolveLocalPath` (tilde expansion, absolute passthrough), `addIgnoreEntry`/`removeIgnoreEntry` (new file, existing file, duplicate avoidance, removal).

- [x] Write `source-dir-parser.test.ts` with parsing tests and error cases
- [x] Write `config.test.ts` with config CRUD tests and edge cases
- [x] Write `utils.test.ts` with path detection and gitignore manipulation tests
- [x] Run all three test files and confirm all pass with zero failures

## Task 8: Write unit tests for dotany layer modules (P)

**Requirements:** R4, R5

Write tests covering the dotany abstraction layer:

For `src/dotany/sources/filesystem.ts` and `src/dotany/sources/git.ts` in `src/__tests__/dotany-sources.test.ts`: mock `fs-extra` and `execa`, test `resolve()`, `list()`, `destinationPath()`, and `ensureCloned()`.

For `src/dotany/manifest/json.ts` in `src/__tests__/dotany-manifest.test.ts`: mock `fs-extra`, test `readAll()`, `write()`, `delete()` with and without namespace.

For `src/dotany/composer.ts` in `src/__tests__/dotany-composer.test.ts`: mock `DotfileManager` instances, test `apply()` and `status()` delegation.

- [x] Write `dotany-sources.test.ts` covering filesystem and git source resolvers
- [x] Write `dotany-manifest.test.ts` covering JSON manifest operations
- [x] Write `dotany-composer.test.ts` covering multi-manager orchestration
- [x] Run all three test files and confirm all pass with zero failures

## Task 9: Write unit tests for ai-rules-sync-manifest.ts (P)

**Requirements:** R4, R5

Write tests for `src/plugin/ai-rules-sync-manifest.ts` in `src/__tests__/ai-rules-sync-manifest.test.ts`. Mock `project-config.js` functions. Test `readAll()`, `write()`, and `delete()` methods. Cover both the normal operation path and error/edge cases.

- [x] Write tests covering all manifest bridge methods with mocked project config
- [x] Run tests and confirm all pass with zero failures

## Task 10: Write parametric adapter contract tests for all untested adapters (P)

**Requirements:** R4, R5

Create `src/__tests__/adapters-untested.test.ts` that runs the existing `runStandardAdapterContract()` helper against all 16 untested adapters: cursor-rules, cursor-commands, cursor-skills, cursor-agents, claude-skills, claude-agents, claude-agent-memory, copilot-instructions, codex-rules, codex-skills, opencode-agents, opencode-commands, opencode-skills, opencode-tools, trae-rules, trae-skills. Use `describe.each` or a loop over an array of adapter configurations. Each adapter block imports the adapter and registry, then calls the shared contract helper with expected property values (name, tool, subtype, defaultSourceDir, targetDir, mode, configPath, fileSuffixes).

- [x] Create the parametric test file with all 16 adapter configurations
- [x] Run the test file and confirm all adapter contract tests pass

## Task 11: Run full coverage verification and tune thresholds

**Requirements:** R1, R2, R5, R6

Run `vitest run --coverage` and confirm all four dimensions meet the 80% global threshold. Review per-file coverage numbers and confirm no included file falls below 50%. If any file is below 50%, add glob-pattern thresholds or targeted tests. If all files clear 80%, enable `perFile: true` in vitest.config.ts. Verify no `it.skip`, `describe.skip`, or `it.todo` exists in any new test file. Confirm all tests (existing plus new) pass with zero failures.

- [x] Run `vitest run --coverage` and confirm 80%+ on all four global dimensions
- [x] Review per-file coverage and confirm no included file is below 50% on any dimension
- [x] Tune thresholds in vitest.config.ts if needed (enable `perFile: true` or add glob-pattern overrides)
- [x] Confirm zero skipped tests and zero failures across the full test suite
