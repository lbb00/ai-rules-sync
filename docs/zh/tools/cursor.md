# Cursor

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [文档](https://cursor.com/docs/context/rules) |
| Commands | file | `.cursor/commands/` | `.md` | [文档](https://cursor.com/docs/context/commands) |
| Skills | directory | `.cursor/skills/` | - | [文档](https://cursor.com/docs/context/skills) |
| Subagents | directory | `.cursor/agents/` | - | [文档](https://cursor.com/docs/context/subagents) |

## Rules（混合模式）

Cursor 规则同时支持文件和目录链接。

```bash
# 添加 .mdc 文件
ais cursor add react
ais cursor add coding-standards.mdc

# 添加 .md 文件
ais cursor add readme.md

# 添加规则目录
ais cursor add my-rule-dir

# 移除
ais cursor rm react
```

## Commands

```bash
ais cursor commands add deploy-docs
ais cursor commands rm deploy-docs
```

## Skills

```bash
# 添加技能（目录）
ais cursor skills add code-review
ais cursor skills rm code-review
```

## Subagents

```bash
# 添加 subagent（目录）
ais cursor agents add code-analyzer
ais cursor agents rm code-analyzer
```

## 导入

```bash
ais cursor rules import my-custom-rule
ais cursor rules import my-rule -m "Add custom rule"
ais cursor rules import my-rule --push
ais cursor rules import my-rule --force
```

## 安装全部

```bash
ais cursor install
ais cursor add-all
ais cursor rules add-all
```

## 参考

- [Cursor Rules 文档](https://cursor.com/docs/context/rules)
- [Cursor Commands 文档](https://cursor.com/docs/context/commands)
- [Cursor Skills 文档](https://cursor.com/docs/context/skills)
- [Cursor Subagents 文档](https://cursor.com/docs/context/subagents)
