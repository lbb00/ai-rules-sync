# Claude Code

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.claude/rules/` | `.md` | [Docs](https://code.claude.com/docs/en/memory) |
| Skills | directory | `.claude/skills/` | - | [Docs](https://code.claude.com/docs/en/skills) |
| Subagents | directory | `.claude/agents/` | - | [Docs](https://code.claude.com/docs/en/sub-agents) |
| CLAUDE.md | file | `.claude/` | `.md` | [Docs](https://docs.anthropic.com/en/docs/claude-code/memory) |

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
# Project-level
ais claude md add CLAUDE

# User-level (personal config)
ais claude md add CLAUDE --user           # → ~/.claude/CLAUDE.md
ais claude md rm CLAUDE --user
```

## Install All

```bash
ais claude install
```

## Reference

- [Claude Code Rules Docs](https://code.claude.com/docs/en/memory)
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
- [Claude Code Subagents Docs](https://code.claude.com/docs/en/sub-agents)
- [CLAUDE.md Docs](https://docs.anthropic.com/en/docs/claude-code/memory)
