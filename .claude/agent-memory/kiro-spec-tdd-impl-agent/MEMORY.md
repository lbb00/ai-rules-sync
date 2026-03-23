# Agent Memory: kiro-spec-tdd-impl-agent

## Project: ai-rules-sync

### Key Facts
- Package manager: pnpm
- Test runner: `pnpm exec vitest run` (NOT `npx vitest`)
- TypeScript check: `pnpm tsc --noEmit`
- Coverage: `@vitest/coverage-v8` installed; `vitest.config.ts` created with v8 provider, text+json-summary reporters, 80% global thresholds
- Coverage exclusions in vitest.config.ts: `src/__tests__/**`, `src/index.ts`, `src/cli/register.ts`, `src/adapters/types.ts`, `src/dotany/types.ts`
- Pre-existing failing tests: resolved as of upstream-merge (agents-md tests updated for nested config)
- Vitest+Vitepress conflict: vitepress pulls vite 5.x, vitest needs vite >=6. Fix: add `"vite": "^7.0.0"` as explicit devDependency
- agents-md configPath is now `['agentsMd', 'file']` (nested), not flat `agentsMd`
- Import paths use `.js` extension even for `.ts` source files (ESM NodeNext)

### Patterns
- All test mocks use `vi.mock` with factory functions; `vi.resetAllMocks()` in `beforeEach`
- `vi.mock('fs-extra', async (importOriginal) => { ... })` pattern used for partial mocks
- Test fixtures use `os.tmpdir()` with `fs-extra.mkdtemp`; cleanup in `afterEach`
- Adapter tests use `runStandardAdapterContract` helper from `./helpers/adapter-contract.js`
- When mocking a class used with `new`, must use `class` syntax in vi.mock factory (arrow functions are not constructors in vitest v4)

### Already-implemented items (as of 2026-03-19)
The type-list feature implementation was already complete before the agent ran:
- `userDefaultSourceDir` field on `SyncAdapter` and `AdapterConfig` interfaces
- `importEntry` / `importEntryNoCommit` user-mode path branching in `sync-engine.ts`
- `handleImport` skipIgnore propagation in `handlers.ts`
- `src/commands/list.ts` with all 4 modes
- CLI registration in `src/index.ts`
- All test files: `claude-list.test.ts`, `sync-engine-user.test.ts`, `handlers-user-import.test.ts`
- Adapter tests extended for `userDefaultSourceDir`
