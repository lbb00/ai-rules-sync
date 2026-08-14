# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md) | [📖 文档](https://lbb00.github.io/ai-rules-sync/)

**AI Rules Sync (AIS)** — 从多个 Git 仓库安装、组合、更新和发布原生 Agent 资产，同步到所有项目。

> **AIS 是一个资产联邦工具，不是格式转换器。** 它保持你的文件原样不动 — skills、rules、commands、agents — 通过软链接同步到每个项目。一处编辑，处处更新。

---

## AIS 的与众不同

| AIS | 其他工具 |
|---|---|
| **软链接** — 上游改动即时生效 | 复制文件 — 需要重新运行才能更新 |
| **一个来源 → 多个项目** | 一次只能处理一个项目 |
| **原生资产** — 不做格式转换 | 重写/重新生成你的文件 |
| **导入 → 发布 → 审核** 协作流程 | 只能单向消费 |
| **370 KB，5 个依赖** | 通常 10+ MB 及深层依赖树 |
| **Git 原生** — 兼容任何 Git remote | 绑定特定 registry 或 API |

**AIS 与格式转换工具互补。** 如果你还需要跨工具格式转换，可以用 AIS 管理资产，用其他工具做生成 — 它们解决不同的问题。

**支持：** Cursor（rules、commands、skills、subagents）、GitHub Copilot（instructions、prompts、skills、agents）、Claude Code（rules、skills、subagents、CLAUDE.md）、Trae（rules、skills）、OpenCode（commands、skills、agents、tools）、Codex（rules、skills、AGENTS.md）、Gemini CLI（commands、skills、agents、GEMINI.md）、Windsurf（rules、skills）、Cline（rules、skills）、Warp（rules 通过 AGENTS.md、skills）以及通用 AGENTS.md。同时支持 **User 模式** 管理个人 AI 配置文件。

---

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

**验证：**
```bash
ais --version
```

**可选：启用 Tab 补全**
```bash
ais completion install
```

---

## 快速开始

### 使用仓库中的资产

```bash
cd your-project

# 添加规则（第一次需要指定仓库 URL）
ais cursor add react -t https://github.com/your-org/rules-repo.git

# 之后可以省略 -t
ais cursor add vue
ais copilot instructions add coding-standards
ais claude skills add code-review
```

### 分享你的现有资产

```bash
# 将项目中的规则导入到仓库
ais cursor rules import my-custom-rule

# 可选：推送到远程
ais cursor rules import my-rule --push
```

### 恢复资产（团队入职 / CI）

```bash
# 从 ai-rules-sync.json 恢复所有资产
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

---

## 支持的工具

_此表由 `docs/supported-tools.json` 通过 `npm run docs:sync-tools` 自动生成。_

<!-- SUPPORTED_TOOLS_TABLE:START -->
| 工具 | rules | skills | commands | agents | AGENTS.md | tools | prompts | instructions |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **通用** | — | — | — | — | ✅ | — | — | — |
| Aider | — | ✅ | — | — | — | — | — | — |
| Amp | — | ✅ | — | — | — | — | — | — |
| Antigravity CLI | — | ✅ | ✅ | — | — | — | — | — |
| Augment Code | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Claude Code | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| Cline | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| CodeBuddy | ✅ | ✅ | ✅ | — | ✅ | — | — | — |
| Codex | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| Continue | ✅ | ✅ | — | — | — | — | ✅ | — |
| Cursor | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| DeepAgents | — | ✅ | — | ✅ | ✅ | — | — | — |
| DeepSeek | — | ✅ | — | — | ✅ | — | — | — |
| Factory Droid | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Gemini CLI | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| GitHub Copilot | — | ✅ | — | ✅ | — | — | ✅ | ✅ |
| Goose | — | ✅ | — | — | — | — | — | — |
| Hermes Agent | ✅ | ✅ | — | — | — | — | — | — |
| Junie | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Kilo Code | — | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Kimi Code | — | ✅ | — | ✅ | ✅ | — | — | — |
| Kiro | ✅ | ✅ | — | ✅ | — | — | — | — |
| OpenCode | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |
| Pi | — | ✅ | — | — | ✅ | — | ✅ | — |
| Qwen Code | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Trae | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| Warp | ✅ | ✅ | — | — | — | — | — | — |
| Windsurf | ✅ | ✅ | ✅ | — | — | — | — | — |
| WorkBuddy | — | ✅ | — | — | — | — | — | — |
| Zed | — | ✅ | — | — | — | — | — | — |
<!-- SUPPORTED_TOOLS_TABLE:END -->

📋 [完整目录参考](./docs/reference/supported-tools.md) — 源路径、模式、后缀和文档链接。

---

## 核心概念

### 工作原理

```
Git 仓库                      全局缓存                      你的项目
┌─────────────────┐   clone   ┌──────────────────┐ symlink ┌──────────┐
│ .claude/skills/ │ ────────→ │ ~/.config/       │ ──────→ │ 项目 A   │
│ .cursor/rules/  │           │ ai-rules-sync/   │ ──────→ │ 项目 B   │
│ .github/inst... │           │ repos/           │ ──────→ │ 项目 C   │
└─────────────────┘           └──────────────────┘         └──────────┘
```

1. **克隆** — AIS 将资产仓库克隆到全局缓存（`~/.config/ai-rules-sync/repos/`）
2. **软链接** — 每个项目创建指向缓存的符号链接
3. **更新** — 拉取仓库更新后，所有项目立即生效

### 三层配置

| 文件 | 作用域 | 提交到 Git |
|------|--------|-----------|
| `ai-rules-sync.local.json` | 私有，单项目 | 否 |
| `ai-rules-sync.json` | 共享，单项目 | 是 |
| `user.json`（`~/.config/ai-rules-sync/`） | 全局，用户级 | 可选（dotfiles） |

### 三种核心操作

| 命令 | 作用 |
|------|------|
| `ais add` | 从仓库链接资产到项目 |
| `ais import` | 从项目复制资产到仓库，然后替换为软链接 |
| `ais install` | 从 `ai-rules-sync.json` 恢复所有软链接（团队入职、CI） |

---

## 基本用法

### 设置仓库

```bash
# 使用远程仓库
ais use https://github.com/your-org/rules-repo.git

# 使用本地路径（开发/测试）
ais use ~/my-rules-repo

# 列出所有已配置的仓库
ais ls

# 切换仓库
ais use company-rules
ais use personal-rules
```

### 添加资产到项目

```bash
cd your-project

# 首次：指定仓库
ais cursor add react -t https://github.com/org/rules.git

# 后续（使用当前仓库）
ais cursor add vue
ais cursor add typescript

# 使用别名
ais cursor add react react-18

# 从其他仓库
ais cursor add coding-standards -t company-rules

# 私有（保存到 ai-rules-sync.local.json）
ais cursor add company-secrets --local

# 自定义目标目录（monorepo）
ais cursor add my-rule -d packages/frontend/.cursor/rules
```

### 导入现有资产

```bash
ais cursor rules import my-custom-rule
ais cursor rules import my-rule -m "添加自定义规则"
ais cursor rules import my-rule --push
ais cursor rules import my-rule --force
```

### 移除资产

```bash
ais cursor rm react
ais cursor commands rm deploy
ais cursor skills rm code-review
```

### 从配置安装

```bash
git clone https://github.com/team/project.git
cd project
ais install
```

### 发现并安装全部

```bash
ais add-all
ais cursor add-all
ais add-all --dry-run
ais add-all --tools cursor,copilot
ais cursor add-all --interactive
```

---

## 各工具命令

### Cursor
```bash
ais cursor add react                 # 规则
ais cursor commands add deploy       # 命令
ais cursor skills add code-review    # 技能
ais cursor agents add code-analyzer  # 子代理
```

### GitHub Copilot
```bash
ais copilot instructions add coding-style
ais copilot prompts add generate-tests
ais copilot skills add web-scraping
ais copilot agents add code-reviewer
```

### Claude Code
```bash
ais claude rules add general
ais claude skills add code-review
ais claude agents add debugger
ais claude md add CLAUDE             # CLAUDE.md（项目级）
ais claude md add CLAUDE --user      # CLAUDE.md（个人级）
```

### Codex
```bash
ais codex rules add default
ais codex skills add code-assistant
ais codex md add AGENTS --user       # ~/.codex/AGENTS.md
```

### Gemini CLI
```bash
ais gemini commands add deploy-docs
ais gemini skills add code-review
ais gemini agents add code-analyzer
ais gemini md add GEMINI --user      # ~/.gemini/GEMINI.md
```

### 其他工具
```bash
ais trae rules add project-rules
ais opencode agents add code-reviewer
ais opencode tools add project-analyzer
ais windsurf add project-style
ais windsurf skills add deploy-staging
ais cline add coding
ais cline skills add release-checklist
ais warp skills add my-skill
ais agents-md add .                  # 通用 AGENTS.md
```

---

## 高级功能

### 多仓库

```bash
ais cursor add coding-standards -t company-rules
ais cursor add react-best-practices -t https://github.com/community/rules.git
ais cursor add my-utils -t personal-rules
```

### User 模式（个人 AI 配置文件）

```bash
ais claude md add CLAUDE --user      # → ~/.claude/CLAUDE.md
ais gemini md add GEMINI --user      # → ~/.gemini/GEMINI.md
ais codex md add AGENTS --user       # → ~/.codex/AGENTS.md
ais cursor rules add my-style --user

# 在新机器上恢复
ais user install
```

**Dotfiles 集成：**
```bash
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais user install
```

### 仓库生命周期

```bash
ais check                  # 检查上游更新
ais update --dry-run       # 预览更新
ais update                 # 拉取更新
ais init                   # 初始化规则仓库模板
```

### Git 命令

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### 自定义源目录

```bash
# CLI 参数（临时）
ais cursor rules add-all -s custom/rules

# 持久化配置
ais config repo set-source third-party cursor.rules custom/rules
ais config repo show third-party
```

### Tab 补全

```bash
ais completion install
ais cursor add <Tab>              # 列出可用规则
ais cursor commands add <Tab>     # 列出可用命令
```

---

## 配置参考

### ai-rules-sync.json

```json
{
  "version": 1,
  "cursor": {
    "rules": {
      "react": "https://github.com/user/repo.git",
      "react-v2": {
        "url": "https://github.com/user/another-repo.git",
        "rule": "react"
      }
    },
    "commands": { "deploy-docs": "https://github.com/user/repo.git" },
    "skills":   { "code-review": "https://github.com/user/repo.git" },
    "agents":   { "code-analyzer": "https://github.com/user/repo.git" }
  },
  "claude": {
    "rules":  { "general": "https://github.com/user/repo.git" },
    "skills": { "code-review": "https://github.com/user/repo.git" },
    "agents": { "debugger": "https://github.com/user/repo.git" },
    "md":     { "CLAUDE": "https://github.com/user/repo.git" }
  }
}
```

### 仓库配置（规则仓库中的 ai-rules-sync.json）

```json
{
  "version": 1,
  "rootPath": "src",
  "sourceDir": {
    "cursor": { "rules": ".cursor/rules", "commands": ".cursor/commands" },
    "claude": { "skills": ".claude/skills", "rules": ".claude/rules" },
    "*": { "skills": "common/skills" }
  }
}
```

### 条目格式

| 格式 | 示例 |
|------|------|
| 简单字符串 | `"react": "https://github.com/user/repo.git"` |
| 带别名的对象 | `"react-v2": { "url": "...", "rule": "react" }` |
| 自定义目标目录 | `"docs-rule": { "url": "...", "targetDir": "docs/ai/rules" }` |

---

## 了解更多

📖 **完整文档：** [https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)

- [快速入门](https://lbb00.github.io/ai-rules-sync/guide/getting-started)
- [项目级同步](https://lbb00.github.io/ai-rules-sync/guide/project-level)
- [用户全局级同步](https://lbb00.github.io/ai-rules-sync/guide/user-level)
- [多仓库管理](https://lbb00.github.io/ai-rules-sync/guide/multiple-repos)
- [CLI 参考](https://lbb00.github.io/ai-rules-sync/reference/cli)
- [配置参考](https://lbb00.github.io/ai-rules-sync/reference/configuration)

---

## 链接

- **文档**：[https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)
- **问题反馈**：[https://github.com/lbb00/ai-rules-sync/issues](https://github.com/lbb00/ai-rules-sync/issues)
- **NPM**：[https://www.npmjs.com/package/ai-rules-sync](https://www.npmjs.com/package/ai-rules-sync)

---

## 许可证

[Unlicense](./LICENSE) - 自由使用、修改和分发。