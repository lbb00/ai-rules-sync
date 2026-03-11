# 配置

## ai-rules-sync.json

项目配置文件（提交到 git）：

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

其他工具（`copilot`、`trae`、`opencode`、`codex`、`gemini`、`warp`、`windsurf`、`cline`）结构相同。

## 格式类型

### 简单字符串

仅仓库 URL：

```json
"react": "https://github.com/user/repo.git"
```

### 带别名的对象

项目中的名称与仓库中不同：

```json
"react-v2": {
  "url": "https://github.com/user/repo.git",
  "rule": "react"
}
```

### 带自定义目标目录的对象

```json
"docs-rule": {
  "url": "https://github.com/user/repo.git",
  "targetDir": "docs/ai/rules"
}
```

## 本地/私有规则

使用 `ai-rules-sync.local.json` 管理私有规则：

```bash
ais cursor add company-secrets --local
```

此文件：
- 结构与 `ai-rules-sync.json` 相同
- 应在 `.gitignore` 中（AIS 自动添加）
- 与主配置合并（本地优先）

## 仓库配置

在规则仓库中使用 `ai-rules-sync.json` 自定义源路径：

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

### 共享 AGENTS.md 与 CLAUDE.md

使用同一文件：

```json
"claude": {
  "md": { "dir": "common", "sourceFile": "AGENTS.md", "targetFile": "CLAUDE.md" }
}
```

### 目录模式

使用 `sourceDir` 和 `targetName` 将一个目录同步到多个工具。例如，将 `common/shared-rules` 同步为 `.cursor/rules/cursor-rules`：

```json
"cursor": {
  "rules": { "dir": "common", "sourceDir": "shared-rules", "targetName": "cursor-rules" }
}
```

## user.json

用户级配置（与 `ai-rules-sync.json` 结构相同）：

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

管理用户配置路径：

```bash
ais config user show
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais config user reset
```
