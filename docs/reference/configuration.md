# Configuration

## ai-rules-sync.json

Project configuration file (committed to git):

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

All tools (`copilot`, `trae`, `opencode`, `codex`, `gemini`, `warp`, `windsurf`, `cline`) follow the same structure.

## Format Types

### Simple string

Just the repository URL:

```json
"react": "https://github.com/user/repo.git"
```

### Object with alias

Different name in project vs repository:

```json
"react-v2": {
  "url": "https://github.com/user/repo.git",
  "rule": "react"
}
```

### Object with custom target directory

```json
"docs-rule": {
  "url": "https://github.com/user/repo.git",
  "targetDir": "docs/ai/rules"
}
```

## Local/Private Rules

Use `ai-rules-sync.local.json` for private rules:

```bash
ais cursor add company-secrets --local
```

This file:
- Has the same structure as `ai-rules-sync.json`
- Should be in `.gitignore` (AIS adds it automatically)
- Merges with main config (local takes precedence)

## Repository Configuration

Customize source paths in your rules repository with `ai-rules-sync.json`:

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
      "rules": ".claude/rules",
      "md": ".claude"
    }
  }
}
```

### Shared AGENTS.md and CLAUDE.md

Use one file for both:

```json
"claude": {
  "md": { "dir": "common", "sourceFile": "AGENTS.md", "targetFile": "CLAUDE.md" }
}
```

## user.json

User-level configuration (same structure as `ai-rules-sync.json`):

```json
{
  "claude": {
    "md": { "CLAUDE": "https://github.com/me/my-rules.git" }
  },
  "gemini": {
    "md": { "GEMINI": "https://github.com/me/my-rules.git" }
  }
}
```

Manage the user config path:

```bash
ais config user show
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais config user reset
```
