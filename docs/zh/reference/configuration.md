# 配置

`ai-rules-sync.json` 根据放置位置的不同，承担**两种角色**：

| 位置 | 角色 | 关键字段 |
|------|------|----------|
| **规则仓库**（提供方） | 定义仓库中规则的组织方式 | `version`、`sourceDir`、`rootPath` |
| **项目**（引用方） | 记录从哪些仓库同步哪些规则 | `version`、`tool.subtype` 条目 |

## Schema 版本

所有配置文件包含 `version` 字段，用于前向兼容：

```json
{
  "version": 1
}
```

AIS 在读取时会自动迁移不含 `version` 的旧格式配置。

---

## 规则仓库配置（提供方）

> 放在**规则仓库根目录**。告诉 AIS 在此仓库中如何查找规则。

### 基本结构

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

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | `number` | 配置 schema 版本（当前为 `1`） |
| `rootPath` | `string?` | 可选路径前缀，应用于所有源目录 |
| `sourceDir` | `object` | 映射 `工具 → 子类型 → 源路径` |

### 示例

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

设置 `rootPath: "src"` 后，Cursor 规则的实际路径解析为 `src/.cursor/rules`。

### 源路径模式

源路径可以是简单字符串，也可以是带 `mode` 判别字段的对象（用于高级映射）：

#### 简单字符串

```json
"rules": ".cursor/rules"
```

#### 文件模式

将指定源文件映射为不同的目标文件名：

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

将仓库中的 `common/AGENTS.md` → 项目中的 `CLAUDE.md`。

#### 目录模式

将源目录映射为不同的目标目录名：

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

将仓库中的 `common/shared-rules/` → 项目中的 `.cursor/rules/cursor-rules/`。

---

## 项目配置（引用方）

> 放在**项目根目录**。记录对远程规则仓库的依赖关系。

### 基本结构

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

### 示例

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

所有工具（`copilot`、`trae`、`opencode`、`codex`、`gemini`、`warp`、`windsurf`、`cline`）遵循相同的 `工具 → 子类型 → 条目` 结构。

### 条目格式

#### 简单字符串 — 仅仓库 URL

```json
"react": "https://github.com/user/repo.git"
```

#### 带别名的对象 — 项目与仓库使用不同名称

```json
"react-v2": {
  "url": "https://github.com/user/repo.git",
  "rule": "react"
}
```

`react-v2` 是本地名称，`react` 是规则仓库中的名称。

#### 带自定义目标目录的对象

```json
"docs-rule": {
  "url": "https://github.com/user/repo.git",
  "targetDir": "docs/ai/rules"
}
```

覆盖符号链接在项目中的放置位置。

---

## 本地/私有规则

使用 `ai-rules-sync.local.json` 管理不想提交的规则：

```bash
ais cursor add company-secrets --local
```

- 结构与 `ai-rules-sync.json` 相同
- 自动添加到 `.gitignore`
- 与主配置合并（冲突时本地优先）

---

## 用户级配置（user.json）

> 应用于所有项目的全局规则。存储于 `~/.config/ai-rules-sync/user.json`。

同样的 `工具 → 子类型 → 条目` 结构：

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

管理用户配置路径：

```bash
ais config user show
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais config user reset
```

---

## 配置优先级

当多个配置同时存在时，按以下优先级合并（从高到低）：

1. **`ai-rules-sync.local.json`** — 私有，项目级
2. **`ai-rules-sync.json`** — 共享，项目级
3. **`user.json`** — 全局，用户级
