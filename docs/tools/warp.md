# Warp

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.` (root) | `.md` | [Docs](https://docs.warp.dev/agent-platform/capabilities/rules) |
| Skills | directory | `.agents/skills/` | - | [Docs](https://docs.warp.dev/agent-platform/capabilities/skills) |

## Rules

Warp Rules use the [AGENTS.md standard](https://agents.md/). Use the `agents-md` commands:

```bash
# Add AGENTS.md from repo root (applies globally in Warp)
ais agents-md add .

# Add directory-specific rules
ais agents-md add src

# Remove
ais agents-md rm .
```

## Skills

```bash
ais warp skills add my-skill
ais warp skills rm my-skill
ais warp skills install
```

## Reference

- [Warp Rules Docs](https://docs.warp.dev/agent-platform/capabilities/rules)
- [Warp Skills Docs](https://docs.warp.dev/agent-platform/capabilities/skills)
