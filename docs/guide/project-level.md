# Project-Level Sync

Sync rules into a specific project directory. Dependencies are tracked in the project's [`ai-rules-sync.json`](/reference/configuration) and shared with your team via Git.

```
Rules Repository                    Your Project (./your-project/)
├── .cursor/rules/react.mdc   ──→   .cursor/rules/react.mdc (symlink)
├── .claude/skills/review/    ──→   .claude/skills/review/   (symlink)
└── .github/instructions/     ──→   .github/instructions/    (symlink)
```

**Key characteristics:**
- **Scope:** Current project directory (`cwd`)
- **Config file:** `ai-rules-sync.json` (committed to git) + `ai-rules-sync.local.json` (private)
- **Typical use:** Team-shared coding standards, project-specific rules
- **Commands:** All commands default to project scope

```bash
cd your-project

# Add a rule to this project
ais cursor add react -t https://github.com/org/rules.git

# Install all rules from ai-rules-sync.json
ais install
```

## Configuration Files

### [`ai-rules-sync.json`](/reference/configuration) (committed to git)

```json
{
  "cursor": {
    "rules": {
      "react": "https://github.com/org/rules.git"
    }
  }
}
```

### `ai-rules-sync.local.json` (NOT committed)

For private rules that shouldn't be shared:

```json
{
  "cursor": {
    "rules": {
      "company-secrets": "https://github.com/company/private-rules.git"
    }
  }
}
```

## Complete Workflow Example

End-to-end: create a rule, add to project, share with team:

```bash
# 1. Create rule in repo
cd ~/my-rules-repo
echo "# React rules" > .cursor/rules/react.mdc
git add . && git commit -m "Add react rule"
git push

# 2. Add to project
cd your-project
ais cursor add react -t https://github.com/you/my-rules-repo.git

# 3. Commit config (ai-rules-sync.json) so team gets it
git add ai-rules-sync.json && git commit -m "Add react rule via AIS"
git push

# 4. Teammate clones and runs
git clone https://github.com/team/project.git && cd project
ais install
```
