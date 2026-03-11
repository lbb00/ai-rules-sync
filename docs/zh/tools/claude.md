# Claude Code

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Rules | file | `.claude/rules/` | `.md` | [文档](https://code.claude.com/docs/en/memory) |
| Skills | directory | `.claude/skills/` | - | [文档](https://code.claude.com/docs/en/skills) |
| Subagents | directory | `.claude/agents/` | - | [文档](https://code.claude.com/docs/en/sub-agents) |
| CLAUDE.md | file | `.claude/` | `.md` | [文档](https://docs.anthropic.com/en/docs/claude-code/memory) |

## Rules

```bash
ais claude rules add general
ais claude rules rm general
```

## Skills

```bash
ais claude skills add code-review
ais claude skills rm code-review
```

## Subagents

```bash
ais claude agents add debugger
ais claude agents rm debugger
```

## CLAUDE.md

```bash
# 项目级
ais claude md add CLAUDE

# 用户级（个人配置）
ais claude md add CLAUDE --user           # → ~/.claude/CLAUDE.md
ais claude md rm CLAUDE --user
```

## 安装全部

```bash
ais claude install
```

## 参考

- [Claude Code Rules 文档](https://code.claude.com/docs/en/memory)
- [Claude Code Skills 文档](https://code.claude.com/docs/en/skills)
- [Claude Code Subagents 文档](https://code.claude.com/docs/en/sub-agents)
- [CLAUDE.md 文档](https://docs.anthropic.com/en/docs/claude-code/memory)
