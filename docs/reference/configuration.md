# Configuration

`ai-rules-sync.json` serves **two different roles** depending on where it is placed:

| Location | Role | Key Fields |
|----------|------|------------|
| **Rules Repository** (provider) | Defines how rules are organized in the repo | `version`, `sourceDir`, `rootPath` |
| **Project** (consumer) | Records which rules to sync from which repos | `version`, `tool.subtype` entries |

## Schema Version

All config files include a `version` field for forward compatibility:

```json
{
  "version": 1
}
```

AIS automatically migrates legacy configs (without `version`) on read.

---

## Rules Repository Config (Provider)

> Placed in the **rules repository root**. Tells AIS where to find rules within this repo.

### Basic Structure

```json
{
  "version": 1,
  "rootPath": "src",
  "sourceDir": {
    "<tool>": {
      "<subtype>": "<path>"
    }
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | `number` | Config schema version (currently `1`) |
| `rootPath` | `string?` | Optional path prefix applied to all source directories |
| `sourceDir` | `object` | Maps `tool → subtype → source path` |

### Example

```json
{
  "version": 1,
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

With `rootPath: "src"`, the actual path for Cursor rules resolves to `src/.cursor/rules`.

### Wildcard (`*`) Fallback

Use `*` as a tool key to define shared config that applies to all tools when tool-specific config is missing. Useful for subtypes like `skills` that are identical across Cursor, Copilot, Claude, etc.

```json
{
  "version": 1,
  "rootPath": "src",
  "sourceDir": {
    "*": {
      "skills": "common/skills"
    },
    "cursor": {
      "rules": ".cursor/rules"
    }
  }
}
```

- `cursor.skills`, `copilot.skills`, `claude.skills`, etc. all resolve to `common/skills` when not explicitly defined
- Tool-specific config (e.g. `cursor.rules`) takes precedence over `*`

### Source Path Modes

Source paths can be a simple string or an object with a `mode` discriminant for advanced mapping:

#### Simple String

```json
"rules": ".cursor/rules"
```

#### File Mode

Map a specific source file to a different target filename:

```json
"claude": {
  "md": {
    "mode": "file",
    "dir": "common",
    "sourceFile": "AGENTS.md",
    "targetFile": "CLAUDE.md"
  }
}
```

This maps `common/AGENTS.md` in the repo → `CLAUDE.md` in the project.

#### Directory Mode

Map a source directory to a different target directory name:

```json
"cursor": {
  "rules": {
    "mode": "directory",
    "dir": "common",
    "sourceDir": "shared-rules",
    "targetName": "cursor-rules"
  }
}
```

This maps `common/shared-rules/` in the repo → `.cursor/rules/cursor-rules/` in the project.

---

## Project Config (Consumer)

> Placed in the **project root**. Records dependencies on rules from remote repositories.

### Basic Structure

```json
{
  "version": 1,
  "<tool>": {
    "<subtype>": {
      "<entry-name>": "<repo-url>" | { "url": "...", ... }
    }
  }
}
```

### Wildcard (`*`) Fallback

Use `*` as a tool key to define shared dependencies that apply to all tools when tool-specific config is missing:

```json
{
  "version": 1,
  "*": {
    "skills": {
      "shared-skill": "https://example.com/skills.git"
    }
  },
  "cursor": {
    "rules": {
      "my-rule": "https://example.com/rules.git"
    }
  }
}
```

- `cursor skills`, `copilot skills`, etc. all see `shared-skill` when their own `skills` section is empty
- Tool-specific entries take precedence; add/remove uses the adapter's config path, with fallback to `*` for remove

### Example

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
  },
  "agentsMd": {
    "file": { "AGENTS": "https://github.com/user/repo.git" }
  }
}
```

All tools (`copilot`, `trae`, `opencode`, `codex`, `gemini`, `warp`, `windsurf`, `cline`) follow the same `tool → subtype → entries` structure.

### Entry Formats

#### Simple string — just the repo URL

```json
"react": "https://github.com/user/repo.git"
```

#### Object with alias — different name in project vs repo

```json
"react-v2": {
  "url": "https://github.com/user/repo.git",
  "rule": "react"
}
```

`react-v2` is the local name; `react` is the name in the rules repo.

#### Object with custom target directory

```json
"docs-rule": {
  "url": "https://github.com/user/repo.git",
  "targetDir": "docs/ai/rules"
}
```

Override where the symlink is placed in the project.

---

## Local/Private Rules

Use `ai-rules-sync.local.json` for rules you don't want to commit:

```bash
ais cursor add company-secrets --local
```

- Same structure as `ai-rules-sync.json`
- Automatically added to `.gitignore`
- Merges with main config (local takes precedence on conflict)

---

## User-Level Config (user.json)

> Global rules applied to all projects. Stored at `~/.config/ai-rules-sync/user.json`.

Same `tool → subtype → entries` structure:

```json
{
  "version": 1,
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

---

## Config Priority

When multiple configs exist, they merge with this priority (highest first):

1. **`ai-rules-sync.local.json`** — private, per-project
2. **`ai-rules-sync.json`** — shared, per-project
3. **`user.json`** — global, per-user
