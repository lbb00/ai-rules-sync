# 支持的工具

## 概览

| 工具 | 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------|------------|----------|------|
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [文档](https://cursor.com/docs/context/rules) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [文档](https://cursor.com/docs/context/commands) |
| Cursor | Skills | directory | `.cursor/skills/` | - | [文档](https://cursor.com/docs/context/skills) |
| Cursor | Subagents | directory | `.cursor/agents/` | - | [文档](https://cursor.com/docs/context/subagents) |
| GitHub Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [文档](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| GitHub Copilot | Prompts | file | `.github/prompts/` | `.prompt.md`, `.md` | [文档](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| GitHub Copilot | Skills | directory | `.github/skills/` | - | [文档](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| GitHub Copilot | Agents | file | `.github/agents/` | `.agent.md`, `.md` | [文档](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) |
| Claude Code | Rules | file | `.claude/rules/` | `.md` | [文档](https://code.claude.com/docs/en/memory) |
| Claude Code | Skills | directory | `.claude/skills/` | - | [文档](https://code.claude.com/docs/en/skills) |
| Claude Code | Subagents | directory | `.claude/agents/` | - | [文档](https://code.claude.com/docs/en/sub-agents) |
| Claude Code | CLAUDE.md | file | `.claude/` | `.md` | [文档](https://docs.anthropic.com/en/docs/claude-code/memory) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [文档](https://docs.trae.ai/ide/rules) |
| Trae | Skills | directory | `.trae/skills/` | - | [文档](https://docs.trae.ai/ide/skills) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [文档](https://opencode.ai/docs/commands/) |
| OpenCode | Skills | directory | `.opencode/skills/` | - | [文档](https://opencode.ai/docs/skills/) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [文档](https://opencode.ai/docs/agents/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [文档](https://opencode.ai/docs/tools/) |
| Codex | Rules | file | `.codex/rules/` | `.rules` | [文档](https://developers.openai.com/codex/rules) |
| Codex | Skills | directory | `.agents/skills/` | - | [文档](https://developers.openai.com/codex/skills) |
| Codex | AGENTS.md | file | `.codex/` | `.md` | [文档](https://developers.openai.com/codex) |
| Gemini CLI | Commands | file | `.gemini/commands/` | `.toml` | [文档](https://geminicli.com/docs/cli/custom-commands/) |
| Gemini CLI | Skills | directory | `.gemini/skills/` | - | [文档](https://geminicli.com/docs/cli/skills/) |
| Gemini CLI | Agents | file | `.gemini/agents/` | `.md` | [文档](https://geminicli.com/docs/core/subagents/) |
| Gemini CLI | GEMINI.md | file | `.gemini/` | `.md` | [网站](https://geminicli.com/) |
| Warp | Rules | file | `.`（根目录） | `.md` | [文档](https://docs.warp.dev/agent-platform/capabilities/rules) |
| Warp | Skills | directory | `.agents/skills/` | - | [文档](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [文档](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | - | [文档](https://docs.windsurf.com/windsurf/cascade/skills) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [文档](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | - | [文档](https://docs.cline.bot/customization/skills) |
| **通用** | **AGENTS.md** | file | `.`（根目录） | `.md` | [标准](https://agents.md/) |

## 模式说明

- **directory** — 链接整个目录（技能、代理）
- **file** — 链接单个文件，自动处理后缀解析
- **hybrid** — 同时支持文件和目录（例如 Cursor 规则）
