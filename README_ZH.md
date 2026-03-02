# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md)

**AI Rules Sync (AIS)** - 跨项目和团队同步、管理和共享你的 AI 代理规则。

不再复制粘贴 `.mdc` 文件。在 Git 仓库中管理规则，通过软链接同步。

**支持：** Cursor（规则、命令、技能、subagents）、GitHub Copilot（指令、提示词、技能、代理）、Claude Code（规则、技能、subagents、CLAUDE.md）、Trae（规则、技能）、OpenCode（命令、技能、代理、工具）、Codex（规则、技能、AGENTS.md）、Gemini CLI（命令、技能、代理、GEMINI.md）、Windsurf（规则、技能）、Cline（规则、技能）、Warp（规则 via AGENTS.md、技能）以及通用的 AGENTS.md。另支持 **User 模式**，用于管理个人 AI 配置文件（如 `~/.claude/CLAUDE.md`、`~/.gemini/GEMINI.md`、`~/.codex/AGENTS.md`、`~/.config/opencode/` 等）。

---

## 目录

- [为什么选择 AIS？](#为什么选择-ais)
- [安装](#安装)
- [支持的工具](#支持的工具)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [基础使用](#基础使用)
- [各工具使用指南](#各工具使用指南)
- [高级功能](#高级功能)
  - [命令易用性（Linux 风格 + 脚本友好）](#命令易用性linux-风格--脚本友好)
  - [User 模式](#user-模式个人-ai-配置文件)
- [配置参考](#配置参考)
- [架构](#架构)
- [故障排查](#故障排查)

---

## 为什么选择 AIS？

- **🧩 多仓库支持**：混合使用公司标准、团队协议和开源集合的规则
- **🔄 一次同步，处处更新**：单一数据源，所有项目自动更新
- **🤝 团队对齐**：即时共享编码标准，一条命令完成新成员入职
- **🔒 隐私优先**：使用 `ai-rules-sync.local.json` 保持敏感规则本地化
- **🛠️ Git 集成**：通过 CLI 直接管理仓库（`ais git`）
- **🔌 可扩展**：插件架构，易于添加新的 AI 工具支持

---

## 安装

### 通过 Homebrew（macOS/Linux）

```bash
brew install lbb00/ai-rules-sync/ais
# 或先 tap，之后命令更简洁：
brew tap lbb00/ai-rules-sync
brew install ais
```

### 通过 npm

```bash
npm install -g ai-rules-sync
```

**验证安装：**
```bash
ais --version
```

**可选：启用 Tab 补全**
```bash
ais completion install
```

---

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

**模式说明：**
- **directory**：链接整个目录（技能、代理）
- **file**：链接单个文件，自动处理后缀解析
- **hybrid**：同时支持文件和目录（例如 Cursor 规则）

---

## 快速开始

### 场景 1：使用现有规则

**你有一个规则仓库，想在项目中使用其规则。**

```bash
# 1. 进入你的项目
cd your-project

# 2. 添加规则（重要：第一次必须指定仓库 URL）
ais cursor add react -t https://github.com/your-org/rules-repo.git

# 完成！规则现在已链接到你的项目
```

**刚才发生了什么？**
- AIS 将仓库克隆到 `~/.config/ai-rules-sync/repos/`
- 设置其为当前仓库
- 创建软链接：`rules-repo/.cursor/rules/react` → `your-project/.cursor/rules/react`
- 保存配置到 `ai-rules-sync.json`

**之后**，你可以省略 `-t` 标志：
```bash
ais cursor add vue
ais cursor add testing
```

### 场景 2：分享你的现有规则

**你在项目中有规则，想通过仓库分享它们。**

```bash
# 1. 创建规则仓库（或使用现有仓库）
# 选项 A：创建新仓库
git init ~/my-rules-repo
ais use ~/my-rules-repo

# 选项 B：使用现有仓库
ais use https://github.com/your-org/rules-repo.git

# 2. 导入你的现有规则
cd your-project
ais cursor rules import my-custom-rule

# 完成！你的规则现在在仓库中，并链接到项目
```

**刚才发生了什么？**
- AIS 将 `your-project/.cursor/rules/my-custom-rule` 复制到仓库
- 创建 git commit
- 用软链接替换原文件
- 保存配置到 `ai-rules-sync.json`

**可选：推送到远程**
```bash
ais cursor rules import my-rule --push
# 或手动：
ais git push
```

---

## 核心概念

### 1. 仓库

**规则仓库**是一个包含你的规则的 Git 仓库，按工具组织：

```
my-rules-repo/
├── .cursor/
│   ├── rules/
│   │   ├── react.mdc
│   │   └── typescript.mdc
│   ├── commands/
│   │   └── deploy.md
│   └── skills/
│       └── code-review/
├── .claude/
│   └── skills/
│       └── debug-helper/
└── ai-rules-sync.json  # 可选：自定义源路径
```

**仓库位置：**
- **全局**：`~/.config/ai-rules-sync/repos/`（由 AIS 管理）
- **本地**：任何本地路径（用于开发）

**管理仓库：**
```bash
# 设置当前仓库
ais use https://github.com/your-org/rules-repo.git

# 列出所有仓库（Linux 风格别名）
ais ls
# 兼容保留：
ais list

# 在仓库之间切换
ais use company-rules
ais use personal-rules
```

### 2. 获取规则的三种方式

#### **`add`** - 从仓库使用规则
将仓库中的条目链接到你的项目，并保存依赖到 `ai-rules-sync.json`。

**何时使用：**你想使用共享仓库中的现有规则。

#### **`import`** - 通过仓库分享你的规则
将项目中已有的条目复制到仓库并提交，然后用软链接替换原文件。

**何时使用：**你在项目中有规则并想分享它们。

#### **`install`** - 从配置文件恢复
读取 `ai-rules-sync.json` 并重建所有软链接，无需重新指定仓库地址。

**何时使用：**你克隆了一个带有 `ai-rules-sync.json` 的项目，想设置所有规则。

### 3. 配置文件

**`ai-rules-sync.json`** - 项目配置（提交到 git）
```json
{
  "cursor": {
    "rules": {
      "react": "https://github.com/org/rules.git"
    }
  }
}
```

**`ai-rules-sync.local.json`** - 私有规则（不提交到 git）
```json
{
  "cursor": {
    "rules": {
      "company-secrets": "https://github.com/company/private-rules.git"
    }
  }
}
```

---

## 基础使用

### 设置仓库

**选项 1：使用现有仓库**
```bash
ais use https://github.com/your-org/rules-repo.git
```

**选项 2：创建新的本地仓库**
```bash
# 创建目录并初始化 git
mkdir ~/my-rules-repo
cd ~/my-rules-repo
git init

# 设置为当前仓库
ais use ~/my-rules-repo

# 创建规则结构
mkdir -p .cursor/rules
echo "# React Rules" > .cursor/rules/react.mdc
git add .
git commit -m "Initial commit"
```

**选项 3：克隆并使用**
```bash
git clone https://github.com/your-org/rules-repo.git ~/my-rules-repo
ais use ~/my-rules-repo
```

### 添加规则到项目

**基础添加：**
```bash
cd your-project

# 第一次：指定仓库
ais cursor add react -t https://github.com/org/rules.git

# 后续添加
ais cursor add vue
ais cursor add typescript
```

**使用别名添加：**
```bash
# 添加 'react' 规则但在项目中命名为 'react-18'
ais cursor add react react-18
```

**从不同仓库添加：**
```bash
# 从公司仓库添加
ais cursor add coding-standards -t company-rules

# 从个人仓库添加
ais cursor add my-utils -t personal-rules
```

**添加为私有（本地）规则：**
```bash
# 不会提交到 git（保存在 ai-rules-sync.local.json）
ais cursor add company-secrets --local
```

### 导入现有规则

**从项目导入规则到仓库：**
```bash
cd your-project

# 导入规则
ais cursor rules import my-custom-rule

# 使用自定义 commit 消息导入
ais cursor rules import my-rule -m "添加自定义规则"

# 导入并推送到远程
ais cursor rules import my-rule --push

# 如果仓库中已存在则强制覆盖
ais cursor rules import my-rule --force
```

**导入过程中发生了什么：**
1. 从项目复制规则到仓库
2. 创建 git commit
3. 用软链接替换原文件
4. 更新 `ai-rules-sync.json`

### 移除规则

```bash
# 移除规则（删除软链接和配置条目）
ais cursor remove react

# 从特定工具移除
ais cursor commands remove deploy
ais cursor skills remove code-review
```

### 从配置安装

**克隆项目时：**
```bash
# 克隆项目
git clone https://github.com/team/project.git
cd project

# 从 ai-rules-sync.json 安装所有规则
ais install
```

**重新安装所有规则：**
```bash
# 移除并重新创建所有软链接
ais cursor install
ais copilot install  # 所有 copilot 条目（指令 + 技能 + 提示词 + 代理）
ais install  # 所有工具
```

---

## 各工具使用指南

### Cursor

#### 规则（混合模式）

```bash
# 添加 .mdc 文件
ais cursor add react
ais cursor add coding-standards.mdc

# 添加 .md 文件
ais cursor add readme.md

# 添加规则目录
ais cursor add my-rule-dir

# 移除
ais cursor remove react
```

#### 命令

```bash
# 添加命令
ais cursor commands add deploy-docs

# 移除命令
ais cursor commands remove deploy-docs
```

#### 技能

```bash
# 添加技能（目录）
ais cursor skills add code-review

# 移除技能
ais cursor skills remove code-review
```

#### Subagents

```bash
# 添加 subagent（目录）
ais cursor agents add code-analyzer

# 移除 subagent
ais cursor agents remove code-analyzer
```

### GitHub Copilot

```bash
# 添加指令
ais copilot instructions add coding-style

# 后缀匹配（如果两者都存在，必须明确指定）
ais copilot instructions add style.md               # 明确指定
ais copilot instructions add style.instructions.md  # 明确指定

# 添加提示词文件
ais copilot prompts add generate-tests

# 添加技能
ais copilot skills add web-scraping

# 添加自定义代理
ais copilot agents add code-reviewer

# 移除
ais copilot instructions remove coding-style
ais copilot prompts remove generate-tests
ais copilot skills remove web-scraping
ais copilot agents remove code-reviewer
```

### Claude Code

```bash
# 添加规则
ais claude rules add general

# 添加技能
ais claude skills add code-review

# 添加 subagent
ais claude agents add debugger

# 添加 CLAUDE.md（使用 --user 管理个人 user 级配置）
ais claude md add CLAUDE --user           # → ~/.claude/CLAUDE.md
ais claude md add CLAUDE                  # → .claude/CLAUDE.md（项目级）

# 安装所有
ais claude install

# 移除
ais claude rules remove general
ais claude skills remove code-review
ais claude agents remove debugger
ais claude md remove CLAUDE --user
```

### Trae

```bash
# 添加规则
ais trae rules add project-rules

# 添加技能
ais trae skills add adapter-builder

# 移除
ais trae rules remove project-rules
ais trae skills remove adapter-builder
```

### OpenCode

```bash
# 添加代理
ais opencode agents add code-reviewer

# 添加技能
ais opencode skills add refactor-helper

# 添加命令
ais opencode commands add build-optimizer

# 添加工具
ais opencode tools add project-analyzer

# 移除
ais opencode agents remove code-reviewer
```

### Codex

```bash
# 添加规则（用于沙箱控制的 Starlark 语法）
ais codex rules add default

# 添加技能
ais codex skills add code-assistant

# 添加 AGENTS.md（项目级上下文文件）
ais codex md add AGENTS

# 安装所有
ais codex install

# 从项目导入
ais codex rules import my-sandbox-rules
ais codex skills import my-helper-skill

# 移除
ais codex rules remove default
```

**注意：** Codex 技能使用 `.agents/skills/` 目录（而非 `.codex/skills/`），这是按照 OpenAI 文档的规定。

**User 模式** — 管理 `~/.codex/AGENTS.md`：

```bash
ais codex md add AGENTS --user
# → 符号链接创建于 ~/.codex/AGENTS.md
```

### Gemini CLI

```bash
# 添加命令（.toml）
ais gemini commands add deploy-docs

# 添加技能（目录）
ais gemini skills add code-review

# 添加代理（.md）
ais gemini agents add code-analyzer

# 添加 GEMINI.md（项目级上下文文件）
ais gemini md add GEMINI

# 安装所有
ais gemini install
```

**User 模式** — 管理 `~/.gemini/GEMINI.md`：

```bash
ais gemini md add GEMINI --user
# → 符号链接创建于 ~/.gemini/GEMINI.md
```

### AGENTS.md（通用）

```bash
# 从根目录添加
ais agents-md add .

# 从目录添加
ais agents-md add frontend

# 使用别名添加（区分多个 AGENTS.md 文件）
ais agents-md add frontend fe-agents
ais agents-md add backend be-agents

# 移除
ais agents-md remove fe-agents
```

### Warp

#### 规则（Rules）

Warp Rules 使用 [AGENTS.md 标准](https://agents.md/) — 使用 `agents-md` 命令：

```bash
# 从仓库根目录添加 AGENTS.md（在 Warp 中全局生效）
ais agents-md add .

# 添加目录专属规则
ais agents-md add src

# 移除
ais agents-md remove .
```

#### 技能（Skills）

```bash
ais warp skills add my-skill
ais warp skills remove my-skill
ais warp skills install
```

### Windsurf

```bash
# 添加规则
ais windsurf add project-style

# 添加技能
ais windsurf skills add deploy-staging

# 移除
ais windsurf remove project-style

# 安装全部
ais windsurf install
```

> 说明：Windsurf Memories 由 Cascade 运行时/界面管理。AIS 仅同步可文件化内容（`.windsurf/rules` 与 `.windsurf/skills`）。

### Cline

```bash
# 添加规则
ais cline add coding

# 添加技能
ais cline skills add release-checklist

# 移除
ais cline remove coding

# 安装全部
ais cline install
```

---

## 高级功能

### 多仓库

**使用 `-t` 标志指定使用哪个仓库：**

```bash
# 从公司仓库添加
ais cursor add coding-standards -t company-rules

# 从开源仓库添加
ais cursor add react-best-practices -t https://github.com/community/rules.git

# 从个人仓库添加
ais cursor add my-utils -t personal-rules
```

**查看当前仓库：**
```bash
ais ls
# * company-rules (current)
#   personal-rules
#   community-rules
```

**切换默认仓库：**
```bash
ais use personal-rules
```

### 命令易用性（Linux 风格 + 脚本友好）

AIS 提供更符合 Linux 习惯的别名，并支持机器可读的查询输出：

```bash
# Linux 风格别名（向后兼容）
ais ls                      # 等价于：ais list
ais rm old-rule             # 等价于：ais remove old-rule
ais cursor rules rm react   # 等价于：ais cursor rules remove react

# 查询命令
ais status                  # 查看当前仓库与项目配置摘要
ais search react            # 在当前规则仓库中搜索可用条目

# 脚本/CI 的 JSON 输出
ais ls --json
ais status --json
ais search react --json
ais config repo ls --json
ais config repo show company-rules --json

# 对破坏性命令先预览
ais cursor rules rm react --dry-run
ais cursor rules import my-rule --dry-run
```

### 全局选项

所有命令都支持：

- `-t, --target <repo>`：指定仓库（名称或 URL）
- `-l, --local`：保存到 `ai-rules-sync.local.json`（私有）

示例：
```bash
ais cursor add react -t company-rules --local
ais copilot instructions add coding-style -t https://github.com/org/rules.git
```

### 发现并安装所有（add-all）

**自动发现并安装所有可用规则：**

```bash
# 从当前仓库安装所有内容
ais add-all

# 安装所有 Cursor 规则
ais cursor add-all

# 安装特定类型
ais cursor rules add-all

# 安装前预览
ais add-all --dry-run

# 按工具过滤
ais add-all --tools cursor,copilot

# 交互模式（逐个确认）
ais cursor add-all --interactive

# 强制覆盖现有
ais add-all --force

# 跳过已存在的
ais add-all --skip-existing

# 保存为私有
ais cursor add-all --local
```

**输出示例：**
```
Discovering entries from repository...
  cursor-rules: 5 entries
  cursor-commands: 3 entries
Total: 8 entries discovered

Installing entries:
[1/8] cursor-rules/react → .cursor/rules/react ✓
[2/8] cursor-rules/vue → .cursor/rules/vue ✓
...

Summary:
  Installed: 7
  Skipped: 1 (already configured)
```

### 自定义源目录

**对于非标准结构的第三方仓库：**

#### CLI 参数（临时）

```bash
# 简单格式（在上下文中）
ais cursor rules add-all -s custom/rules

# 点号格式（明确指定）
ais add-all -s cursor.rules=custom/rules -s cursor.commands=custom/cmds

# 先预览
ais cursor rules add-all -s custom/rules --dry-run
```

#### 全局配置（持久化）

```bash
# 设置自定义源目录
ais config repo set-source third-party cursor.rules custom/rules

# 查看配置
ais config repo show third-party

# 清除配置
ais config repo clear-source third-party cursor.rules
ais config repo clear-source third-party  # 清除所有

# 列出所有仓库
ais config repo list
```

**优先级系统：**
```
CLI 参数 > 全局配置 > 仓库配置 > 适配器默认值
```

### 自定义目标目录

**更改规则在项目中的链接位置：**

```bash
# 添加到自定义目录
ais cursor add my-rule -d docs/ai/rules

# Monorepo：不同的包
ais cursor add react-rules frontend-rules -d packages/frontend/.cursor/rules
ais cursor add node-rules backend-rules -d packages/backend/.cursor/rules
```

**重要：将同一规则添加到多个位置需要别名：**

```bash
# 第一个位置（无需别名）
ais cursor add auth-rules -d packages/frontend/.cursor/rules

# 第二个位置（需要别名）
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules
```

### User 模式（个人 AI 配置文件）

**使用版本控制管理个人 AI 配置文件：**

```bash
# Claude Code：~/.claude/CLAUDE.md
ais claude md add CLAUDE --user

# Gemini CLI：~/.gemini/GEMINI.md
ais gemini md add GEMINI --user

# Codex：~/.codex/AGENTS.md
ais codex md add AGENTS --user

# OpenCode（XDG 路径）：~/.config/opencode/commands/
ais opencode commands add my-cmd --user

# Cursor 规则：~/.cursor/rules/
ais cursor rules add my-style --user

# 在新机器上一键恢复所有 user 配置
ais user install
# 等价于：
ais install --user
```

> **OpenCode 注意：** User 级别文件存放在 `~/.config/opencode/`（XDG 规范），而非 `~/.opencode/`。

**管理 user 配置路径**（用于 dotfiles 集成）：

```bash
# 查看当前 user 配置路径
ais config user show

# 将 user.json 存储在 dotfiles 仓库中（便于 git 跟踪）
ais config user set ~/dotfiles/ai-rules-sync/user.json

# 重置为默认路径（~/.config/ai-rules-sync/user.json）
ais config user reset
```

**多机器工作流：**

```bash
# 机器 A：初始设置
ais use git@github.com:me/my-rules.git
ais config user set ~/dotfiles/ai-rules-sync/user.json  # 可选
ais claude md add CLAUDE --user
ais cursor rules add my-style --user
# user.json 记录所有依赖（提交到 dotfiles 即可共享）

# 机器 B：一键恢复
ais use git@github.com:me/my-rules.git
ais config user set ~/dotfiles/ai-rules-sync/user.json  # 若使用 dotfiles
ais user install
```

**user.json 格式**（与 `ai-rules-sync.json` 相同）：

```json
{
  "claude": {
    "md": { "CLAUDE": "https://github.com/me/my-rules.git" },
    "rules": { "general": "https://github.com/me/my-rules.git" }
  },
  "gemini": {
    "md": { "GEMINI": "https://github.com/me/my-rules.git" }
  },
  "codex": {
    "md": { "AGENTS": "https://github.com/me/my-rules.git" }
  },
  "cursor": {
    "rules": { "my-style": "https://github.com/me/my-rules.git" }
  }
}
```

### 仓库配置

**在仓库中自定义源路径：**

在规则仓库中创建 `ai-rules-sync.json`：

```json
{
  "rootPath": "src",
  "sourceDir": {
    "cursor": {
      "rules": ".cursor/rules",
      "commands": ".cursor/commands",
      "skills": ".cursor/skills",
      "agents": ".cursor/agents"
    },
    "copilot": {
      "instructions": ".github/instructions"
    },
    "claude": {
      "skills": ".claude/skills",
      "agents": ".claude/agents",
      "rules": ".claude/rules",
      "md": ".claude"
    },
    "trae": {
      "rules": ".trae/rules",
      "skills": ".trae/skills"
    },
    "opencode": {
      "agents": ".opencode/agents",
      "skills": ".opencode/skills",
      "commands": ".opencode/commands",
      "tools": ".opencode/tools"
    },
    "codex": {
      "rules": ".codex/rules",
      "skills": ".agents/skills"
    },
    "gemini": {
      "commands": ".gemini/commands",
      "skills": ".gemini/skills",
      "agents": ".gemini/agents"
    },
    "warp": {
      "skills": ".agents/skills"
    },
    "windsurf": {
      "rules": ".windsurf/rules",
      "skills": ".windsurf/skills"
    },
    "cline": {
      "rules": ".clinerules",
      "skills": ".cline/skills"
    },
    "agentsMd": {
      "file": "."
    }
  }
}
```

### Git 命令

**直接从 CLI 管理仓库：**

```bash
# 检查仓库状态
ais git status

# 拉取最新更改
ais git pull

# 推送 commit
ais git push

# 运行任何 git 命令
ais git log --oneline
ais git branch

# 指定仓库
ais git status -t company-rules
```

### Tab 补全

首次运行时，AIS 会自动提示安装 Tab 补全。手动安装：

```bash
ais completion install
```

安装后，在任意 `add` 命令后按 `<Tab>` 可列出仓库中的可用条目：

```bash
ais cursor add <Tab>              # 列出可用规则
ais cursor commands add <Tab>     # 列出可用命令
ais copilot instructions add <Tab>
```

---

## 配置参考

### ai-rules-sync.json 结构

**项目配置文件（提交到 git）：**

```json
{
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

其他工具（`copilot`、`trae`、`opencode`、`codex`、`gemini`、`warp`、`windsurf`、`cline`）的结构相同，键名参见[支持的工具](#支持的工具)。

**格式类型：**

1. **简单字符串：**仅仓库 URL
   ```json
   "react": "https://github.com/user/repo.git"
   ```

2. **带别名的对象：**项目中的名称与仓库中不同
   ```json
   "react-v2": {
     "url": "https://github.com/user/repo.git",
     "rule": "react"
   }
   ```

3. **带自定义目标目录的对象：**
   ```json
   "docs-rule": {
     "url": "https://github.com/user/repo.git",
     "targetDir": "docs/ai/rules"
   }
   ```

### 本地/私有规则

**使用 `ai-rules-sync.local.json` 管理私有规则：**

```bash
# 添加私有规则
ais cursor add company-secrets --local
```

**此文件：**
- 结构与 `ai-rules-sync.json` 相同
- 应在 `.gitignore` 中（AIS 自动添加）
- 与主配置合并（本地优先）

### Legacy 兼容性

**旧的 `cursor-rules.json` 格式仍然支持：**

- 如果 `ai-rules-sync.json` 不存在但 `cursor-rules.json` 存在，AIS 会读取它
- 运行任何写命令（add/remove）会迁移到新格式
- Legacy 格式仅支持 Cursor 规则

---

## 架构

**AIS 使用基于插件的适配器架构：**

```
CLI 层
    ↓
适配器注册与查找 (findAdapterForAlias)
    ↓
统一操作 (addDependency, removeDependency, link, unlink)
    ↓
同步引擎 (linkEntry, unlinkEntry)
    ↓
配置层 (ai-rules-sync.json)
```

**核心设计原则：**

1. **统一接口**：所有适配器实现相同的操作
2. **自动路由**：根据配置自动找到正确的适配器
3. **通用函数**：`addDependencyGeneric()` 和 `removeDependencyGeneric()` 适用于任何适配器
4. **可扩展**：易于添加新 AI 工具支持

添加新适配器的详细说明请参见 [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md)。

---

## 故障排查

### 安装后找不到命令

```bash
# 验证安装
npm list -g ai-rules-sync

# 重新安装
npm install -g ai-rules-sync

# 检查 PATH
echo $PATH
```

### 软链接问题

```bash
# 移除所有软链接并重新创建
ais cursor install

# 或手动
rm .cursor/rules/*
ais cursor install
```

### 找不到仓库

```bash
# 列出仓库
ais ls

# 设置仓库
ais use <repo-name-or-url>
```

### Tab 补全不工作

```bash
# Zsh：确保补全已初始化
# 在 ~/.zshrc 中 ais completion 行之前添加：
autoload -Uz compinit && compinit
```

---

## 链接

- **文档**：[https://github.com/lbb00/ai-rules-sync](https://github.com/lbb00/ai-rules-sync)
- **问题反馈**：[https://github.com/lbb00/ai-rules-sync/issues](https://github.com/lbb00/ai-rules-sync/issues)
- **NPM**：[https://www.npmjs.com/package/ai-rules-sync](https://www.npmjs.com/package/ai-rules-sync)

---

## 许可证

[Unlicense](./LICENSE) - 自由使用、修改和分发。
