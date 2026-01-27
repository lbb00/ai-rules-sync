# Update Documentation

One-click command to update all project documentation after code changes.

## Steps

1. **Analyze Changes**
   - Check git status for modified files
   - Review recent commits if no uncommitted changes
   - Identify what documentation needs updating

2. **Update KNOWLEDGE_BASE.md**
   - Run the `update-knowledge-base` skill
   - Document any architectural or feature changes

3. **Update README.md**
   - Add new features or commands
   - Update examples if API changed
   - Ensure accuracy of all documented commands

4. **Sync README_ZH.md**
   - Run the `sync-readme` skill
   - Ensure Chinese documentation matches English

5. **Verify**
   - Run tests to ensure nothing broken: `npm test`
   - Check that all documented commands work
   - Review diff before committing

## When to Use

- After adding a new adapter
- After adding or modifying CLI commands
- After changing the configuration format
- After any user-facing changes

## Output

All documentation files updated and in sync:
- KNOWLEDGE_BASE.md (if exists)
- README.md
- README_ZH.md
