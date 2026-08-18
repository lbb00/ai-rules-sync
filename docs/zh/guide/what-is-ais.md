# 什么是 AIS？

**AI Rules Sync (AIS)** 是资产联邦工具。它从多个 Git 仓库安装、组合、更新和发布**原生** Agent 资产 — skills、rules、commands、agents — 同步到你的每个项目。

AIS **不是**格式转换器。文件保持原有布局，通过软链接同步。

![多个 Git 仓库克隆到全局缓存；每个项目通过软链接按需组合并映射目录](/banner-zh.svg)

## 问题

AI 编程工具使用项目级资产（`.cursor/rules`、`.claude/skills`、`AGENTS.md` …）。团队通常会：

- 在项目之间复制文件，源更新后失去同步
- 手工混合公司标准、个人偏好和社区包
- 为适配另一个工具改写文件，然后维护两份拷贝

## AIS 做什么

1. **克隆** Git 仓库到全局缓存（`~/.config/ai-rules-sync/repos/`）
2. **组合** — 每个项目挑选任意仓库组合，并映射目录（例如把 Cursor rules 当作 Claude rules）
3. **软链接** 到项目（或 User 模式下的 `$HOME`）。不复制、不改写
4. **恢复** — 同事和 CI 用 `ais install` 读取 `ai-rules-sync.json`

一个仓库可以供给多个项目。一个项目可以从多个仓库取资产。

## 两个范围

- **[项目级](./project-level)** — 当前仓库里的团队资产，记录在 [`ai-rules-sync.json`](/zh/reference/configuration)
- **[用户级](./user-level)** — `$HOME` 里的个人配置，记录在 `~/.config/ai-rules-sync/user.json`

## 原生资产，多工具

同一套 CLI 覆盖 Cursor、Copilot、Claude、Codex、Gemini 和 [30+ 其他工具](/zh/reference/supported-tools)。分工具说明见 [工具指南](/zh/guide/tool-guides)。

同步模式：

- **directory** — 链接整个目录（skills、agents）
- **file** — 链接单个文件，自动解析后缀
- **hybrid** — 文件或目录（Cursor rules）

## 下一步

- [快速开始](/zh/guide/getting-started) — 安装，以及第一次 add / import / install
- [核心概念](/zh/guide/core-concepts) — 缓存、清单、add / import / install
- [多仓库](/zh/guide/multiple-repos) — 多对多组合与目录映射
