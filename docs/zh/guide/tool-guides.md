# 各工具使用指南

## Cursor

### Rules（混合模式）

```bash
ais cursor add react
ais cursor add coding-standards.mdc
ais cursor add my-rule-dir    # 目录
ais cursor rm react
```

### Commands

```bash
ais cursor commands add deploy-docs
ais cursor commands rm deploy-docs
```

### Skills

```bash
ais cursor skills add code-review
ais cursor skills rm code-review
```

### Subagents

```bash
ais cursor agents add code-analyzer
ais cursor agents rm code-analyzer
```

## GitHub Copilot

```bash
# Instructions
ais copilot instructions add coding-style

# Prompts
ais copilot prompts add generate-tests

# Skills
ais copilot skills add web-scraping

# Agents
ais copilot agents add code-reviewer

# 移除
ais copilot instructions rm coding-style
```

## Claude Code

```bash
# Rules
ais claude rules add general

# Skills
ais claude skills add code-review

# Subagents
ais claude agents add debugger

# CLAUDE.md
ais claude md add CLAUDE                  # 项目级
ais claude md add CLAUDE --user           # ~/.claude/CLAUDE.md

# 安装全部
ais claude install
```

## Trae

```bash
ais trae rules add project-rules
ais trae skills add adapter-builder
ais trae rules rm project-rules
```

## OpenCode

```bash
ais opencode agents add code-reviewer
ais opencode skills add refactor-helper
ais opencode commands add build-optimizer
ais opencode tools add project-analyzer
```

## Codex

```bash
ais codex rules add default
ais codex skills add code-assistant
ais codex md add AGENTS
ais codex md add AGENTS --user    # ~/.codex/AGENTS.md
```

::: info
Codex skills 使用 `.agents/skills/`（非 `.codex/skills/`），遵循 OpenAI 文档。
:::

## Gemini CLI

```bash
ais gemini commands add deploy-docs
ais gemini skills add code-review
ais gemini agents add code-analyzer
ais gemini md add GEMINI
ais gemini md add GEMINI --user    # ~/.gemini/GEMINI.md
```

## AGENTS.md（通用）

AGENTS.md 是项目根目录的[标准文件](https://agents.md/)。使用 `ais agents-md` 同步：

```bash
ais agents-md add .                    # 从仓库根目录添加 AGENTS.md
ais agents-md add frontend             # 添加 frontend/AGENTS.md，本地名为 frontend
ais agents-md add frontend fe-agents   # 同上，别名为 fe-agents
ais agents-md rm fe-agents
```

::: info
Warp Rules 使用相同 AGENTS.md 格式，Warp 项目请使用 `ais agents-md`。
:::

## Warp

### Rules

Warp Rules 使用 [AGENTS.md 标准](https://agents.md/)：

```bash
ais agents-md add .
ais agents-md add src
```

### Skills

```bash
ais warp skills add my-skill
ais warp skills rm my-skill
```

## Windsurf

```bash
ais windsurf add project-style
ais windsurf skills add deploy-staging
ais windsurf rm project-style
```

## Cline

```bash
ais cline add coding
ais cline skills add release-checklist
ais cline rm coding
```
