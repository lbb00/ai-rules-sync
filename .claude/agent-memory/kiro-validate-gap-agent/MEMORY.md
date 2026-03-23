# Kiro Validate-Gap Agent Memory

## Project: ai-rules-sync (SoftwareCats fork)

### Key Facts
- Fork of `git@github.com:lbb00/ai-rules-sync.git`
- Common ancestor: `aa53caac`
- Fork HEAD: `efef8b1` (main), Upstream HEAD: `6b562a3` (upstream/main)
- Fork version: `0.8.0-beta.3`, upstream npm: `0.4.0`
- Package manager: pnpm@9.15.3, ESM TypeScript

### Architecture Essentials
- Adapter-based plugin system: `SyncAdapter` interface in `src/adapters/types.ts`
- Factory: `createBaseAdapter()` in `src/adapters/base.ts`
- Registry: `DefaultAdapterRegistry` in `src/adapters/index.ts`
- CLI entry: `src/index.ts` (~2000+ lines, high-conflict file)
- Dotfile abstraction: `src/dotany/` (manager, composer, sources, manifest)
- Test baseline: 466 tests across 38 test files in `src/__tests__/`

### Tool Limitations
- No Bash tool available in this agent configuration
- WebFetch blocked by context-mode plugin; use WebSearch instead
- Git internals can be read via `.git/` directory (packed-refs, logs, config)
- Reflog at `.git/logs/refs/heads/main` provides full commit history
- Packed git objects (`.git/objects/pack/*.pack`) are binary and cannot be read with Read tool
- Cannot enumerate upstream commits without Bash (`git log`) -- reflog only covers local branches

### Gap Analysis Patterns
- When Bash is unavailable, read `.git/refs/remotes/*/main` for loose refs to confirm fetch status
- Use `.git/logs/refs/heads/main` to extract full local commit history with timestamps
- Import chain tracing via Grep is effective for identifying merge-critical dependencies
- Line-number grep on `src/index.ts` identifies exact fork-specific sections to preserve
- `docs/supported-tools.json` reveals adapter modes at fork point (useful for semantic conflict prediction)
- Gap analysis rules file at `.kiro/settings/rules/gap-analysis.md` does not exist in this project
