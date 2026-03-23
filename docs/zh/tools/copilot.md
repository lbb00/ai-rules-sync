# GitHub Copilot

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [文档](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| Prompts | file | `.github/prompts/` | `.prompt.md`, `.md` | [文档](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| Skills | directory | `.github/skills/` | - | [文档](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| Agents | file | `.github/agents/` | `.agent.md`, `.md` | [文档](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) |

## Instructions

```bash
ais copilot instructions add coding-style

# 后缀匹配（两者都存在时需要明确指定）
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

## 安装全部

```bash
ais copilot install
```

## 参考

- [Copilot Instructions 文档](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [Copilot Prompts 文档](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file)
- [Copilot Skills 文档](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat)
- [Copilot Agents 文档](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
