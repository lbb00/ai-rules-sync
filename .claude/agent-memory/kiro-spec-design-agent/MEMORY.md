# Spec Design Agent Memory

## Project: ai-rules-sync

### Key patterns

- Design template at `.kiro/settings/templates/specs/design.md` does NOT exist in this project — use inline structure with note.
- Design rules at `.kiro/settings/rules/design-principles.md` do NOT exist in this project — proceed without them.
- Requirements approval check: auto-approve=false means check `spec.json` approvals.requirements.approved — if false, STOP unless instructed.
- `src/index.ts` is >25000 tokens and cannot be read in one call — use offset/limit to read relevant sections (the claude command block starts around line 1098).
- `adapterRegistry.getForTool('claude')` is the correct API to get all Claude adapters from the registry.
- `createBaseAdapter` in `src/adapters/base.ts` is the factory for all adapters; `AdapterConfig` and `SyncAdapter` in `types.ts` are the twin interfaces to update for new optional fields.
- `skipIgnore` in `SyncOptions`/`ImportOptions` is the user-mode signal throughout the codebase — always propagate it from `CommandContext` through to engine calls.
- Test files live in `src/__tests__/` with `.test.ts` suffix; mock `execa`, `project-config.js`, and `config.js` via `vi.mock`.
