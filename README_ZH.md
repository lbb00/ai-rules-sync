# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md)

**AI Rules Sync (AIS)** - 跨项目和团队同步、管理和共享你的 AI 代理规则。

不再复制粘贴 `.mdc` 文件。在 Git 仓库中管理规则，通过软链接同步。

**支持：** Cursor（规则、命令、技能、subagents）、Copilot（指令、技能）、Claude Code（技能、subagents、规则）、Trae（规则、技能）、OpenCode（代理、技能、命令、工具）、Codex（规则、技能）、Gemini CLI（命令、技能、代理）、Warp（规则 via AGENTS.md、技能）以及通用的 AGENTS.md。

---

## 目录

- [为什么选择 AIS？](#为什么选择-ais)
- [快速开始](#快速开始)
- [安装](#安装)
- [支持的工具](#支持的工具)
- [核心概念](#核心概念)
- [基础使用](#基础使用)
- [各工具使用指南](#各工具使用指南)
- [高级功能](#高级功能)
- [配置参考](#配置参考)
- [架构](#架构)

---

## 为什么选择 AIS？

- **🧩 多仓库支持**：混合使用公司标准、团队协议和开源集合的规则
- **🔄 一次同步，处处更新**：单一数据源，所有项目自动更新
- **🤝 团队对齐**：即时共享编码标准，一条命令完成新成员入职
- **🔒 隐私优先**：使用 `ai-rules-sync.local.json` 保持敏感规则本地化
- **🛠️ Git 集成**：通过 CLI 直接管理仓库（`ais git`）
- **🔌 可扩展**：插件架构，易于添加新的 AI 工具支持

---

## 快速开始

### 场景 1：使用现有规则

**你有一个规则仓库，想在项目中使用其规则。**

```bash
# 1. 安装 AIS
npm install -g ai-rules-sync

# 2. 进入你的项目
cd your-project

# 3. 添加规则（重要：第一次必须指定仓库 URL）
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
# 1. 安装 AIS
npm install -g ai-rules-sync

# 2. 创建规则仓库（或使用现有仓库）
# 选项 A：创建新仓库
git init ~/my-rules-repo
ais use ~/my-rules-repo

# 选项 B：使用现有仓库
ais use https://github.com/your-org/rules-repo.git

# 3. 导入你的现有规则
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

## 安装

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

| 工具 | 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------|------------|----------|------|
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [文档](https://cursor.com/docs/context/rules) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [文档](https://cursor.com/docs/context/commands) |
| Cursor | Skills | directory | `.cursor/skills/` | - | [文档](https://cursor.com/docs/context/skills) |
| Cursor | subagents | directory | `.cursor/agents/` | - | [文档](https://cursor.com/docs/context/subagents) |
| Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [文档](https://docs.github.com/copilot) |
| Copilot | Skills | directory | `.github/skills/` | - | [文档](https://docs.github.com/en/copilot/using-github-copilot/using-extensions-to-integrate-external-tools-with-copilot-chat) |
| Claude Code | Skills | directory | `.claude/skills/` | - | [文档](https://code.claude.com/docs/en/skills) |
| Claude Code | Subagents | directory | `.claude/agents/` | - | [文档](https://code.claude.com/docs/en/sub-agents) |
| Claude Code | Rules | file | `.claude/rules/` | `.md` | [文档](https://code.claude.com/docs/en/memory) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [网站](https://trae.ai/) |
| Trae | Skills | directory | `.trae/skills/` | - | [网站](https://trae.ai/) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [网站](https://opencode.ing/) |
| OpenCode | Skills | directory | `.opencode/skills/` | - | [网站](https://opencode.ing/) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [网站](https://opencode.ing/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [网站](https://opencode.ing/) |
| Codex | Rules | file | `.codex/rules/` | `.rules` | [文档](https://developers.openai.com/codex/rules) |
| Codex | Skills | directory | `.agents/skills/` | - | [文档](https://developers.openai.com/codex/skills) |
| Gemini CLI | Commands | file | `.gemini/commands/` | `.toml` | [网站](https://geminicli.com/) |
| Gemini CLI | Skills | directory | `.gemini/skills/` | - | [网站](https://geminicli.com/) |
| Gemini CLI | Agents | file | `.gemini/agents/` | `.md` | [网站](https://geminicli.com/) |
| Warp | Rules | file | `.`（根目录） | `.md` | [文档](https://docs.warp.dev/agent-platform/capabilities/rules) — 与 AGENTS.md 相同，使用 `ais agents-md` |
| Warp | Skills | directory | `.agents/skills/` | - | [文档](https://docs.warp.dev/agent-platform/capabilities/skills) |
| **通用** | **AGENTS.md** | file | `.`（根目录） | `.md` | [标准](https://agents.md/) |

**模式说明：**
- **directory**：链接整个目录（技能、代理）
- **file**：链接单个文件，自动处理后缀解析
- **hybrid**：同时支持文件和目录（例如 Cursor 规则）

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

# 列出所有仓库
ais list

# 在仓库之间切换
ais use company-rules
ais use personal-rules
```

### 2. 获取规则的三种方式

#### **`add`** - 从仓库使用规则

```bash
# 第一次：指定仓库
ais cursor add react -t https://github.com/org/rules.git

# 之后：使用当前仓库
ais cursor add vue
```

**何时使用：**你想使用仓库中的现有规则。

#### **`import`** - 通过仓库分享你的规则

```bash
# 从项目导入现有规则
ais cursor rules import my-custom-rule

# 带选项
ais cursor rules import my-rule --message "添加我的规则" --push
```

**何时使用：**你在项目中有规则并想分享它们。

#### **`install`** - 从配置文件安装

```bash
# 从 ai-rules-sync.json 安装所有规则
ais install

# 安装特定工具
ais cursor install
```

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
ais copilot install  # 所有 copilot 条目（指令 + 技能）
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

### Copilot

```bash
# 添加指令
ais copilot instructions add coding-style

# 后缀匹配（如果两者都存在，必须明确指定）
ais copilot instructions add style.md               # 明确指定
ais copilot instructions add style.instructions.md  # 明确指定

# 添加技能
ais copilot skills add web-scraping

# 移除
ais copilot instructions remove coding-style
ais copilot skills remove web-scraping
```

### Claude Code

```bash
# 添加技能
ais claude skills add code-review

# 添加 subagent
ais claude agents add debugger

# 移除
ais claude skills remove code-review
ais claude agents remove debugger
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

# 安装所有
ais codex install

# 从项目导入
ais codex rules import my-sandbox-rules
ais codex skills import my-helper-skill

# 移除
ais codex rules remove default
```

**注意：** Codex 技能使用 `.agents/skills/` 目录（而非 `.codex/skills/`），这是按照 OpenAI 文档的规定。

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
ais list
# * company-rules (current)
#   personal-rules
#   community-rules
```

**切换默认仓库：**
```bash
ais use personal-rules
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
      "agents": ".claude/agents"
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

**自动安装（推荐）：**

首次运行时，AIS 会提供安装 Tab 补全。

**手动安装：**

```bash
ais completion install
```

**或手动添加到 shell 配置：**

**Bash/Zsh**（`~/.bashrc` 或 `~/.zshrc`）：
```bash
eval "$(ais completion)"
```

**Fish**（`~/.config/fish/config.fish`）：
```fish
ais completion fish | source
```

**使用：**
```bash
ais cursor add <Tab>                     # 列出可用规则
ais cursor commands add <Tab>            # 列出可用命令
ais copilot instructions add <Tab>       # 列出可用指令
ais copilot skills add <Tab>             # 列出可用技能
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
    "commands": {
      "deploy-docs": "https://github.com/user/repo.git"
    },
    "skills": {
      "code-review": "https://github.com/user/repo.git"
    },
    "agents": {
      "code-analyzer": "https://github.com/user/repo.git"
    }
  },
  "copilot": {
    "instructions": {
      "general": "https://github.com/user/repo.git"
    }
  },
  "claude": {
    "skills": {
      "code-review": "https://github.com/user/repo.git"
    },
    "agents": {
      "debugger": "https://github.com/user/repo.git"
    }
  },
  "trae": {
    "rules": {
      "project-rules": "https://github.com/user/repo.git"
    },
    "skills": {
      "adapter-builder": "https://github.com/user/repo.git"
    }
  },
  "opencode": {
    "agents": {
      "code-reviewer": "https://github.com/user/repo.git"
    },
    "skills": {
      "refactor-helper": "https://github.com/user/repo.git"
    },
    "commands": {
      "build-optimizer": "https://github.com/user/repo.git"
    },
    "tools": {
      "project-analyzer": "https://github.com/user/repo.git"
    }
  }
}
```

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

### 全局配置

**位置：**`~/.config/ai-rules-sync/config.json`

```json
{
  "currentRepo": "company-rules",
  "repos": {
    "company-rules": {
      "name": "company-rules",
      "url": "https://github.com/company/rules",
      "path": "/Users/user/.config/ai-rules-sync/repos/company-rules",
      "sourceDir": {
        "cursor": {
          "rules": "rules/cursor",
          "commands": "commands/cursor"
        }
      }
    },
    "personal-rules": {
      "name": "personal-rules",
      "url": "https://github.com/me/rules",
      "path": "/Users/user/.config/ai-rules-sync/repos/personal-rules"
    }
  }
}
```

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

### 添加新的 AI 工具适配器

**1. 创建适配器文件**（`src/adapters/my-tool.ts`）：

```typescript
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

// 目录模式（技能、代理）
export const myToolSkillsAdapter = createBaseAdapter({
  name: 'my-tool-skills',
  tool: 'my-tool',
  subtype: 'skills',
  configPath: ['myTool', 'skills'],
  defaultSourceDir: '.my-tool/skills',
  targetDir: '.my-tool/skills',
  mode: 'directory',
});

// 文件模式（单一后缀）
export const myToolRulesAdapter = createBaseAdapter({
  name: 'my-tool-rules',
  tool: 'my-tool',
  subtype: 'rules',
  configPath: ['myTool', 'rules'],
  defaultSourceDir: '.my-tool/rules',
  targetDir: '.my-tool/rules',
  mode: 'file',
  fileSuffixes: ['.md'],
  resolveSource: createSingleSuffixResolver('.md', 'Rule'),
  resolveTargetName: createSuffixAwareTargetResolver(['.md']),
});
```

**2. 注册适配器**（`src/adapters/index.ts`）：

```typescript
import { myToolSkillsAdapter, myToolRulesAdapter } from './my-tool.js';

// 在 DefaultAdapterRegistry 构造函数中：
this.register(myToolSkillsAdapter);
this.register(myToolRulesAdapter);
```

**3. 更新 ProjectConfig**（`src/project-config.ts`）：

```typescript
export interface ProjectConfig {
  // ... 现有字段 ...
  myTool?: {
    skills?: Record<string, RuleEntry>;
    rules?: Record<string, RuleEntry>;
  };
}
```

**完成！**你的适配器现在通过统一接口支持所有操作。

---

## 常见工作流

### 团队入职

```bash
# 新团队成员克隆项目
git clone https://github.com/team/project.git
cd project

# 安装 AIS
npm install -g ai-rules-sync

# 安装所有规则
ais install

# 完成！所有规则现已链接
```

### 更新共享规则

```bash
# 拉取最新规则
ais git pull

# 规则自动更新（软链接指向仓库）
```

### 创建公司规则仓库

```bash
# 1. 创建仓库
mkdir company-rules
cd company-rules
git init

# 2. 创建结构
mkdir -p .cursor/rules .cursor/commands .claude/skills

# 3. 添加规则
echo "# 公司编码标准" > .cursor/rules/coding-standards.mdc
echo "# React 最佳实践" > .cursor/rules/react.mdc

# 4. 提交
git add .
git commit -m "Initial company rules"

# 5. 推送到远程
git remote add origin https://github.com/company/rules.git
git push -u origin main

# 6. 团队成员现在可以使用
ais cursor add coding-standards -t https://github.com/company/rules.git
```

### 迁移现有规则

```bash
# 1. 设置仓库
ais use https://github.com/team/rules.git

# 2. 导入所有现有规则
cd your-project
ais cursor rules import rule1
ais cursor rules import rule2
ais cursor commands import deploy
ais claude skills import code-review

# 3. 推送到远程
ais git push

# 4. 团队现在可以安装
# 在 ai-rules-sync.json 中共享配置
# 团队成员运行：ais install
```

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
ais list

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
