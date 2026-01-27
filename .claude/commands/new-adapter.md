# New Adapter

Complete workflow for adding support for a new AI tool to AIS.

## Prerequisites

Before starting, gather this information:
- Tool name (e.g., "windsurf", "mcp")
- Rule/config types supported (e.g., rules, commands, skills)
- Default source directory (e.g., `.windsurf/rules/`)
- Target directory (usually same as source)
- File mode: `file` or `directory`

## Steps

### 1. Create Adapter File

Create `src/adapters/<tool>-<type>.ts`:

```typescript
import { createBaseAdapter } from './base.js';

export const myToolAdapter = createBaseAdapter({
  name: '<tool>-<type>',
  tool: '<tool>',
  subtype: '<type>',
  configPath: ['<tool>', '<type>'],
  defaultSourceDir: '.<tool>/<type>',
  targetDir: '.<tool>/<type>',
  mode: 'directory', // or 'file'
});
```

### 2. Register Adapter

In `src/adapters/index.ts`:
- Import the new adapter
- Register in `DefaultAdapterRegistry` constructor

### 3. Update Project Config

In `src/project-config.ts`:
- Add tool section to `ProjectConfig` interface
- Add tool to `SourceDirConfig` interface if needed

### 4. Wire CLI Commands

In `src/cli/register.ts`:
- Add tool subcommand group
- Register add/remove/install/import commands

### 5. Update Completion

In `src/completion.ts`:
- Add tool to completion types
- Add subtype completions

In `src/completion/scripts.ts`:
- Update bash/zsh/fish completion scripts

### 6. Add Tests

Create `src/__tests__/<tool>-<type>.test.ts`:
- Test adapter properties
- Test add/remove operations
- Test config path resolution

### 7. Update Documentation

- README.md: Add to supported sync types table
- README_ZH.md: Sync changes (use `/sync-readme`)
- CLAUDE.md: Update if architectural changes

### 8. Verify

```bash
# Build
npm run build

# Run tests
npm test

# Test manually
node dist/index.js <tool> <type> add <name>
node dist/index.js <tool> <type> remove <name>
```

## Checklist

- [ ] Adapter file created
- [ ] Adapter registered
- [ ] ProjectConfig updated
- [ ] CLI commands wired
- [ ] Completion updated
- [ ] Tests written and passing
- [ ] README.md updated
- [ ] README_ZH.md synced
- [ ] Manual testing complete
