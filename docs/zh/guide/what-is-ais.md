# 什么是 AIS？

**AI Rules Sync (AIS)** 是一个 CLI 工具，用于跨项目和团队同步、管理和共享 AI 代理规则。

## 问题

现代 AI 编程助手（Cursor、GitHub Copilot、Claude Code 等）使用项目级配置文件来自定义行为。团队经常：

- **复制粘贴**规则文件到各个项目
- 规则更新后**失去同步**
- 团队成员和项目之间**缺乏一致性**
- **无法轻松共享**规则

## 解决方案

AIS 在 Git 仓库中管理规则，通过**软链接**同步到项目。这意味着：

- **单一数据源** — 编辑一次，处处更新
- **版本控制** — 用 Git 跟踪变更
- **团队共享** — 通过 Git 仓库共享
- **多工具支持** — 一套工作流适用于 Cursor、Copilot、Claude 等

## 支持的工具

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

### 模式说明

- **directory** — 链接整个目录（技能、代理）
- **file** — 链接单个文件，自动处理后缀解析
- **hybrid** — 同时支持文件和目录（例如 Cursor 规则）

## 工作原理

AIS 通过软链接在两个范围管理规则：

- **[项目级别同步](./project-level)** — 将规则同步到项目目录，记录在 [`ai-rules-sync.json`](/zh/reference/configuration) 中并与团队共享
- **[用户全局级别同步](./user-level)** — 将个人 AI 配置同步到 `$HOME`，记录在 `~/.config/ai-rules-sync/user.json` 中
