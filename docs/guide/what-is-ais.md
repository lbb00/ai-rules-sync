# What is AIS?

**AI Rules Sync (AIS)** is a CLI tool for synchronizing, managing, and sharing AI agent rules across projects and teams.

**TL;DR:** AIS syncs rules from Git repositories to your project via symbolic links. Edit once in the repo, all projects get the update. Supports Cursor, Copilot, Claude Code, and 8+ more AI tools.

## The Problem

Modern AI coding assistants (Cursor, GitHub Copilot, Claude Code, etc.) use project-level configuration files to customize their behavior. Teams often:

- **Copy-paste** rule files between projects
- **Lose sync** when rules are updated
- **Lack consistency** across team members and projects
- **Can't share** rules easily between teams

## The Solution

AIS manages your rules in Git repositories and syncs them to projects via **symbolic links**. This means:

- **Single source of truth** — edit once, update everywhere
- **Version controlled** — track changes with Git
- **Team sharing** — share via Git repositories
- **Multi-tool support** — one workflow for Cursor, Copilot, Claude, and more

## Supported Tools

AIS supports a wide range of AI coding tools:

| Tool | Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|------|--------------------------|---------------|---------------|
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [Docs](https://cursor.com/docs/context/rules) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [Docs](https://cursor.com/docs/context/commands) |
| Cursor | Skills | directory | `.cursor/skills/` | - | [Docs](https://cursor.com/docs/context/skills) |
| Cursor | Subagents | directory | `.cursor/agents/` | - | [Docs](https://cursor.com/docs/context/subagents) |
| GitHub Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions) |
| GitHub Copilot | Prompts | file | `.github/prompts/` | `.prompt.md`, `.md` | [Docs](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| GitHub Copilot | Skills | directory | `.github/skills/` | - | [Docs](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| GitHub Copilot | Agents | file | `.github/agents/` | `.agent.md`, `.md` | [Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents) |
| Claude Code | Rules | file | `.claude/rules/` | `.md` | [Docs](https://code.claude.com/docs/en/memory) |
| Claude Code | Skills | directory | `.claude/skills/` | - | [Docs](https://code.claude.com/docs/en/skills) |
| Claude Code | Subagents | directory | `.claude/agents/` | - | [Docs](https://code.claude.com/docs/en/sub-agents) |
| Claude Code | CLAUDE.md | file | `.claude/` | `.md` | [Docs](https://docs.anthropic.com/en/docs/claude-code/memory) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [Docs](https://docs.trae.ai/ide/rules) |
| Trae | Skills | directory | `.trae/skills/` | - | [Docs](https://docs.trae.ai/ide/skills) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [Docs](https://opencode.ai/docs/commands/) |
| OpenCode | Skills | directory | `.opencode/skills/` | - | [Docs](https://opencode.ai/docs/skills/) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [Docs](https://opencode.ai/docs/agents/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [Docs](https://opencode.ai/docs/tools/) |
| Codex | Rules | file | `.codex/rules/` | `.rules` | [Docs](https://developers.openai.com/codex/rules) |
| Codex | Skills | directory | `.agents/skills/` | - | [Docs](https://developers.openai.com/codex/skills) |
| Codex | AGENTS.md | file | `.codex/` | `.md` | [Docs](https://developers.openai.com/codex) |
| Gemini CLI | Commands | file | `.gemini/commands/` | `.toml` | [Docs](https://geminicli.com/docs/cli/custom-commands/) |
| Gemini CLI | Skills | directory | `.gemini/skills/` | - | [Docs](https://geminicli.com/docs/cli/skills/) |
| Gemini CLI | Agents | file | `.gemini/agents/` | `.md` | [Docs](https://geminicli.com/docs/core/subagents/) |
| Gemini CLI | GEMINI.md | file | `.gemini/` | `.md` | [Website](https://geminicli.com/) |
| Warp | Rules | file | `.` (root) | `.md` | [Docs](https://docs.warp.dev/agent-platform/capabilities/rules) |
| Warp | Skills | directory | `.agents/skills/` | - | [Docs](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [Docs](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | - | [Docs](https://docs.windsurf.com/windsurf/cascade/skills) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [Docs](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | - | [Docs](https://docs.cline.bot/customization/skills) |
| **Universal** | **AGENTS.md** | file | `.` (root) | `.md` | [Standard](https://agents.md/) |

### Modes

- **directory** — Links entire directories (skills, agents)
- **file** — Links individual files with automatic suffix resolution
- **hybrid** — Links both files and directories (e.g., Cursor rules)

## How It Works

AIS manages rules at two scopes via symbolic links:

- **[Project-Level Sync](./project-level)** — Sync rules into a project directory, tracked in [`ai-rules-sync.json`](/reference/configuration) and shared with your team
- **[User Global-Level Sync](./user-level)** — Sync personal AI configs into `$HOME`, tracked in `~/.config/ai-rules-sync/user.json`
