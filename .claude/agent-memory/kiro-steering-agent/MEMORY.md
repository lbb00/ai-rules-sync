# Kiro Steering Agent Memory

## Project: ai-rules-sync

Bootstrapped steering on 2026-03-19. Core files written to `.kiro/steering/`.

Key facts worth preserving:
- No templates exist at `.kiro/settings/templates/steering/`
- No principles file at `.kiro/settings/rules/steering-principles.md`
- The `src/dotany/` directory is named `dotany` in source but referred to as `dotfile` in KNOWLEDGE_BASE.md (it was previously `dotfile/`, then renamed). The import alias `from '../dotany/...'` is the live path.
- Adapters use factory functions not classes; `createBaseAdapter()` is the pattern for all adapters.
- All symlink ops go through `linkany` — never bare `fs.ensureSymlink`.
- ESM project: all imports need `.js` extensions even in `.ts` source files.
