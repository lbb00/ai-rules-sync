# 支持的工具 — 目录参考

每个已支持工具和资产类型的源路径、同步模式、文件后缀和文档链接。命令说明见[工具指南](/zh/guide/tool-guides)。

<!-- REF_TABLE:START -->
| 工具 | 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------|------------|----------|------|
| **通用** | **AGENTS.md** | file | `.`（根目录） | `.md` | [→](https://agents.md/) |
| Aider | 技能 | directory | `.aider/skills/` | — | [→](https://aider.chat) |
| Amp | 技能 | directory | `.agents/skills/` | — | [→](https://amp.ai) |
| Antigravity CLI | 技能 | directory | `.agents/skills/` | — | [→](https://antigravity.google/docs/skills) |
| Antigravity CLI | 工作流 | file | `.agents/workflows/` | `.md` | [→](https://antigravity.google/docs) |
| Augment Code | 代理 | file | `.augment/agents/` | `.md` | [→](https://www.augmentcode.com) |
| Augment Code | 命令 | file | `.augment/commands/` | `.md` | [→](https://www.augmentcode.com) |
| Augment Code | 规则 | file | `.augment/rules/` | `.md` | [→](https://www.augmentcode.com) |
| Augment Code | 技能 | directory | `.augment/skills/` | — | [→](https://www.augmentcode.com) |
| Claude Code | CLAUDE.md | file | `.claude/` | `.md` | [→](https://docs.anthropic.com/en/docs/claude-code/memory) |
| Claude Code | Rules | file | `.claude/rules/` | `.md` | [→](https://code.claude.com/docs/en/memory) |
| Claude Code | Skills | directory | `.claude/skills/` | — | [→](https://code.claude.com/docs/en/skills) |
| Claude Code | Subagents | directory | `.claude/agents/` | — | [→](https://code.claude.com/docs/en/sub-agents) |
| Cline | 代理 | file | `.cline/agents/` | `.yaml`, `.yml` | [→](https://docs.cline.bot) |
| Cline | 命令 | file | `.clinerules/workflows/` | `.md` | [→](https://docs.cline.bot) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [→](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | — | [→](https://docs.cline.bot/customization/skills) |
| CodeBuddy | CODEBUDDY.md | file | `.codebuddy/` | `.md` | [→](https://www.codebuddy.cn/docs/cli/memory) |
| CodeBuddy | 命令 | file | `.codebuddy/commands/` | `.md` | [→](https://www.codebuddy.cn/docs/cli/memory) |
| CodeBuddy | 规则 | file | `.codebuddy/rules/` | `.md` | [→](https://www.codebuddy.cn/docs/cli/memory) |
| CodeBuddy | 技能 | directory | `.codebuddy/skills/` | — | [→](https://www.codebuddy.cn/docs/cli/memory) |
| Codex | 代理 | file | `.codex/agents/` | `.toml` | [→](https://developers.openai.com/codex) |
| Codex | AGENTS.md | file | `.codex/` | `.md` | [→](https://developers.openai.com/codex) |
| Codex | Rules | file | `.codex/rules/` | `.rules` | [→](https://developers.openai.com/codex/rules) |
| Codex | Skills | directory | `.agents/skills/` | — | [→](https://developers.openai.com/codex/skills) |
| Continue | 提示词 | file | `.continue/prompts/` | `.md` | [→](https://docs.continue.dev) |
| Continue | 规则 | file | `.continue/rules/` | `.md` | [→](https://docs.continue.dev) |
| Continue | 技能 | directory | `.continue/skills/` | — | [→](https://docs.continue.dev) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [→](https://cursor.com/docs/context/commands) |
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [→](https://cursor.com/docs/context/rules) |
| Cursor | Skills | directory | `.cursor/skills/` | — | [→](https://cursor.com/docs/context/skills) |
| Cursor | Subagents | directory | `.cursor/agents/` | — | [→](https://cursor.com/docs/context/subagents) |
| DeepAgents | 代理 | directory | `.deepagents/agents/` | — | [→](https://deepagents.ai) |
| DeepAgents | AGENTS.md | file | `.deepagents/` | `.md` | [→](https://deepagents.ai) |
| DeepAgents | 技能 | directory | `.deepagents/skills/` | — | [→](https://deepagents.ai) |
| DeepSeek | AGENTS.md | file | `.`（根目录） | `.md` | [→](https://github.com/deepseek-ai/deepseek-harness) |
| DeepSeek | 技能 | directory | `.agents/skills/` | — | [→](https://github.com/deepseek-ai/deepseek-harness) |
| Factory Droid | AGENTS.md | file | `.`（根目录） | `.md` | [→](https://docs.factory.ai/cli) |
| Factory Droid | 命令 | file | `.factory/commands/` | `.md` | [→](https://docs.factory.ai/cli) |
| Factory Droid | 技能 | directory | `.factory/skills/` | — | [→](https://docs.factory.ai/cli/configuration/skills) |
| Factory Droid | 子代理 | directory | `.factory/droids/` | — | [→](https://docs.factory.ai/cli) |
| Gemini CLI | AGENTS.md | file | `.`（根目录） | `.md` | [→](https://geminicli.com) |
| Gemini CLI | Commands | file | `.gemini/commands/` | `.toml` | [→](https://geminicli.com/docs/cli/custom-commands/) |
| Gemini CLI | GEMINI.md | file | `.gemini/` | `.md` | [→](https://geminicli.com/) |
| Gemini CLI | Skills | directory | `.gemini/skills/` | — | [→](https://geminicli.com/docs/cli/skills/) |
| Gemini CLI | Subagents | file | `.gemini/agents/` | `.md` | [→](https://geminicli.com/docs/core/subagents/) |
| GitHub Copilot | Agents | file | `.github/agents/` | `.agent.md`, `.md` | [→](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) |
| GitHub Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [→](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| GitHub Copilot | Prompts | file | `.github/prompts/` | `.prompt.md`, `.md` | [→](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| GitHub Copilot | Skills | directory | `.github/skills/` | — | [→](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| Goose | 技能 | directory | `.goose/skills/` | — | [→](https://block.github.io/goose/) |
| Hermes Agent | 规则 | file | `.`（根目录） | `.md` | [→](https://hermesagent.com) |
| Hermes Agent | 技能 | directory | `.hermes/skills/` | — | [→](https://hermesagent.com) |
| Junie | 代理 | file | `.junie/agents/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | AGENTS.md | file | `.junie/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | 命令 | file | `.junie/commands/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | 规则 | file | `.junie/rules/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | 技能 | directory | `.junie/skills/` | — | [→](https://www.jetbrains.com/junie/) |
| Kilo Code | AGENTS.md | file | `.`（根目录） | `.md` | [→](https://kilocode.ai) |
| Kilo Code | 命令 | file | `.kilo/commands/` | `.md` | [→](https://kilocode.ai) |
| Kilo Code | 技能 | directory | `.kilo/skills/` | — | [→](https://kilocode.ai) |
| Kilo Code | 子代理 | file | `.kilo/agents/` | `.md` | [→](https://kilocode.ai) |
| Kimi Code | AGENTS.md | file | `.kimi-code/` | `.md` | [→](https://kimi.moonshot.cn) |
| Kimi Code | 技能 | directory | `.kimi-code/skills/` | — | [→](https://kimi.moonshot.cn) |
| Kimi Code | 子代理 | file | `.kimi-code/agents/` | `.md` | [→](https://kimi.moonshot.cn) |
| Kiro | 代理 | file | `.kiro/agents/` | `.md` | [→](https://kiro.dev) |
| Kiro | 规则 | file | `.kiro/steering/` | `.md` | [→](https://kiro.dev) |
| Kiro | 技能 | directory | `.kiro/skills/` | — | [→](https://kiro.dev) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [→](https://opencode.ai/docs/agents/) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [→](https://opencode.ai/docs/commands/) |
| OpenCode | 规则 | file | `.opencode/rules/` | `.md` | [→](https://opencode.ai) |
| OpenCode | Skills | directory | `.opencode/skills/` | — | [→](https://opencode.ai/docs/skills/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [→](https://opencode.ai/docs/tools/) |
| Pi | AGENTS.md | file | `.`（根目录） | `.md` | [→](https://github.com/badlogic/pi-skills) |
| Pi | 提示词 | file | `.pi/prompts/` | `.md` | [→](https://github.com/badlogic/pi-skills) |
| Pi | 技能 | directory | `.pi/skills/` | — | [→](https://github.com/badlogic/pi-skills) |
| Qwen Code | 代理 | file | `.qwen/agents/` | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | 命令 | file | `.qwen/commands/` | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | QWEN.md | file | `.`（根目录） | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | 规则 | file | `.qwen/rules/` | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | 技能 | directory | `.qwen/skills/` | — | [→](https://tongyi.aliyun.com) |
| Trae | 代理 | file | `.trae/agents/` | `.md` | [→](https://docs.trae.ai) |
| Trae | 命令 | file | `.trae/commands/` | `.md` | [→](https://docs.trae.ai) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [→](https://docs.trae.ai/ide/rules) |
| Trae | Skills | directory | `.trae/skills/` | — | [→](https://docs.trae.ai/ide/skills) |
| Warp | Rules | file | `.`（根目录） | `.md` | [→](https://docs.warp.dev/agent-platform/capabilities/rules) |
| Warp | Skills | directory | `.agents/skills/` | — | [→](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | 命令 | file | `.windsurf/workflows/` | `.md` | [→](https://docs.windsurf.com) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [→](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | — | [→](https://docs.windsurf.com/windsurf/cascade/skills) |
| WorkBuddy | 技能 | directory | `.workbuddy/skills/` | — | [→](https://www.workbuddy.ai) |
| Zed | 技能 | directory | `.agents/skills/` | — | [→](https://zed.dev) |
<!-- REF_TABLE:END -->

## 模式说明

- **directory** — 链接整个目录（skills、agents）
- **file** — 链接单个文件，自动解析后缀
- **hybrid** — 同时支持文件和目录（例如 Cursor rules）
