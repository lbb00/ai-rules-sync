# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md) | [📖 文档](https://lbb00.github.io/ai-rules-sync/)

**AI Rules Sync (AIS)** — 跨项目和团队同步、管理和共享你的 AI 代理规则。

不再复制粘贴 `.mdc` 文件。在 Git 仓库中管理规则，通过软链接同步。

## 为什么选择 AIS？

- **🔄 一次同步，处处更新** — 单一数据源，编辑一次，所有项目自动更新
- **🧩 多仓库支持** — 混合使用公司标准、社区集合和个人偏好的规则
- **🤝 团队共享** — 通过 Git 共享编码标准，`ais install` 一键完成新成员入职
- **🔒 隐私优先** — 使用 `ai-rules-sync.local.json` 保持敏感规则本地化
- **🛠️ 多工具支持** — 一套工作流支持 Cursor、Copilot、Claude Code 及 8+ 更多工具

## 支持的工具

_此表由 `docs/supported-tools.json` 通过 `npm run docs:sync-tools` 自动生成。_

<!-- SUPPORTED_TOOLS_TABLE:START -->
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
| Warp | Rules | file | `.`（根目录） | `.md` | [文档](https://docs.warp.dev/agent-platform/capabilities/rules) — 与 AGENTS.md 相同，使用 `ais agents-md` |
| Warp | Skills | directory | `.agents/skills/` | - | [文档](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [文档](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | - | [文档](https://docs.windsurf.com/windsurf/cascade/skills) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [文档](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | - | [文档](https://docs.cline.bot/customization/skills) |
| **通用** | **AGENTS.md** | file | `.`（根目录） | `.md` | [标准](https://agents.md/) |
<!-- SUPPORTED_TOOLS_TABLE:END -->

## 安装

### 通过 npm（推荐）

```bash
npm install -g ai-rules-sync
```

### 通过 Homebrew（macOS）

```bash
brew tap lbb00/ai-rules-sync https://github.com/lbb00/ai-rules-sync
brew install ais
```

**验证安装：**
```bash
ais --version
```

## 快速开始

### 使用仓库中的规则

```bash
cd your-project

# 添加规则（第一次需要指定仓库 URL）
ais cursor add react -t https://github.com/your-org/rules-repo.git

# 之后可以省略 -t
ais cursor add vue
ais copilot instructions add coding-standards
ais claude skills add code-review
```

### 分享你的现有规则

```bash
# 将项目中的规则导入到仓库
ais cursor rules import my-custom-rule

# 可选：推送到远程
ais cursor rules import my-rule --push
```

### 恢复规则（团队入职 / CI）

```bash
# 从 ai-rules-sync.json 恢复所有规则
ais install
```

### User 模式（个人 AI 配置）

```bash
# 同步个人配置到 $HOME
ais claude md add CLAUDE --user
ais gemini md add GEMINI --user

# 在新机器上恢复
ais user install
```

## 了解更多

📖 **完整文档：** [https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)

- [快速入门](https://lbb00.github.io/ai-rules-sync/guide/getting-started)
- [项目级同步](https://lbb00.github.io/ai-rules-sync/guide/project-level)
- [用户全局级同步](https://lbb00.github.io/ai-rules-sync/guide/user-level)
- [多仓库管理](https://lbb00.github.io/ai-rules-sync/guide/multiple-repos)
- [CLI 参考](https://lbb00.github.io/ai-rules-sync/reference/cli)
- [配置参考](https://lbb00.github.io/ai-rules-sync/reference/configuration)

## 链接

- **文档**：[https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)
- **问题反馈**：[https://github.com/lbb00/ai-rules-sync/issues](https://github.com/lbb00/ai-rules-sync/issues)
- **NPM**：[https://www.npmjs.com/package/ai-rules-sync](https://www.npmjs.com/package/ai-rules-sync)

## 许可证

[Unlicense](./LICENSE) - 自由使用、修改和分发。
