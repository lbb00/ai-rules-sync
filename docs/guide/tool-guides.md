# Tool-Specific Guides

## Cursor

### Rules (Hybrid Mode)

```bash
ais cursor add react
ais cursor add coding-standards.mdc
ais cursor add my-rule-dir    # directory
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

# Remove
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
ais claude md add CLAUDE                  # project
ais claude md add CLAUDE --user           # ~/.claude/CLAUDE.md

# Install all
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
Codex skills use `.agents/skills/` (not `.codex/skills/`) per OpenAI documentation.
:::

## Gemini CLI

```bash
ais gemini commands add deploy-docs
ais gemini skills add code-review
ais gemini agents add code-analyzer
ais gemini md add GEMINI
ais gemini md add GEMINI --user    # ~/.gemini/GEMINI.md
```

## AGENTS.md (Universal)

AGENTS.md is a [standard file](https://agents.md/) at project root. Use `ais agents-md` to sync it:

```bash
ais agents-md add .                    # Add AGENTS.md from repo root
ais agents-md add frontend             # Add frontend/AGENTS.md as frontend
ais agents-md add frontend fe-agents   # Same, with alias fe-agents
ais agents-md rm fe-agents
```

::: info
Warp Rules use the same AGENTS.md format. Use `ais agents-md` for Warp projects.
:::

## Warp

### Rules

Warp Rules use the [AGENTS.md standard](https://agents.md/):

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
