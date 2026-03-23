# Kiro Spec Requirements Agent Memory

## Project: ai-rules-sync

### Key File Paths
- Specs: `.kiro/specs/<feature>/requirements.md` and `spec.json`
- Steering: `.kiro/steering/product.md`, `tech.md`, `structure.md`
- EARS/template files do NOT exist in this project — use inline EARS knowledge

### EARS Format Rules (Inline Fallback)
- Ubiquitous: "The system SHALL..."
- Event-driven: "WHEN <trigger>, THEN the system SHALL..."
- State-driven: "WHILE <state>, the system SHALL..."
- Optional: "WHERE <feature>, the system SHALL..."
- Unwanted: "IF <condition>, THEN the system SHALL NOT..."
- Subject should be the product name or system, not "it"

### Adapter System Notes
- Claude adapters with `userTargetDir`: `claude-settings`, `claude-status-lines`
- `skipIgnore: true` in SyncOptions signals user mode throughout the pipeline
- `importEntry()` in `sync-engine.ts` uses `adapter.targetDir` for source resolution — does NOT check `skipIgnore` for user path (this is the known bug)
- `handleImport()` in `handlers.ts` does NOT pass `skipIgnore` into `importOpts` (second part of bug)

### Requirement Numbering
- Must use numeric IDs only in headings (e.g. "Requirement 1", "1."); never alphabetic (e.g. "Requirement A")
