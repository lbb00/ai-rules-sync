# Codex

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.codex/rules/` | `.rules` | [Docs](https://developers.openai.com/codex/rules) |
| Skills | directory | `.agents/skills/` | - | [Docs](https://developers.openai.com/codex/skills) |
| AGENTS.md | file | `.codex/` | `.md` | [Docs](https://developers.openai.com/codex) |

## Rules

```bash
# Starlark syntax for sandbox control
ais codex rules add default
ais codex rules rm default
```

## Skills

```bash
ais codex skills add code-assistant
ais codex skills rm code-assistant
```

::: info
Codex skills use `.agents/skills/` (not `.codex/skills/`) per OpenAI documentation.
:::

## AGENTS.md

```bash
# Project-level
ais codex md add AGENTS

# User-level
ais codex md add AGENTS --user    # → ~/.codex/AGENTS.md
```

## Import

```bash
ais codex rules import my-sandbox-rules
ais codex skills import my-helper-skill
```

## Install All

```bash
ais codex install
```

## Reference

- [Codex Rules Docs](https://developers.openai.com/codex/rules)
- [Codex Skills Docs](https://developers.openai.com/codex/skills)
- [Codex Docs](https://developers.openai.com/codex)
