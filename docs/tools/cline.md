# Cline

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.clinerules/` | `.md`, `.txt` | [Docs](https://docs.cline.bot/customization/cline-rules) |
| Skills | directory | `.cline/skills/` | - | [Docs](https://docs.cline.bot/customization/skills) |
| Commands | file | `.clinerules/workflows/` | `.md` | [Docs](https://docs.cline.bot) |
| Agents | file | `.cline/agents/` | `.yaml`, `.yml` | [Docs](https://docs.cline.bot) |

## Rules

```bash
ais cline rules add coding
ais cline rules rm coding
```

## Skills

```bash
ais cline skills add release-checklist
ais cline skills rm release-checklist
```

## Commands

```bash
ais cline commands add deploy-docs
ais cline commands rm deploy-docs
```

## Agents

```bash
ais cline agents add code-reviewer
ais cline agents rm code-reviewer
```

## Install All

```bash
ais cline install
```

## Reference

- [Cline Rules Docs](https://docs.cline.bot/customization/cline-rules)
- [Cline Skills Docs](https://docs.cline.bot/customization/skills)
- [Cline Docs](https://docs.cline.bot)
