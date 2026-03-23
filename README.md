# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md) | [📖 Documentation](https://lbb00.github.io/ai-rules-sync/)

**AI Rules Sync (AIS)** — Synchronize, manage, and share your AI agent rules across projects and teams.

Stop copying `.mdc` files around. Manage your rules in Git repositories and sync them via symbolic links.

## Why AIS?

- **🔄 Sync Once, Update Everywhere** — Single source of truth, edit once, update all projects
- **🧩 Multi-Repository** — Mix rules from company standards, community collections, and personal preferences
- **🤝 Team Sharing** — Share coding standards via Git, onboard new members with `ais install`
- **🔒 Privacy First** — Keep sensitive rules local with `ai-rules-sync.local.json`
- **🛠️ Multi-Tool Support** — One workflow for Cursor, Copilot, Claude Code, and 8+ more tools

## Supported Tools

_This table is generated from `docs/supported-tools.json` via `npm run docs:sync-tools`._

<!-- SUPPORTED_TOOLS_TABLE:START -->
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
| Warp | Rules | file | `.` (root) | `.md` | [Docs](https://docs.warp.dev/agent-platform/capabilities/rules) — same as AGENTS.md, use `ais agents-md` |
| Warp | Skills | directory | `.agents/skills/` | - | [Docs](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [Docs](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | - | [Docs](https://docs.windsurf.com/windsurf/cascade/skills) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [Docs](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | - | [Docs](https://docs.cline.bot/customization/skills) |
| **Universal** | **AGENTS.md** | file | `.` (root) | `.md` | [Standard](https://agents.md/) |
<!-- SUPPORTED_TOOLS_TABLE:END -->

## Installation

### Via npm (Recommended)

```bash
npm install -g ai-rules-sync
```

### Via Homebrew (macOS)

```bash
brew tap lbb00/ai-rules-sync https://github.com/lbb00/ai-rules-sync
brew install ais
```

**Verify:**
```bash
ais --version
```

## Quick Start

### Use rules from a repository

```bash
cd your-project

# Add a rule (specify repository URL the first time)
ais cursor add react -t https://github.com/your-org/rules-repo.git

# After first use, omit -t
ais cursor add vue
ais copilot instructions add coding-standards
ais claude skills add code-review
```

### Share your existing rules

```bash
# Import a rule from your project into the repository
ais cursor rules import my-custom-rule

# Optionally push to remote
ais cursor rules import my-rule --push
```

### Restore rules (team onboarding / CI)

```bash
# Restore all rules from ai-rules-sync.json
ais install
```

### User-level sync (personal AI configs)

```bash
# Sync personal configs to $HOME
ais claude md add CLAUDE --user
ais gemini md add GEMINI --user

# Restore on a new machine
ais user install
```

## Learn More

📖 **Full documentation:** [https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)

- [Getting Started](https://lbb00.github.io/ai-rules-sync/guide/getting-started)
- [Project-Level Sync](https://lbb00.github.io/ai-rules-sync/guide/project-level)
- [User Global-Level Sync](https://lbb00.github.io/ai-rules-sync/guide/user-level)
- [Multiple Repositories](https://lbb00.github.io/ai-rules-sync/guide/multiple-repos)
- [CLI Reference](https://lbb00.github.io/ai-rules-sync/reference/cli)
- [Configuration Reference](https://lbb00.github.io/ai-rules-sync/reference/configuration)

## Links

- **Documentation**: [https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)
- **Issues**: [https://github.com/lbb00/ai-rules-sync/issues](https://github.com/lbb00/ai-rules-sync/issues)
- **NPM**: [https://www.npmjs.com/package/ai-rules-sync](https://www.npmjs.com/package/ai-rules-sync)

## License

[Unlicense](./LICENSE) - Free to use, modify, and distribute.
