# Trae

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.trae/rules/` | `.md` | [Docs](https://docs.trae.ai/ide/rules) |
| Skills | directory | `.trae/skills/` | - | [Docs](https://docs.trae.ai/ide/skills) |
| Agents | file | `.trae/agents/` | `.md` | [Docs](https://docs.trae.ai) |
| Commands | file | `.trae/commands/` | `.md` | [Docs](https://docs.trae.ai) |

## Rules

```bash
ais trae rules add project-rules
ais trae rules rm project-rules
```

## Skills

```bash
ais trae skills add adapter-builder
ais trae skills rm adapter-builder
```

## Agents

```bash
ais trae agents add code-reviewer
ais trae agents rm code-reviewer
```

## Commands

```bash
ais trae commands add deploy-docs
ais trae commands rm deploy-docs
```

## Install All

```bash
ais trae install
```

## Reference

- [Trae Rules Docs](https://docs.trae.ai/ide/rules)
- [Trae Skills Docs](https://docs.trae.ai/ide/skills)
- [Trae Docs](https://docs.trae.ai)
