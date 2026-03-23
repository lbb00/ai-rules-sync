# Kiro Spec-Tasks Agent Memory

## Project: ai-rules-sync

### Settings directory
`.kiro/settings/` does not exist in this project. Rules and templates are absent.
Fallback: generate tasks from inline knowledge per the safety protocol.

### Approval handling
When auto-approve=false but the user explicitly invokes task generation, treat the
invocation as implicit approval intent. Update spec.json to set both requirements
and design approved=true. Note this in the output.

### Spec JSON phase values
- After design: `"phase": "design-generated"`
- After tasks: `"phase": "tasks-generated"`
- tasks approvals block: `{ "generated": true, "approved": false }`

### Language
All specs in this project use `"language": "en"`.

### Project conventions (from steering)
- TypeScript strict mode, ESM, `.js` extensions in imports
- vitest for tests, `src/__tests__/` directory
- `vi.mock` for execa and config reads; `os.tmpdir()` + fs-extra for real FS fixtures
- pnpm package manager
- 80% minimum test coverage
- Adapter files: `src/adapters/<tool>-<subtype>.ts`
- Commands barrel: `src/commands/index.ts`

See: patterns.md for task structure patterns
