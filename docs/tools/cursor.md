# Cursor

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [Docs](https://cursor.com/docs/context/rules) |
| Commands | file | `.cursor/commands/` | `.md` | [Docs](https://cursor.com/docs/context/commands) |
| Skills | directory | `.cursor/skills/` | - | [Docs](https://cursor.com/docs/context/skills) |
| Subagents | directory | `.cursor/agents/` | - | [Docs](https://cursor.com/docs/context/subagents) |

## Rules (Hybrid Mode)

Cursor rules support both file and directory linking.

```bash
# Add a .mdc file
ais cursor add react
ais cursor add coding-standards.mdc

# Add a .md file
ais cursor add readme.md

# Add a rule directory
ais cursor add my-rule-dir

# Remove
ais cursor rm react
```

## Commands

```bash
ais cursor commands add deploy-docs
ais cursor commands rm deploy-docs
```

## Skills

```bash
# Add skill (directory)
ais cursor skills add code-review
ais cursor skills rm code-review
```

## Subagents

```bash
# Add subagent (directory)
ais cursor agents add code-analyzer
ais cursor agents rm code-analyzer
```

## Import

```bash
ais cursor rules import my-custom-rule
ais cursor rules import my-rule -m "Add custom rule"
ais cursor rules import my-rule --push
ais cursor rules import my-rule --force
```

## Install All

```bash
ais cursor install
ais cursor add-all
ais cursor rules add-all
```

## Reference

- [Cursor Rules Docs](https://cursor.com/docs/context/rules)
- [Cursor Commands Docs](https://cursor.com/docs/context/commands)
- [Cursor Skills Docs](https://cursor.com/docs/context/skills)
- [Cursor Subagents Docs](https://cursor.com/docs/context/subagents)
