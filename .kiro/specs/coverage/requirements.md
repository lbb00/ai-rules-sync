# Requirements: coverage

## Project Description
Improve test coverage to 80%+ overall on all dimensions (statements, branches, functions, lines) and ensure every source file has at least 50% coverage on all dimensions. Current baseline: 67% statements, 55% branches, 69% functions, 67% lines. Focus on files with lowest coverage first: git-repo-source.ts (6%), git.ts (0%), and other files below 50%.

---

## Requirement 1: Overall Test Coverage Thresholds

When the test suite is executed with `vitest run --coverage`, the project SHALL report at least 80% coverage on each of the following dimensions: statements, branches, functions, and lines.

### Acceptance Criteria

1. WHEN `vitest run --coverage` is executed, THEN the coverage report SHALL show statement coverage at or above 80%.
2. WHEN `vitest run --coverage` is executed, THEN the coverage report SHALL show branch coverage at or above 80%.
3. WHEN `vitest run --coverage` is executed, THEN the coverage report SHALL show function coverage at or above 80%.
4. WHEN `vitest run --coverage` is executed, THEN the coverage report SHALL show line coverage at or above 80%.
5. WHEN coverage on any dimension falls below 80%, THEN `vitest run --coverage` SHALL exit with a non-zero status code (threshold enforcement configured in vitest).

---

## Requirement 2: Per-File Minimum Coverage

Every source file under `src/` SHALL have at least 50% coverage on all four dimensions (statements, branches, functions, lines) so that no file is left entirely untested or severely under-tested.

### Acceptance Criteria

1. WHEN `vitest run --coverage` is executed, THEN every source file under `src/` SHALL report at least 50% statement coverage.
2. WHEN `vitest run --coverage` is executed, THEN every source file under `src/` SHALL report at least 50% branch coverage.
3. WHEN `vitest run --coverage` is executed, THEN every source file under `src/` SHALL report at least 50% function coverage.
4. WHEN `vitest run --coverage` is executed, THEN every source file under `src/` SHALL report at least 50% line coverage.
5. WHEN any individual source file falls below 50% on any dimension, THEN the coverage run SHALL fail via per-file threshold configuration in vitest.

---

## Requirement 3: Critical Gap Remediation (Zero and Near-Zero Coverage Files)

The test suite SHALL include unit tests for source files that currently have zero or near-zero coverage, prioritized by severity of the gap.

### Acceptance Criteria

1. The test suite SHALL include unit tests for `src/git.ts` covering its git subprocess helper functions (clone, pull, fetch, rev-list, and related utilities).
2. The test suite SHALL include unit tests for `src/plugin/git-repo-source.ts` covering its repo-to-local-cache resolution logic.
3. WHEN tests are written for `src/git.ts`, THEN external git subprocess calls (via execa) SHALL be mocked so tests do not depend on real git repositories.
4. WHEN tests are written for `src/plugin/git-repo-source.ts`, THEN filesystem and git operations SHALL be mocked so tests do not depend on real repositories or network access.
5. WHEN `vitest run --coverage` is executed, THEN `src/git.ts` SHALL report at least 50% coverage on all four dimensions.
6. WHEN `vitest run --coverage` is executed, THEN `src/plugin/git-repo-source.ts` SHALL report at least 50% coverage on all four dimensions.

---

## Requirement 4: Coverage for Files Below 50%

All source files currently below 50% coverage on any dimension SHALL have new or expanded unit tests to bring them above the per-file minimum.

### Acceptance Criteria

1. WHEN a source file under `src/` has less than 50% coverage on any dimension before this feature, THEN new unit tests SHALL be created or existing tests expanded for that file.
2. WHEN tests are written for modules that perform filesystem operations, THEN filesystem calls SHALL be mocked to avoid side effects on the real filesystem.
3. WHEN tests are written for modules that invoke external processes (git, shell commands), THEN subprocess calls SHALL be mocked via vitest mocking facilities.
4. WHEN `vitest run --coverage` is executed after all tests are added, THEN every previously-below-50% file SHALL report at least 50% on all four dimensions.

---

## Requirement 5: Test Quality Standards

All new tests SHALL follow the project's established testing conventions and maintain test suite integrity.

### Acceptance Criteria

1. The test suite SHALL NOT contain any skipped tests (`it.skip`, `describe.skip`, `it.todo`) or tests marked as expected-to-fail related to coverage improvements.
2. All new test files SHALL be located in `src/__tests__/` and use the `.test.ts` file suffix.
3. All new tests SHALL use vitest APIs (`describe`, `it`, `expect`, `vi`) consistent with existing test patterns.
4. All new test file imports SHALL use `.js` extensions per the project's ESM NodeNext convention.
5. WHEN temporary directories are needed in tests, THEN `os.tmpdir()` with `fs-extra` SHALL be used and cleanup SHALL occur in `afterEach` hooks.
6. WHEN `vitest run` is executed, THEN all tests (existing and new) SHALL pass with zero failures.

---

## Requirement 6: Coverage Configuration

The vitest configuration SHALL enforce coverage thresholds so that regressions are caught automatically.

### Acceptance Criteria

1. The vitest configuration SHALL define global coverage thresholds of 80% for statements, branches, functions, and lines.
2. The vitest configuration SHALL define per-file coverage thresholds of 50% for statements, branches, functions, and lines.
3. WHEN coverage thresholds are violated, THEN `vitest run --coverage` SHALL exit with a non-zero status code.
4. The coverage configuration SHALL use the `v8` coverage provider (consistent with the project's existing `@vitest/coverage-v8` dependency).
