# AI Rules Sync

<p align="center">
  <img src="./assets/readme/banner.svg" width="100%" alt="AIS: sync native agent assets via symbolic links from Git repositories to Cursor, Claude, Copilot, Codex, and 20+ tools">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ai-rules-sync"><img src="https://badgen.net/npm/v/ai-rules-sync" alt="npm version"></a>
  <a href="https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/lbb00/ai-rules-sync.svg" alt="Unlicense"></a>
  <a href="https://www.npmjs.com/package/ai-rules-sync"><img src="https://img.shields.io/npm/dw/ai-rules-sync.svg" alt="npm downloads"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README_ZH.md">中文</a> ·
  <a href="https://lbb00.github.io/ai-rules-sync/"><strong>Documentation</strong></a>
</p>

**AI Rules Sync (AIS)** — Install, compose, update, and publish native agent assets from multiple Git repositories across all your projects.

> **AIS is an asset federation toolkit, not a format converter.** It keeps your files exactly as they are — skills, rules, commands, agents — and syncs them via symbolic links across every project you work on. Edit once, update everywhere.

---

## How AIS is Different

| AIS | Other tools |
|---|---|
| **Symlinks** — upstream changes are instant | Copy files — must re-run to update |
| **One source → many projects** | One project at a time |
| **Native assets** — no format conversion | Rewrite / re-generate your files |
| **Import → publish → review** workflow | One-way consumption only |
| **370 KB, 5 dependencies** | Often 10+ MB with deep dependency trees |
| **Git-native** — works with any Git remote | Tied to specific registries or APIs |

**AIS is complementary to format-conversion tools.** If you also need cross-tool format conversion, you can use AIS for asset management and another tool for generation — they solve different problems.

---

## Supported Tools

_This table is generated from `docs/supported-tools.json` via `npm run docs:sync-tools`._

<!-- SUPPORTED_TOOLS_TABLE:START -->
| Tool | rules | skills | commands | agents | AGENTS.md | tools | prompts | instructions |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Universal** | — | — | — | — | ✅ | — | — | — |
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

📋 [Full directory reference](./docs/reference/supported-tools.md) — source paths, modes, suffixes, and documentation links.

Also supports **User Mode** for personal AI config files.

---

## Installation

### Via npm (Recommended)

```bash
npm install -g ai-rules-sync
```

### Via Homebrew (macOS only)

```bash
brew tap lbb00/ai-rules-sync https://github.com/lbb00/ai-rules-sync
brew install ais
```

**Verify:**
```bash
ais --version
```

**Optional: Enable tab completion**
```bash
ais completion install
```

---

## Quick Start

### Use assets from a repository

```bash
cd your-project

# Add a rule (specify repository URL the first time)
ais cursor add react -t https://github.com/your-org/rules-repo.git

# After first use, omit -t
ais cursor add vue
ais copilot instructions add coding-standards
ais claude skills add code-review
```

### Share your existing assets

```bash
# Import a rule from your project into the repository
ais cursor rules import my-custom-rule

# Optionally push to remote
ais cursor rules import my-rule --push
```

### Restore assets (team onboarding / CI)

```bash
# Restore all assets from ai-rules-sync.json
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

---

## Core Concepts

### How It Works

```
Git Repository                    Global Cache                    Your Projects
┌─────────────────┐     clone     ┌──────────────────┐  symlink  ┌──────────┐
│ .claude/skills/ │ ───────────→  │ ~/.config/       │ ────────→ │ projectA │
│ .cursor/rules/  │               │ ai-rules-sync/   │ ────────→ │ projectB │
│ .github/inst... │               │ repos/           │ ────────→ │ projectC │
└─────────────────┘               └──────────────────┘           └──────────┘
```

1. **Clone** — AIS clones your asset repositories to a global cache (`~/.config/ai-rules-sync/repos/`)
2. **Symlink** — Each project gets symbolic links pointing into the cache
3. **Update** — When you pull changes in the repo, every project sees them instantly

### Three Configuration Layers

| File | Scope | Committed to Git |
|------|-------|-----------------|
| `ai-rules-sync.local.json` | Private, per-project | No |
| `ai-rules-sync.json` | Shared, per-project | Yes |
| `user.json` (`~/.config/ai-rules-sync/`) | Global, per-user | Optional (dotfiles) |

### Three Core Operations

| Command | What it does |
|---------|-------------|
| `ais add` | Link an asset from a repository to your project |
| `ais import` | Copy an asset from your project into the repository, then replace with symlink |
| `ais install` | Restore all symlinks from `ai-rules-sync.json` (team onboarding, CI) |

---

## Basic Usage

### Setup a Repository

```bash
# Use an existing remote repository
ais use https://github.com/your-org/rules-repo.git

# Use a local path (for development / testing)
ais use ~/my-rules-repo

# List all configured repositories
ais ls

# Switch between repositories
ais use company-rules
ais use personal-rules
```

### Add Assets to Your Project

```bash
cd your-project

# First time: specify repository
ais cursor add react -t https://github.com/org/rules.git

# Subsequent adds (uses current repository)
ais cursor add vue
ais cursor add typescript

# Add with alias (different name in project)
ais cursor add react react-18

# Add from a different repository
ais cursor add coding-standards -t company-rules

# Add as private (saved to ai-rules-sync.local.json)
ais cursor add company-secrets --local

# Add to custom target directory (monorepo)
ais cursor add my-rule -d packages/frontend/.cursor/rules
```

### Import Existing Assets

```bash
# Import a rule from your project into the repository
ais cursor rules import my-custom-rule

# Import with custom commit message
ais cursor rules import my-rule -m "Add custom rule"

# Import and push to remote
ais cursor rules import my-rule --push

# Force overwrite if exists in repository
ais cursor rules import my-rule --force
```

### Remove Assets

```bash
ais cursor rm react
ais cursor commands rm deploy
ais cursor skills rm code-review
```

### Install from Configuration

```bash
# Clone project and restore all assets
git clone https://github.com/team/project.git
cd project
ais install

# Install all entries for a specific tool
ais cursor install
ais claude install
```

### Discover and Install All

```bash
# Install everything from current repository
ais add-all

# Install all Cursor rules
ais cursor add-all

# Preview before installing
ais add-all --dry-run

# Filter by tool
ais add-all --tools cursor,copilot

# Interactive mode
ais cursor add-all --interactive
```

---

## Tool-Specific Commands

### Cursor
```bash
ais cursor add react                 # Rule
ais cursor commands add deploy       # Command
ais cursor skills add code-review    # Skill
ais cursor agents add code-analyzer  # Subagent
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
ais claude md add CLAUDE             # CLAUDE.md (project)
ais claude md add CLAUDE --user      # CLAUDE.md (personal)
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

### Other Tools
```bash
ais trae rules add project-rules
ais opencode agents add code-reviewer
ais opencode tools add project-analyzer
ais windsurf add project-style
ais windsurf skills add deploy-staging
ais cline add coding
ais cline skills add release-checklist
ais warp skills add my-skill
ais agents-md add .                  # Universal AGENTS.md
```

---

## Advanced Features

### Multiple Repositories

```bash
ais cursor add coding-standards -t company-rules
ais cursor add react-best-practices -t https://github.com/community/rules.git
ais cursor add my-utils -t personal-rules
```

### User Mode (Personal AI Config Files)

```bash
ais claude md add CLAUDE --user      # → ~/.claude/CLAUDE.md
ais gemini md add GEMINI --user      # → ~/.gemini/GEMINI.md
ais codex md add AGENTS --user       # → ~/.codex/AGENTS.md
ais cursor rules add my-style --user

# Restore on a new machine
ais user install
```

**Dotfiles integration:**
```bash
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais user install
```

### Repository Lifecycle

```bash
# Check whether repositories are behind upstream
ais check

# Preview updates without pulling
ais update --dry-run

# Pull updates and reinstall entries
ais update

# Initialize a rules repository template
ais init
```

### Git Commands

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### Custom Source Directories

For third-party repositories with non-standard structure:

```bash
# CLI parameters (temporary)
ais cursor rules add-all -s custom/rules

# Persistent configuration
ais config repo set-source third-party cursor.rules custom/rules
ais config repo show third-party
```

### Custom Target Directories

```bash
# Monorepo: different packages
ais cursor add react-rules frontend-rules -d packages/frontend/.cursor/rules
ais cursor add node-rules backend-rules -d packages/backend/.cursor/rules
```

### Tab Completion

```bash
ais completion install
ais cursor add <Tab>              # Lists available rules
ais cursor commands add <Tab>     # Lists available commands
```

---

## Configuration Reference

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

### Repository Config (ai-rules-sync.json in rules repo)

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

### Entry Formats

| Format | Example |
|--------|---------|
| Simple string | `"react": "https://github.com/user/repo.git"` |
| Object with alias | `"react-v2": { "url": "...", "rule": "react" }` |
| Custom target dir | `"docs-rule": { "url": "...", "targetDir": "docs/ai/rules" }` |

---

## Architecture

```
CLI (commander.js)
    ↓
Adapter Registry (34 adapters, 11 tools)
    ↓
dotany — generic dotfile management layer
    ├── SourceResolver (GitRepoSource)
    ├── ManifestStore (ai-rules-sync.json)
    └── DotfileManager (add, remove, apply, diff, status, import)
    ↓
Sync Engine (symlink creation, ignore management)
    ↓
Config Layer (global config, project config, user config)
```

---

## Learn More

📖 **Full documentation:** [https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)

- [Getting Started](https://lbb00.github.io/ai-rules-sync/guide/getting-started)
- [Project-Level Sync](https://lbb00.github.io/ai-rules-sync/guide/project-level)
- [User Global-Level Sync](https://lbb00.github.io/ai-rules-sync/guide/user-level)
- [Multiple Repositories](https://lbb00.github.io/ai-rules-sync/guide/multiple-repos)
- [CLI Reference](https://lbb00.github.io/ai-rules-sync/reference/cli)
- [Configuration Reference](https://lbb00.github.io/ai-rules-sync/reference/configuration)

---

## Links

- **Documentation**: [https://lbb00.github.io/ai-rules-sync/](https://lbb00.github.io/ai-rules-sync/)
- **Issues**: [https://github.com/lbb00/ai-rules-sync/issues](https://github.com/lbb00/ai-rules-sync/issues)
- **NPM**: [https://www.npmjs.com/package/ai-rules-sync](https://www.npmjs.com/package/ai-rules-sync)

---

## License

[Unlicense](./LICENSE) - Free to use, modify, and distribute.