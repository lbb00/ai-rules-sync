# AGENTS.md (Universal)

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| AGENTS.md | file | `.` (root) | `.md` | [Standard](https://agents.md/) |

## Usage

```bash
# Add from root
ais agents-md file add .

# Add from directory
ais agents-md file add frontend

# Add with alias (to distinguish multiple AGENTS.md files)
ais agents-md file add frontend fe-agents
ais agents-md file add backend be-agents

# Remove
ais agents-md file rm fe-agents
```

## Reference

- [AGENTS.md Standard](https://agents.md/)
