# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md)

**AI Rules Sync (AIS)** - Synchronize, manage, and share your AI agent rules across projects and teams.

Stop copying `.mdc` files around. Manage your rules in Git repositories and sync them via symbolic links. Supports 11 AI tools and **User Mode** for personal config files — see [Supported Tools](#supported-tools).

---

## Table of Contents

- [Why AIS?](#why-ais)
- [Installation](#installation)
- [Supported Tools](#supported-tools)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Tool-Specific Guides](#tool-specific-guides)
- [Advanced Features](#advanced-features)
  - [User Mode](#user-mode-personal-ai-config-files)
- [Configuration Reference](#configuration-reference)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## Why AIS?

- **🧩 Multi-Repository**: Mix rules from company standards, team protocols, and open-source collections
- **🔄 Sync Once, Update Everywhere**: One source of truth, automatic updates across all projects
- **🤝 Team Alignment**: Share coding standards instantly, onboard new members with one command
- **🔒 Privacy First**: Keep sensitive rules local with `ai-rules-sync.local.json`
- **🛠️ Git Integration**: Manage repositories directly through CLI (`ais git`)
- **🔌 Extensible**: Plugin architecture for adding new AI tools

---

## Installation

### Via Homebrew (macOS/Linux)

```bash
brew install lbb00/ai-rules-sync/ais
# or tap first for shorter subsequent commands:
brew tap lbb00/ai-rules-sync
brew install ais
```

### Via npm

```bash
npm install -g ai-rules-sync
```

**Verify installation:**
```bash
ais --version
```

**Optional: Enable tab completion**
```bash
ais completion install
```

---

## Supported Tools

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
| Gemini CLI | Commands | file | `.gemini/commands/` | `.toml` | [Docs](https://geminicli.com/docs/cli/custom-commands/) |
| Gemini CLI | Skills | directory | `.gemini/skills/` | - | [Docs](https://geminicli.com/docs/cli/skills/) |
| Gemini CLI | Subagents | file | `.gemini/agents/` | `.md` | [Docs](https://geminicli.com/docs/core/subagents/) |
| Warp | Rules | file | `.` (root) | `.md` | [Docs](https://docs.warp.dev/agent-platform/capabilities/rules) — same as AGENTS.md, use `ais agents-md` |
| Warp | Skills | directory | `.agents/skills/` | - | [Docs](https://docs.warp.dev/agent-platform/capabilities/skills) |
| Windsurf | Rules | file | `.windsurf/rules/` | `.md` | [Docs](https://docs.windsurf.com/windsurf/cascade/memories) |
| Windsurf | Skills | directory | `.windsurf/skills/` | - | [Docs](https://docs.windsurf.com/windsurf/cascade/skills) |
| Cline | Rules | file | `.clinerules/` | `.md`, `.txt` | [Docs](https://docs.cline.bot/customization/cline-rules) |
| Cline | Skills | directory | `.cline/skills/` | - | [Docs](https://docs.cline.bot/customization/skills) |
| **Universal** | **AGENTS.md** | file | `.` (root) | `.md` | [Standard](https://agents.md/) |

**Modes:**
- **directory**: Links entire directories (skills, agents)
- **file**: Links individual files with automatic suffix resolution
- **hybrid**: Links both files and directories (e.g., Cursor rules)

---

## Quick Start

### Scenario 1: Use Existing Rules

**You have a rules repository and want to use its rules in your project.**

```bash
# 1. Go to your project
cd your-project

# 2. Add a rule (IMPORTANT: specify repository URL the first time)
ais cursor add react -t https://github.com/your-org/rules-repo.git

# Done! The rule is now linked to your project
```

**What just happened?**
- AIS cloned the repository to `~/.config/ai-rules-sync/repos/`
- Set it as your current repository
- Created a symlink: `rules-repo/.cursor/rules/react` → `your-project/.cursor/rules/react`
- Saved the configuration to `ai-rules-sync.json`

**Next time**, you can omit the `-t` flag:
```bash
ais cursor add vue
ais cursor add testing
```

### Scenario 2: Share Your Existing Rules

**You have rules in your project and want to share them via a repository.**

```bash
# 1. Create a rules repository (or use existing one)
# Option A: Create new repository
git init ~/my-rules-repo
ais use ~/my-rules-repo

# Option B: Use existing repository
ais use https://github.com/your-org/rules-repo.git

# 2. Import your existing rule
cd your-project
ais cursor rules import my-custom-rule

# Done! Your rule is now in the repository and linked to your project
```

**What just happened?**
- AIS copied `your-project/.cursor/rules/my-custom-rule` to the repository
- Created a git commit
- Replaced the original with a symlink
- Saved the configuration to `ai-rules-sync.json`

**Optional: Push to remote**
```bash
ais cursor rules import my-rule --push
# or manually:
ais git push
```

---

## Core Concepts

### 1. Repositories

A **rules repository** is a Git repository containing your rules, organized by tool:

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
└── ai-rules-sync.json  # Optional: customize source paths
```

**Repository Locations:**
- **Global**: `~/.config/ai-rules-sync/repos/` (managed by AIS)
- **Local**: Any local path (for development)

**Managing Repositories:**
```bash
# Set current repository
ais use https://github.com/your-org/rules-repo.git

# List all repositories
ais list

# Switch between repositories
ais use company-rules
ais use personal-rules
```

### 2. Three Ways to Get Rules

#### **`add`** - Use rules from a repository
Link an entry from a repository to your project. Saves the dependency to `ai-rules-sync.json`.

**When to use:** You want to use existing rules from a shared repository.

#### **`import`** - Share your rules via a repository
Copy an existing entry from your project into the repository, commit it, then replace the original with a symlink.

**When to use:** You have rules in your project and want to share them.

#### **`install`** - Restore from config file
Read `ai-rules-sync.json` and recreate all symlinks. Use this after cloning a project that already has a config.

**When to use:** You cloned a project with `ai-rules-sync.json` and want to set up all rules.

### 3. Configuration Files

**`ai-rules-sync.json`** - Project configuration (committed to git)
```json
{
  "cursor": {
    "rules": {
      "react": "https://github.com/org/rules.git"
    }
  }
}
```

**`ai-rules-sync.local.json`** - Private rules (NOT committed to git)
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

## Basic Usage

### Setup a Repository

**Option 1: Use an existing repository**
```bash
ais use https://github.com/your-org/rules-repo.git
```

**Option 2: Create a new local repository**
```bash
# Create directory and initialize git
mkdir ~/my-rules-repo
cd ~/my-rules-repo
git init

# Set as current repository
ais use ~/my-rules-repo

# Create rules structure
mkdir -p .cursor/rules
echo "# React Rules" > .cursor/rules/react.mdc
git add .
git commit -m "Initial commit"
```

**Option 3: Clone and use**
```bash
git clone https://github.com/your-org/rules-repo.git ~/my-rules-repo
ais use ~/my-rules-repo
```

### Add Rules to Your Project

**Basic add:**
```bash
cd your-project

# First time: specify repository
ais cursor add react -t https://github.com/org/rules.git

# Subsequent adds
ais cursor add vue
ais cursor add typescript
```

**Add with alias:**
```bash
# Add 'react' rule but name it 'react-18' in your project
ais cursor add react react-18
```

**Add from different repository:**
```bash
# Add from company repository
ais cursor add coding-standards -t company-rules

# Add from personal repository
ais cursor add my-utils -t personal-rules
```

**Add as private (local) rule:**
```bash
# Won't be committed to git (saved in ai-rules-sync.local.json)
ais cursor add company-secrets --local
```

### Import Existing Rules

**Import a rule from your project to repository:**
```bash
cd your-project

# Import rule
ais cursor rules import my-custom-rule

# Import with custom commit message
ais cursor rules import my-rule -m "Add custom rule"

# Import and push to remote
ais cursor rules import my-rule --push

# Force overwrite if exists in repository
ais cursor rules import my-rule --force
```

**What happens during import:**
1. Copies rule from project to repository
2. Creates a git commit
3. Replaces original with symlink
4. Updates `ai-rules-sync.json`

### Remove Rules

```bash
# Remove a rule (deletes symlink and config entry)
ais cursor remove react

# Remove from specific tool
ais cursor commands remove deploy
ais cursor skills remove code-review
```

### Install from Configuration

**When cloning a project:**
```bash
# Clone project
git clone https://github.com/team/project.git
cd project

# Install all rules from ai-rules-sync.json
ais install
```

**Reinstall all rules:**
```bash
# Remove and recreate all symlinks
ais cursor install
ais copilot install  # All copilot entries (instructions + skills)
ais install  # All tools
```

---

## Tool-Specific Guides

### Cursor

#### Rules (Hybrid Mode)

```bash
# Add a .mdc file
ais cursor add react
ais cursor add coding-standards.mdc

# Add a .md file
ais cursor add readme.md

# Add a rule directory
ais cursor add my-rule-dir

# Remove
ais cursor remove react
```

#### Commands

```bash
# Add command
ais cursor commands add deploy-docs

# Remove command
ais cursor commands remove deploy-docs
```

#### Skills

```bash
# Add skill (directory)
ais cursor skills add code-review

# Remove skill
ais cursor skills remove code-review
```

#### Subagents

```bash
# Add subagent (directory)
ais cursor agents add code-analyzer

# Remove subagent
ais cursor agents remove code-analyzer
```

### GitHub Copilot

```bash
# Add instruction
ais copilot instructions add coding-style

# Suffix matching (if both exist, you must specify)
ais copilot instructions add style.md               # Explicit
ais copilot instructions add style.instructions.md  # Explicit

# Add prompt file
ais copilot prompts add generate-tests

# Add skill
ais copilot skills add web-scraping

# Add custom agent
ais copilot agents add code-reviewer

# Remove
ais copilot instructions remove coding-style
ais copilot prompts remove generate-tests
ais copilot skills remove web-scraping
ais copilot agents remove code-reviewer
```

### Claude Code

```bash
# Add rule
ais claude rules add general

# Add skill
ais claude skills add code-review

# Add subagent
ais claude agents add debugger

# Add CLAUDE.md (personal user config with --user)
ais claude md add CLAUDE --user           # → ~/.claude/CLAUDE.md
ais claude md add CLAUDE                  # → .claude/CLAUDE.md (project)

# Install all
ais claude install

# Remove
ais claude rules remove general
ais claude skills remove code-review
ais claude agents remove debugger
ais claude md remove CLAUDE --user
```

### Trae

```bash
# Add rule
ais trae rules add project-rules

# Add skill
ais trae skills add adapter-builder

# Remove
ais trae rules remove project-rules
ais trae skills remove adapter-builder
```

### OpenCode

```bash
# Add agent
ais opencode agents add code-reviewer

# Add skill
ais opencode skills add refactor-helper

# Add command
ais opencode commands add build-optimizer

# Add tool
ais opencode tools add project-analyzer

# Remove
ais opencode agents remove code-reviewer
```

### Codex

```bash
# Add rule (Starlark syntax for sandbox control)
ais codex rules add default

# Add skill
ais codex skills add code-assistant

# Install all
ais codex install

# Import from project
ais codex rules import my-sandbox-rules
ais codex skills import my-helper-skill

# Remove
ais codex rules remove default
```

**Note:** Codex skills use `.agents/skills/` (not `.codex/skills/`) per OpenAI documentation.

### Gemini CLI

```bash
# Add command (.toml)
ais gemini commands add deploy-docs

# Add skill (directory)
ais gemini skills add code-review

# Add subagent (.md)
ais gemini agents add code-analyzer

# Remove
ais gemini commands remove deploy-docs
ais gemini skills remove code-review
ais gemini agents remove code-analyzer
```

### AGENTS.md (Universal)

```bash
# Add from root
ais agents-md add .

# Add from directory
ais agents-md add frontend

# Add with alias (to distinguish multiple AGENTS.md files)
ais agents-md add frontend fe-agents
ais agents-md add backend be-agents

# Remove
ais agents-md remove fe-agents
```

### Warp

#### Rules

Warp Rules use the [AGENTS.md standard](https://agents.md/) — use the `agents-md` commands:

```bash
# Add AGENTS.md from repo root (applies globally in Warp)
ais agents-md add .

# Add directory-specific rules
ais agents-md add src

# Remove
ais agents-md remove .
```

#### Skills

```bash
ais warp skills add my-skill
ais warp skills remove my-skill
ais warp skills install
```

### Windsurf

```bash
# Add rule
ais windsurf add project-style

# Add skill
ais windsurf skills add deploy-staging

# Remove
ais windsurf remove project-style

# Install all
ais windsurf install
```

> Note: Windsurf Memories are managed inside Cascade UI/runtime. AIS syncs file-based artifacts (`.windsurf/rules` and `.windsurf/skills`).

### Cline

```bash
# Add rule
ais cline add coding

# Add skill
ais cline skills add release-checklist

# Remove
ais cline remove coding

# Install all
ais cline install
```

---

## Advanced Features

### Multiple Repositories

**Use the `-t` flag to specify which repository to use:**

```bash
# Add from company repository
ais cursor add coding-standards -t company-rules

# Add from open-source repository
ais cursor add react-best-practices -t https://github.com/community/rules.git

# Add from personal repository
ais cursor add my-utils -t personal-rules
```

**View current repository:**
```bash
ais list
# * company-rules (current)
#   personal-rules
#   community-rules
```

**Switch default repository:**
```bash
ais use personal-rules
```

### Global Options

All commands support:

- `-t, --target <repo>`: Specify repository (name or URL)
- `-l, --local`: Save to `ai-rules-sync.local.json` (private)

Examples:
```bash
ais cursor add react -t company-rules --local
ais copilot instructions add coding-style -t https://github.com/org/rules.git
```

### Discover and Install All (add-all)

**Automatically discover and install ALL available rules:**

```bash
# Install everything from current repository
ais add-all

# Install all Cursor rules
ais cursor add-all

# Install specific type
ais cursor rules add-all

# Preview before installing
ais add-all --dry-run

# Filter by tool
ais add-all --tools cursor,copilot

# Interactive mode (confirm each)
ais cursor add-all --interactive

# Force overwrite existing
ais add-all --force

# Skip existing
ais add-all --skip-existing

# Save as private
ais cursor add-all --local
```

**Output example:**
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

### Custom Source Directories

**For third-party repositories with non-standard structure:**

#### CLI Parameters (temporary)

```bash
# Simple format (in context)
ais cursor rules add-all -s custom/rules

# Dot notation format (explicit)
ais add-all -s cursor.rules=custom/rules -s cursor.commands=custom/cmds

# Preview first
ais cursor rules add-all -s custom/rules --dry-run
```

#### Global Configuration (persistent)

```bash
# Set custom source directory
ais config repo set-source third-party cursor.rules custom/rules

# View configuration
ais config repo show third-party

# Clear configuration
ais config repo clear-source third-party cursor.rules
ais config repo clear-source third-party  # Clear all

# List all repositories
ais config repo list
```

**Priority system:**
```
CLI Parameters > Global Config > Repository Config > Adapter Defaults
```

### Custom Target Directories

**Change where rules are linked in your project:**

```bash
# Add to custom directory
ais cursor add my-rule -d docs/ai/rules

# Monorepo: different packages
ais cursor add react-rules frontend-rules -d packages/frontend/.cursor/rules
ais cursor add node-rules backend-rules -d packages/backend/.cursor/rules
```

**IMPORTANT: Adding same rule to multiple locations requires aliases:**

```bash
# First location (no alias needed)
ais cursor add auth-rules -d packages/frontend/.cursor/rules

# Second location (alias REQUIRED)
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules
```

### User Mode (Personal AI Config Files)

**Manage personal AI config files (`~/.claude/CLAUDE.md`, `~/.cursor/rules/`, etc.) with version control:**

```bash
# Add personal CLAUDE.md to user config
ais claude md add CLAUDE --user

# Add personal Cursor rules
ais cursor rules add my-style --user

# Install all user entries on a new machine
ais user install
# or equivalently:
ais install --user
```

**Manage user config path** (for dotfiles integration):

```bash
# View current user config path
ais config user show

# Store user.json inside your dotfiles repo (for git tracking)
ais config user set ~/dotfiles/ai-rules-sync/user.json

# Reset to default (~/.config/ai-rules-sync/user.json)
ais config user reset
```

**Multi-machine workflow:**

```bash
# Machine A: initial setup
ais use git@github.com:me/my-rules.git
ais config user set ~/dotfiles/ai-rules-sync/user.json  # optional
ais claude md add CLAUDE --user
ais cursor rules add my-style --user
# user.json tracks all dependencies (commit to dotfiles to share)

# Machine B: restore everything with one command
ais use git@github.com:me/my-rules.git
ais config user set ~/dotfiles/ai-rules-sync/user.json  # if using dotfiles
ais user install
```

**user.json format** (same as `ai-rules-sync.json`):

```json
{
  "claude": {
    "md": { "CLAUDE": "https://github.com/me/my-rules.git" },
    "rules": { "general": "https://github.com/me/my-rules.git" }
  },
  "cursor": {
    "rules": { "my-style": "https://github.com/me/my-rules.git" }
  }
}
```

### Repository Configuration

**Customize source paths in repository:**

Create `ai-rules-sync.json` in your rules repository:

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

### Git Commands

**Manage repository directly from CLI:**

```bash
# Check repository status
ais git status

# Pull latest changes
ais git pull

# Push commits
ais git push

# Run any git command
ais git log --oneline
ais git branch

# Specify repository
ais git status -t company-rules
```

### Tab Completion

On first run, AIS will offer to install tab completion automatically. To install manually:

```bash
ais completion install
```

Once installed, `<Tab>` after any `add` command lists available entries from your repository:

```bash
ais cursor add <Tab>              # Lists available rules
ais cursor commands add <Tab>     # Lists available commands
ais copilot instructions add <Tab>
```

---

## Configuration Reference

### ai-rules-sync.json Structure

**Project configuration file (committed to git):**

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

All other tools (`copilot`, `trae`, `opencode`, `codex`, `gemini`, `warp`, `windsurf`, `cline`) follow the same structure — see [Supported Tools](#supported-tools) for their key names.

**Format types:**

1. **Simple string:** Just the repository URL
   ```json
   "react": "https://github.com/user/repo.git"
   ```

2. **Object with alias:** Different name in project vs repository
   ```json
   "react-v2": {
     "url": "https://github.com/user/repo.git",
     "rule": "react"
   }
   ```

3. **Object with custom target directory:**
   ```json
   "docs-rule": {
     "url": "https://github.com/user/repo.git",
     "targetDir": "docs/ai/rules"
   }
   ```

### Local/Private Rules

**Use `ai-rules-sync.local.json` for private rules:**

```bash
# Add private rule
ais cursor add company-secrets --local
```

**This file:**
- Has same structure as `ai-rules-sync.json`
- Should be in `.gitignore` (AIS adds it automatically)
- Merges with main config (local takes precedence)

### Legacy Compatibility

**Old `cursor-rules.json` format is still supported:**

- If `ai-rules-sync.json` doesn't exist but `cursor-rules.json` does, AIS will read it
- Running any write command (add/remove) will migrate to new format
- Only Cursor rules are supported in legacy format

---

## Architecture

**AIS uses a plugin-based adapter architecture:**

```
CLI Layer
    ↓
Adapter Registry & Lookup (findAdapterForAlias)
    ↓
Unified Operations (addDependency, removeDependency, link, unlink)
    ↓
Sync Engine (linkEntry, unlinkEntry)
    ↓
Config Layer (ai-rules-sync.json)
```

**Key Design Principles:**

1. **Unified Interface**: All adapters implement the same operations
2. **Auto-Routing**: Automatically finds correct adapter based on config
3. **Generic Functions**: `addDependencyGeneric()` and `removeDependencyGeneric()` work with any adapter
4. **Extensible**: Easy to add support for new AI tools

For details on adding a new adapter, see [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md).

---

## Troubleshooting

### Command not found after installation

```bash
# Verify installation
npm list -g ai-rules-sync

# Reinstall
npm install -g ai-rules-sync

# Check PATH
echo $PATH
```

### Symlink issues

```bash
# Remove all symlinks and recreate
ais cursor install

# Or manually
rm .cursor/rules/*
ais cursor install
```

### Repository not found

```bash
# List repositories
ais list

# Set repository
ais use <repo-name-or-url>
```

### Tab completion not working

```bash
# Zsh: ensure completion is initialized
# Add to ~/.zshrc before ais completion line:
autoload -Uz compinit && compinit
```

---

## Links

- **Documentation**: [https://github.com/lbb00/ai-rules-sync](https://github.com/lbb00/ai-rules-sync)
- **Issues**: [https://github.com/lbb00/ai-rules-sync/issues](https://github.com/lbb00/ai-rules-sync/issues)
- **NPM**: [https://www.npmjs.com/package/ai-rules-sync](https://www.npmjs.com/package/ai-rules-sync)

---

## License

[Unlicense](./LICENSE) - Free to use, modify, and distribute.
