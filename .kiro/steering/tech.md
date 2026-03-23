# Tech

## Language and Runtime

TypeScript (strict mode) targeting ES2022, running on Node.js. Module system is ESM (`"type": "module"` in package.json, `"module": "NodeNext"` in tsconfig). All imports use `.js` extensions for Node ESM compatibility.

## Key Dependencies

- **commander** — CLI framework for command/subcommand registration
- **execa** — subprocess execution for git operations
- **fs-extra** — extended filesystem helpers (pathExists, ensureDir, etc.)
- **linkany** — atomic symlink creation/deletion abstraction; all symlink ops go through this, never bare `fs.ensureSymlink`
- **chalk** — terminal output colouring

## Build and Tooling

- **TypeScript compiler (`tsc`)** — build only, no bundler; output goes to `dist/`
- **pnpm** — package manager (`pnpm@9.15.3`)
- **vitest** — test runner and coverage (target: 80% minimum)
- **@changesets/cli** — versioning and changelog management
- Release automation via GitHub Actions: npm publish + Homebrew formula update

## Architecture Decisions

### Plugin-based adapter system
Each AI tool/subtype pair is an independent adapter implementing `SyncAdapter`. Adding a new tool means creating one new adapter file -- no changes to the core engine. Adapters declare their `mode` (`file`, `directory`, `hybrid`) and the engine handles the rest generically. Adapters may optionally declare `userTargetDir` and `userDefaultSourceDir` to support user-mode (global) operations with paths distinct from project-mode.

### Dotfile abstraction layer (`src/dotany/`)
A tool-agnostic library for symlink management. `DotfileManager` wraps all add/remove/apply/diff/status operations. All symlink creation goes through `linkany` via `DotfileManager.doLink` / `doUnlink`. No bare `fs.ensureSymlink` calls outside dotany.

### Declarative CLI registration (`src/cli/`)
`registerAdapterCommands()` takes an adapter and a parent `Command`, then auto-registers `add`, `remove`, `install`, `import` subcommands. Avoids duplicating CLI boilerplate per tool. `source-dir-parser.ts` handles parsing `--source-dir` option values into adapter override maps.

### Tool-specific list command (`src/commands/list.ts`)
`handleClaudeList()` implements a multi-mode list pattern (installed/available/user/repo cross-product). Currently Claude-specific but the pattern is generalizable. Four modes: (A) project config, (B) user config, (C) repo source dirs, (D) repo user-source dirs.

### Configuration split
- `ai-rules-sync.json` — project-level, committed to git
- `ai-rules-sync.local.json` — private/local, gitignored
- `~/.config/ai-rules-sync/config.json` — global AIS config (repo list, current repo)
- `~/.config/ai-rules-sync/user.json` — user-mode dependencies (path is configurable)

### Source priority chain
`CLI Parameters > Global Config > Repository Config > Adapter Defaults`

## Testing Conventions

- Tests live in `src/__tests__/`, co-located with the source tree in concept
- vitest with `describe`/`it`/`expect`/`vi` (mocks via `vi.mock`, `vi.fn()`)
- Test files use `.test.ts` suffix
- Use `os.tmpdir()` + `fs-extra` for temporary directories in integration-style tests; clean up in `afterEach`
- Mock `execa` and file-system calls where tests shouldn't touch real git repos

## TypeScript Conventions

- Strict mode enforced; no `any` without justification
- Prefer `interface` for public API shapes (`SyncAdapter`, `AdapterConfig`, etc.)
- Factory functions (`createBaseAdapter`, `createSingleSuffixResolver`) over classes for adapters
- `async/await` throughout; no raw Promise chains
