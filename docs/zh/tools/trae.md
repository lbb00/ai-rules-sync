# Trae

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Rules | file | `.trae/rules/` | `.md` | [文档](https://docs.trae.ai/ide/rules) |
| Skills | directory | `.trae/skills/` | - | [文档](https://docs.trae.ai/ide/skills) |
| Agents | file | `.trae/agents/` | `.md` | [文档](https://docs.trae.ai) |
| Commands | file | `.trae/commands/` | `.md` | [文档](https://docs.trae.ai) |

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

## 安装全部

```bash
ais trae install
```

## 参考

- [Trae Rules 文档](https://docs.trae.ai/ide/rules)
- [Trae Skills 文档](https://docs.trae.ai/ide/skills)
- [Trae 文档](https://docs.trae.ai)
