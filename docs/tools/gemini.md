# Gemini CLI

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Commands | file | `.gemini/commands/` | `.toml` | [Docs](https://geminicli.com/docs/cli/custom-commands/) |
| Skills | directory | `.gemini/skills/` | - | [Docs](https://geminicli.com/docs/cli/skills/) |
| Agents | file | `.gemini/agents/` | `.md` | [Docs](https://geminicli.com/docs/core/subagents/) |
| GEMINI.md | file | `.gemini/` | `.md` | [Website](https://geminicli.com/) |

## Commands

```bash
ais gemini commands add deploy-docs
ais gemini commands rm deploy-docs
```

## Skills

```bash
ais gemini skills add code-review
ais gemini skills rm code-review
```

## Agents

```bash
ais gemini agents add code-analyzer
ais gemini agents rm code-analyzer
```

## GEMINI.md

```bash
# Project-level
ais gemini md add GEMINI

# User-level
ais gemini md add GEMINI --user    # → ~/.gemini/GEMINI.md
```

## Install All

```bash
ais gemini install
```

## Reference

- [Gemini CLI Commands Docs](https://geminicli.com/docs/cli/custom-commands/)
- [Gemini CLI Skills Docs](https://geminicli.com/docs/cli/skills/)
- [Gemini CLI Agents Docs](https://geminicli.com/docs/core/subagents/)
- [Gemini CLI Website](https://geminicli.com/)
