# AGENTS instructions

## Project Overview

**AI Rules Sync (AIS)** is a CLI tool for synchronizing, managing, and sharing AI agent rules across projects using symbolic links.

### Tech Stack
- **Language**: TypeScript (strict mode)
- **Build**: `tsc` (ES modules)
- **Test**: Vitest
- **CLI Framework**: Commander.js
- **Package Manager**: pnpm

### Key Features
- Multi-repository rule management (Cursor, Copilot, Claude, Trae)
- Symbolic link-based synchronization
- Shell tab completion (bash, zsh, fish)
- Plugin-based adapter architecture

## Directory Structure

```
src/
├── adapters/           # Tool-specific adapters (cursor, copilot, claude, trae)
│   ├── base.ts         # Base adapter factory
│   ├── types.ts        # Adapter interfaces
│   └── index.ts        # Adapter registry
├── commands/           # CLI command handlers
│   ├── handlers.ts     # Core command logic (add, remove, link, unlink)
│   ├── install.ts      # Install command
│   └── helpers.ts      # Shared utilities
├── cli/
│   └── register.ts     # CLI registration
├── completion/
│   └── scripts.ts      # Shell completion scripts
├── config.ts           # Global config (~/.config/ai-rules-sync/)
├── project-config.ts   # Project config (ai-rules-sync.json)
├── sync-engine.ts      # Symlink creation/removal
├── link.ts             # Link utilities
├── git.ts              # Git operations
├── utils.ts            # Shared utilities
└── index.ts            # Entry point
```

## Development Commands

```bash
# Build TypeScript
npm run build

# Run tests (watch mode)
npm test

# Run tests once
npx vitest run

# Test CLI locally
node dist/index.js <command>
```

## Code Style Guidelines

1. **TypeScript Strict Mode**: All code must pass strict type checking
2. **Functional Programming**: Prefer pure functions, avoid side effects where possible
3. **Testing Required**: All new features must have tests in `src/__tests__/`
4. **ES Modules**: Use `.js` extension in imports for Node.js compatibility
5. **Error Handling**: Use descriptive error messages with chalk for CLI output

### Adapter Pattern

All adapters follow the `BaseAdapter` interface:
```typescript
interface BaseAdapter {
  name: string;           // Unique adapter name
  tool: string;           // Tool identifier (cursor, copilot, etc.)
  subtype: string;        // Type within tool (rules, commands, skills)
  configPath: string[];   // Path in ai-rules-sync.json
  defaultSourceDir: string;
  targetDir: string;
  mode: 'file' | 'directory';
}
```

## Workflows

### After Code Changes (Auto-trigger)

When making significant code changes, update documentation:

1. **Update KNOWLEDGE_BASE.md** (if architecture/features changed)
   - Use `/update-knowledge-base` skill
   - Document new adapters, commands, or architectural changes

2. **Update README.md** (English)
   - Add new features, commands, or usage examples
   - Keep architecture section current

3. **Sync README_ZH.md** (Chinese)
   - Use `/sync-readme` skill
   - Maintain parity with English README

4. **Run Tests**
   ```bash
   npm test
   ```

### Session Summary (End of Session)

Before ending a productive session:

1. **Identify Reusable Patterns** → Generate Rules
   - Coding standards discovered
   - Project-specific conventions

2. **Identify Multi-step Workflows** → Generate Skills
   - Complex operations that benefit from step-by-step guidance
   - Integration workflows

3. **Identify Frequent Commands** → Generate Commands
   - One-click operations
   - Common development tasks

Use `/summarize-session` to generate artifacts.

## Testing Conventions

- Test files: `src/__tests__/*.test.ts`
- Use Vitest's `describe`, `it`, `expect`
- Mock file system operations with `vi.mock('fs-extra')`
- Test adapters independently from CLI

## Git Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Include scope when relevant: `feat(adapter): add windsurf support`
- Keep commits atomic and focused

## Related Files

- `README.md` - English documentation
- `README_ZH.md` - Chinese documentation
- `.cursor/rules/` - Cursor-specific rules (if any)
- `ai-rules-sync.json` - Project configuration example

## Cursor Cloud specific instructions

- **No external services required.** This is a pure CLI tool with no databases, Docker, or APIs. Only Node.js, pnpm, and Git are needed.
- **No dedicated lint script.** Use `npx tsc --noEmit` for type checking. The project does not have ESLint configured.
- **Build before testing CLI.** Run `pnpm build` before `node dist/index.js <command>` — the CLI runs from compiled JS in `dist/`.
- **Tests run on both `src/` and `dist/`.** Vitest picks up test files from both `src/__tests__/` and `dist/__tests__/`. A stale `dist/` may cause test failures; rebuild if in doubt.
- **Standard commands:** See "Development Commands" section above for build/test/run commands.
