# Supported Tools — Directory Reference

Source paths, sync modes, file suffixes, and documentation links for every supported tool and asset type. Command walkthroughs: [Tool Guides](/guide/tool-guides).

<!-- REF_TABLE:START -->
| Tool | Type | Mode | Default Source Directory | File Suffixes | Docs |
|------|------|------|--------------------------|---------------|------|
| **Universal** | **AGENTS.md** | file | `.` (root) | `.md` | [→](https://agents.md/) |
| Aider | Skills | directory | `.aider/skills/` | — | [→](https://aider.chat) |
| Amp | Skills | directory | `.agents/skills/` | — | [→](https://amp.ai) |
| Antigravity CLI | Skills | directory | `.agents/skills/` | — | [→](https://antigravity.google/docs/skills) |
| Antigravity CLI | Workflows | file | `.agents/workflows/` | `.md` | [→](https://antigravity.google/docs) |
| Augment Code | Agents | file | `.augment/agents/` | `.md` | [→](https://www.augmentcode.com) |
| Augment Code | Commands | file | `.augment/commands/` | `.md` | [→](https://www.augmentcode.com) |
| Augment Code | Rules | file | `.augment/rules/` | `.md` | [→](https://www.augmentcode.com) |
| Augment Code | Skills | directory | `.augment/skills/` | — | [→](https://www.augmentcode.com) |
| Claude Code | CLAUDE.md | file | `.claude/` | `.md` | [→](https://docs.anthropic.com/en/docs/claude-code/memory) |
| Claude Code | Rules | file | `.claude/rules/` | `.md` | [→](https://code.claude.com/docs/en/memory) |
| Claude Code | Skills | directory | `.claude/skills/` | — | [→](https://code.claude.com/docs/en/skills) |
| Claude Code | Subagents | directory | `.claude/agents/` | — | [→](https://code.claude.com/docs/en/sub-agents) |
| Cline | Agents | file | `.cline/agents/` | `.yaml`, `.yml` | [→](https://docs.cline.bot) |
| Cline | Commands | file | `.clinerules/workflows/` | `.md` | [→](https://docs.cline.bot) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [→](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | — | [→](https://docs.cline.bot/customization/skills) |
| CodeBuddy | CODEBUDDY.md | file | `.codebuddy/` | `.md` | [→](https://www.codebuddy.cn/docs/cli/memory) |
| CodeBuddy | Commands | file | `.codebuddy/commands/` | `.md` | [→](https://www.codebuddy.cn/docs/cli/memory) |
| CodeBuddy | Rules | file | `.codebuddy/rules/` | `.md` | [→](https://www.codebuddy.cn/docs/cli/memory) |
| CodeBuddy | Skills | directory | `.codebuddy/skills/` | — | [→](https://www.codebuddy.cn/docs/cli/memory) |
| Codex | Agents | file | `.codex/agents/` | `.toml` | [→](https://developers.openai.com/codex) |
| Codex | AGENTS.md | file | `.codex/` | `.md` | [→](https://developers.openai.com/codex) |
| Codex | Rules | file | `.codex/rules/` | `.rules` | [→](https://developers.openai.com/codex/rules) |
| Codex | Skills | directory | `.agents/skills/` | — | [→](https://developers.openai.com/codex/skills) |
| Continue | Prompts | file | `.continue/prompts/` | `.md` | [→](https://docs.continue.dev) |
| Continue | Rules | file | `.continue/rules/` | `.md` | [→](https://docs.continue.dev) |
| Continue | Skills | directory | `.continue/skills/` | — | [→](https://docs.continue.dev) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [→](https://cursor.com/docs/context/commands) |
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [→](https://cursor.com/docs/context/rules) |
| Cursor | Skills | directory | `.cursor/skills/` | — | [→](https://cursor.com/docs/context/skills) |
| Cursor | Subagents | directory | `.cursor/agents/` | — | [→](https://cursor.com/docs/context/subagents) |
| DeepAgents | Agents | directory | `.deepagents/agents/` | — | [→](https://deepagents.ai) |
| DeepAgents | AGENTS.md | file | `.deepagents/` | `.md` | [→](https://deepagents.ai) |
| DeepAgents | Skills | directory | `.deepagents/skills/` | — | [→](https://deepagents.ai) |
| DeepSeek | AGENTS.md | file | `.` | `.md` | [→](https://github.com/deepseek-ai/deepseek-harness) |
| DeepSeek | Skills | directory | `.agents/skills/` | — | [→](https://github.com/deepseek-ai/deepseek-harness) |
| Factory Droid | AGENTS.md | file | `.` | `.md` | [→](https://docs.factory.ai/cli) |
| Factory Droid | Commands | file | `.factory/commands/` | `.md` | [→](https://docs.factory.ai/cli) |
| Factory Droid | Skills | directory | `.factory/skills/` | — | [→](https://docs.factory.ai/cli/configuration/skills) |
| Factory Droid | Subagents | directory | `.factory/droids/` | — | [→](https://docs.factory.ai/cli) |
| Gemini CLI | AGENTS.md | file | `.` | `.md` | [→](https://geminicli.com) |
| Gemini CLI | Commands | file | `.gemini/commands/` | `.toml` | [→](https://geminicli.com/docs/cli/custom-commands/) |
| Gemini CLI | GEMINI.md | file | `.gemini/` | `.md` | [→](https://geminicli.com/) |
| Gemini CLI | Skills | directory | `.gemini/skills/` | — | [→](https://geminicli.com/docs/cli/skills/) |
| Gemini CLI | Subagents | file | `.gemini/agents/` | `.md` | [→](https://geminicli.com/docs/core/subagents/) |
| GitHub Copilot | Agents | file | `.github/agents/` | `.agent.md`, `.md` | [→](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) |
| GitHub Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [→](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| GitHub Copilot | Prompts | file | `.github/prompts/` | `.prompt.md`, `.md` | [→](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| GitHub Copilot | Skills | directory | `.github/skills/` | — | [→](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| Goose | Skills | directory | `.goose/skills/` | — | [→](https://block.github.io/goose/) |
| Hermes Agent | Rules | file | `.` | `.md` | [→](https://hermesagent.com) |
| Hermes Agent | Skills | directory | `.hermes/skills/` | — | [→](https://hermesagent.com) |
| Junie | Agents | file | `.junie/agents/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | AGENTS.md | file | `.junie/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | Commands | file | `.junie/commands/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | Rules | file | `.junie/rules/` | `.md` | [→](https://www.jetbrains.com/junie/) |
| Junie | Skills | directory | `.junie/skills/` | — | [→](https://www.jetbrains.com/junie/) |
| Kilo Code | AGENTS.md | file | `.` | `.md` | [→](https://kilocode.ai) |
| Kilo Code | Commands | file | `.kilo/commands/` | `.md` | [→](https://kilocode.ai) |
| Kilo Code | Skills | directory | `.kilo/skills/` | — | [→](https://kilocode.ai) |
| Kilo Code | Subagents | file | `.kilo/agents/` | `.md` | [→](https://kilocode.ai) |
| Kimi Code | AGENTS.md | file | `.kimi-code/` | `.md` | [→](https://kimi.moonshot.cn) |
| Kimi Code | Skills | directory | `.kimi-code/skills/` | — | [→](https://kimi.moonshot.cn) |
| Kimi Code | Subagents | file | `.kimi-code/agents/` | `.md` | [→](https://kimi.moonshot.cn) |
| Kiro | Agents | file | `.kiro/agents/` | `.md` | [→](https://kiro.dev) |
| Kiro | Rules | file | `.kiro/steering/` | `.md` | [→](https://kiro.dev) |
| Kiro | Skills | directory | `.kiro/skills/` | — | [→](https://kiro.dev) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [→](https://opencode.ai/docs/agents/) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [→](https://opencode.ai/docs/commands/) |
| OpenCode | Rules | file | `.opencode/rules/` | `.md` | [→](https://opencode.ai) |
| OpenCode | Skills | directory | `.opencode/skills/` | — | [→](https://opencode.ai/docs/skills/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [→](https://opencode.ai/docs/tools/) |
| Pi | AGENTS.md | file | `.` | `.md` | [→](https://github.com/badlogic/pi-skills) |
| Pi | Prompts | file | `.pi/prompts/` | `.md` | [→](https://github.com/badlogic/pi-skills) |
| Pi | Skills | directory | `.pi/skills/` | — | [→](https://github.com/badlogic/pi-skills) |
| Qwen Code | Agents | file | `.qwen/agents/` | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | Commands | file | `.qwen/commands/` | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | QWEN.md | file | `.`（根目录） | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | Rules | file | `.qwen/rules/` | `.md` | [→](https://tongyi.aliyun.com) |
| Qwen Code | Skills | directory | `.qwen/skills/` | — | [→](https://tongyi.aliyun.com) |
| Trae | Agents | file | `.trae/agents/` | `.md` | [→](https://docs.trae.ai) |
| Trae | Commands | file | `.trae/commands/` | `.md` | [→](https://docs.trae.ai) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [→](https://docs.trae.ai/ide/rules) |
| Trae | Skills | directory | `.trae/skills/` | — | [→](https://docs.trae.ai/ide/skills) |
| Warp | Rules | file | `.` (root) | `.md` | [→](https://docs.warp.dev/agent-platform/capabilities/rules) |
| Warp | Skills | directory | `.agents/skills/` | — | [→](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | Commands | file | `.windsurf/workflows/` | `.md` | [→](https://docs.windsurf.com) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [→](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | — | [→](https://docs.windsurf.com/windsurf/cascade/skills) |
| WorkBuddy | Skills | directory | `.workbuddy/skills/` | — | [→](https://www.workbuddy.ai) |
| Zed | Skills | directory | `.agents/skills/` | — | [→](https://zed.dev) |
<!-- REF_TABLE:END -->

## Modes

- **directory** — Links entire directories (skills, agents)
- **file** — Links individual files with automatic suffix resolution
- **hybrid** — Links both files and directories (e.g., Cursor rules)