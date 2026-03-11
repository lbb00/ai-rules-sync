# GitHub Copilot

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| Prompts | file | `.github/prompts/` | `.prompt.md`, `.md` | [Docs](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| Skills | directory | `.github/skills/` | - | [Docs](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| Agents | file | `.github/agents/` | `.agent.md`, `.md` | [Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) |

## Instructions

```bash
ais copilot instructions add coding-style

# Suffix matching (if both exist, you must specify)
ais copilot instructions add style.md
ais copilot instructions add style.instructions.md

ais copilot instructions rm coding-style
```

## Prompts

```bash
ais copilot prompts add generate-tests
ais copilot prompts rm generate-tests
```

## Skills

```bash
ais copilot skills add web-scraping
ais copilot skills rm web-scraping
```

## Agents

```bash
ais copilot agents add code-reviewer
ais copilot agents rm code-reviewer
```

## Install All

```bash
ais copilot install
```

## Reference

- [Copilot Instructions Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Copilot Prompts Docs](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file)
- [Copilot Skills Docs](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat)
- [Copilot Agents Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
