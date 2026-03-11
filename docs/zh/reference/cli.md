---
outline: [2, 3]
---

# CLI 命令

## 命令风格

AIS 默认使用 Linux 风格命令，旧形式仍然兼容：

```bash
# 推荐
ais ls
ais rm old-rule
ais cursor rules rm react

# 旧形式（仍然支持）
ais list
ais remove old-rule
ais cursor rules remove react
```

## 全局命令

### `ais use <repo>`

设置当前（默认）规则仓库。

```bash
ais use https://github.com/org/rules.git    # 远程 URL
ais use ~/my-rules-repo                      # 本地路径
ais use company-rules                        # 按名称
```

### `ais ls`

列出所有注册的仓库。

```bash
ais ls
ais ls --json
```

### `ais install`

从 `ai-rules-sync.json` 安装所有规则。

```bash
ais install                # 项目规则
ais install --user         # 用户规则
```

### `ais init`

初始化规则仓库模板。

```bash
ais init
ais init my-rules-repo
ais init --force --no-dirs
```

### `ais update`

拉取更新并重新安装。

```bash
ais update
ais update --dry-run
```

### `ais check`

检查仓库是否落后于上游。

```bash
ais check
ais check --user
ais check --json
```

### `ais status`

显示项目状态。

```bash
ais status
ais status --json
```

### `ais search <query>`

搜索规则。

```bash
ais search react
ais search react --json
```

### `ais add-all`

发现并安装所有可用规则。

```bash
ais add-all
ais add-all --dry-run
ais add-all --tools cursor,copilot
ais add-all --interactive
ais add-all --force
ais add-all --skip-existing
```

### `ais git <command>`

在仓库中运行 git 命令。

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### `ais completion install`

安装 shell Tab 补全。

### `ais config`

管理配置。

```bash
# 仓库源目录
ais config repo set-source <repo> <key> <dir>
ais config repo show <repo>
ais config repo clear-source <repo> [key]
ais config repo list

# 用户配置路径
ais config user show
ais config user set <path>
ais config user reset
```

## 工具命令

所有工具遵循相同模式：

```bash
ais <tool> add <name> [-t repo] [-l] [-d targetDir]
ais <tool> rm <name>
ais <tool> install

# 子类型
ais <tool> <subtype> add <name>
ais <tool> <subtype> rm <name>
ais <tool> <subtype> import <name> [-m msg] [--push] [--force]
ais <tool> <subtype> add-all [-s sourceDir]
```

### 工具列表

`cursor`, `copilot`, `claude`, `trae`, `opencode`, `codex`, `gemini`, `warp`, `windsurf`, `cline`, `agents-md`

### 通用选项

| 选项 | 描述 |
|------|------|
| `-t, --target <repo>` | 指定仓库（名称、URL 或路径） |
| `-l, --local` | 保存到 `ai-rules-sync.local.json` |
| `-d, --target-dir <dir>` | 自定义目标目录 |
| `-s, --source-dir <dir>` | 自定义源目录 |
| `--dry-run` | 预览，不实际执行 |
| `--json` | JSON 格式输出 |
| `--force` | 强制覆盖已有 |
| `--user` | 使用用户模式（个人配置） |
