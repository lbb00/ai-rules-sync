# AI Rules Sync

[![Npm](https://badgen.net/npm/v/ai-rules-sync)](https://www.npmjs.com/package/ai-rules-sync)
[![License](https://img.shields.io/github/license/lbb00/ai-rules-sync.svg)](https://github.com/lbb00/ai-rules-sync/blob/master/LICENSE)
[![Npm download](https://img.shields.io/npm/dw/ai-rules-sync.svg)](https://www.npmjs.com/package/ai-rules-sync)

[English](./README.md) | [中文](./README_ZH.md)

**AI Rules Sync (AIS)** - Synchronize, manage, and share your AI agent rules across projects and teams.

Stop copying `.mdc` files around. Manage your rules in Git repositories and sync them via symbolic links.

**Supports:** Cursor (rules, commands, skills, agents), Copilot (instructions), Claude (skills, agents), Trae (rules, skills), OpenCode (agents, skills, commands, tools), and universal AGENTS.md.

---

## Table of Contents

- [Why AIS?](#why-ais)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Supported Tools](#supported-tools)
- [Core Concepts](#core-concepts)
- [Basic Usage](#basic-usage)
- [Tool-Specific Guides](#tool-specific-guides)
- [Advanced Features](#advanced-features)
- [Configuration Reference](#configuration-reference)
- [Architecture](#architecture)

---

## Why AIS?

- **🧩 Multi-Repository**: Mix rules from company standards, team protocols, and open-source collections
- **🔄 Sync Once, Update Everywhere**: One source of truth, automatic updates across all projects
- **🤝 Team Alignment**: Share coding standards instantly, onboard new members with one command
- **🔒 Privacy First**: Keep sensitive rules local with `ai-rules-sync.local.json`
- **🛠️ Git Integration**: Manage repositories directly through CLI (`ais git`)
- **🔌 Extensible**: Plugin architecture for adding new AI tools

---

## Quick Start

### Scenario 1: Use Existing Rules

**You have a rules repository and want to use its rules in your project.**

```bash
# 1. Install AIS
npm install -g ai-rules-sync

# 2. Go to your project
cd your-project

# 3. Add a rule (IMPORTANT: specify repository URL the first time)
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
# 1. Install AIS
npm install -g ai-rules-sync

# 2. Create a rules repository (or use existing one)
# Option A: Create new repository
git init ~/my-rules-repo
ais use ~/my-rules-repo

# Option B: Use existing repository
ais use https://github.com/your-org/rules-repo.git

# 3. Import your existing rule
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

## Installation

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
| Cursor | Rules | hybrid | `.cursor/rules/` | `.mdc`, `.md` | [Docs](https://docs.cursor.com/context/rules-for-ai) |
| Cursor | Commands | file | `.cursor/commands/` | `.md` | [Docs](https://docs.cursor.com/context/rules-for-ai#commands) |
| Cursor | Skills | directory | `.cursor/skills/` | - | [Docs](https://docs.cursor.com/context/rules-for-ai#skills) |
| Cursor | Agents | directory | `.cursor/agents/` | - | [Docs](https://docs.cursor.com/context/rules-for-ai#agents) |
| Copilot | Instructions | file | `.github/instructions/` | `.instructions.md`, `.md` | [Docs](https://docs.github.com/copilot) |
| Claude | Skills | directory | `.claude/skills/` | - | [Docs](https://docs.anthropic.com/en/docs/agents/claude-code) |
| Claude | Agents | directory | `.claude/agents/` | - | [Docs](https://docs.anthropic.com/en/docs/agents/claude-code) |
| Trae | Rules | file | `.trae/rules/` | `.md` | [Website](https://trae.ai/) |
| Trae | Skills | directory | `.trae/skills/` | - | [Website](https://trae.ai/) |
| OpenCode | Agents | file | `.opencode/agents/` | `.md` | [Website](https://opencode.ing/) |
| OpenCode | Skills | directory | `.opencode/skills/` | - | [Website](https://opencode.ing/) |
| OpenCode | Commands | file | `.opencode/commands/` | `.md` | [Website](https://opencode.ing/) |
| OpenCode | Tools | file | `.opencode/tools/` | `.ts`, `.js` | [Website](https://opencode.ing/) |
| **Universal** | **AGENTS.md** | file | `.` (root) | `.md` | [Standard](https://agents.md/) |

**Modes:**
- **directory**: Links entire directories (skills, agents)
- **file**: Links individual files with automatic suffix resolution
- **hybrid**: Links both files and directories (e.g., Cursor rules)

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

```bash
# First time: specify repository
ais cursor add react -t https://github.com/org/rules.git

# After that: use current repository
ais cursor add vue
```

**When to use:** You want to use existing rules from a repository.

#### **`import`** - Share your rules via a repository

```bash
# Import existing rule from your project
ais cursor rules import my-custom-rule

# With options
ais cursor rules import my-rule --message "Add my rule" --push
```

**When to use:** You have rules in your project and want to share them.

#### **`install`** - Install from config file

```bash
# Install all rules from ai-rules-sync.json
ais install

# Install specific tool
ais cursor install
```

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
ais copilot install
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

#### Agents

```bash
# Add agent (directory)
ais cursor agents add code-analyzer

# Remove agent
ais cursor agents remove code-analyzer
```

### Copilot

```bash
# Add instruction
ais copilot add coding-style

# Suffix matching (if both exist, you must specify)
ais copilot add style.md               # Explicit
ais copilot add style.instructions.md  # Explicit

# Remove
ais copilot remove coding-style
```

### Claude

```bash
# Add skill
ais claude skills add code-review

# Add agent
ais claude agents add debugger

# Remove
ais claude skills remove code-review
ais claude agents remove debugger
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
ais copilot add coding-style -t https://github.com/org/rules.git
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

**Automatic installation (recommended):**

On first run, AIS will offer to install tab completion.

**Manual installation:**

```bash
ais completion install
```

**Or add to shell config manually:**

**Bash/Zsh** (`~/.bashrc` or `~/.zshrc`):
```bash
eval "$(ais completion)"
```

**Fish** (`~/.config/fish/config.fish`):
```fish
ais completion fish | source
```

**Usage:**
```bash
ais cursor add <Tab>            # Lists available rules
ais cursor commands add <Tab>   # Lists available commands
ais copilot add <Tab>           # Lists available instructions
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

### Global Configuration

**Location:** `~/.config/ai-rules-sync/config.json`

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

### Adding a New AI Tool Adapter

**1. Create adapter file** (`src/adapters/my-tool.ts`):

```typescript
import { createBaseAdapter, createSingleSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

// Directory mode (skills, agents)
export const myToolSkillsAdapter = createBaseAdapter({
  name: 'my-tool-skills',
  tool: 'my-tool',
  subtype: 'skills',
  configPath: ['myTool', 'skills'],
  defaultSourceDir: '.my-tool/skills',
  targetDir: '.my-tool/skills',
  mode: 'directory',
});

// File mode (single suffix)
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

**2. Register adapter** (`src/adapters/index.ts`):

```typescript
import { myToolSkillsAdapter, myToolRulesAdapter } from './my-tool.js';

// In DefaultAdapterRegistry constructor:
this.register(myToolSkillsAdapter);
this.register(myToolRulesAdapter);
```

**3. Update ProjectConfig** (`src/project-config.ts`):

```typescript
export interface ProjectConfig {
  // ... existing fields ...
  myTool?: {
    skills?: Record<string, RuleEntry>;
    rules?: Record<string, RuleEntry>;
  };
}
```

**Done!** Your adapter now supports all operations through the unified interface.

---

## Common Workflows

### Team Onboarding

```bash
# New team member clones project
git clone https://github.com/team/project.git
cd project

# Install AIS
npm install -g ai-rules-sync

# Install all rules
ais install

# Done! All rules are now linked
```

### Updating Shared Rules

```bash
# Pull latest rules
ais git pull

# Rules are automatically updated (symlinks point to repository)
```

### Creating a Company Rules Repository

```bash
# 1. Create repository
mkdir company-rules
cd company-rules
git init

# 2. Create structure
mkdir -p .cursor/rules .cursor/commands .claude/skills

# 3. Add rules
echo "# Company Coding Standards" > .cursor/rules/coding-standards.mdc
echo "# React Best Practices" > .cursor/rules/react.mdc

# 4. Commit
git add .
git commit -m "Initial company rules"

# 5. Push to remote
git remote add origin https://github.com/company/rules.git
git push -u origin main

# 6. Team members can now use
ais cursor add coding-standards -t https://github.com/company/rules.git
```

### Migrating Existing Rules

```bash
# 1. Set up repository
ais use https://github.com/team/rules.git

# 2. Import all existing rules
cd your-project
ais cursor rules import rule1
ais cursor rules import rule2
ais cursor commands import deploy
ais claude skills import code-review

# 3. Push to remote
ais git push

# 4. Team can now install
# In ai-rules-sync.json, share the config
# Team members run: ais install
```

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
