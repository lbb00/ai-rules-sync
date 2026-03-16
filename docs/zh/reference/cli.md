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

### `ais add` / `ais rm`

顶层快捷命令，在配置明确时自动识别工具（Cursor、Copilot、Windsurf 或 Cline）。使用多工具时建议使用显式工具命令。

```bash
ais add react                    # 添加规则（cursor/copilot 明确时）
ais add react my-alias -d dir    # 带别名和自定义目标目录
ais rm react                     # 移除条目
ais rm react --dry-run           # 预览移除
```

::: tip
Claude、Trae、OpenCode、Codex、Gemini、Warp 或 AGENTS.md 请使用显式工具命令（如 `ais claude skills add`）。
:::

### `ais install`

从配置文件安装所有规则。

```bash
ais install                # 项目规则（来自 ai-rules-sync.json）
ais install --user         # 用户规则（来自 ~/.config/ai-rules-sync/user.json）
```

::: tip
也可使用 `ais user install` 安装用户级配置，两者等效。
:::

### `ais init`

初始化规则仓库模板。

```bash
ais init
ais init my-rules-repo
ais init --force                 # 覆盖已有 ai-rules-sync.json
ais init --no-dirs               # 不创建默认源目录
ais init --only cursor copilot   # 仅包含指定工具
ais init --exclude codex          # 排除指定工具
ais init --json                  # JSON 格式输出
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

显示项目状态（仓库、符号链接、配置文件）。

```bash
ais status
ais status --user                 # 包含用户配置状态
ais status --json
```

### `ais search <query>`

搜索规则。

```bash
ais search react
ais search react --json
```

### `ais add-all`

从当前仓库发现并安装所有可用规则。

```bash
ais add-all
ais add-all --dry-run             # 仅预览不安装
ais add-all --tools cursor,copilot # 按工具筛选
ais add-all --interactive         # 逐条确认
ais add-all --force               # 覆盖已有
ais add-all --skip-existing       # 跳过已在配置中的条目
ais add-all -l                    # 保存到 ai-rules-sync.local.json
ais add-all --quiet               # 最小化输出
```

## 工具命令

按工具区分的命令：`ais <tool> [subtype] <action>`。详见[工具指南](/zh/guide/tool-guides)。

**常用模式：**

```bash
ais cursor add react              # 添加 Cursor 规则
ais cursor rules add react        # 同上，显式子类型
ais claude skills add code-review # 添加 Claude skill
ais copilot instructions add coding-style
ais cursor rules rm react         # 移除
ais cursor install                # 安装该工具全部条目
ais cursor rules import my-rule   # 从项目导入到仓库
```

**工具与子类型：**

| 工具 | 子类型 | 示例 |
|------|--------|------|
| `cursor` | rules, commands, skills, agents | `ais cursor rules add react` |
| `copilot` | instructions, prompts, skills, agents | `ais copilot instructions add x` |
| `claude` | rules, skills, agents, md | `ais claude md add CLAUDE --user` |
| `trae` | rules, skills | `ais trae rules add x` |
| `opencode` | commands, skills, agents, tools | `ais opencode skills add x` |
| `codex` | rules, skills, md | `ais codex md add AGENTS` |
| `gemini` | commands, skills, agents, md | `ais gemini md add GEMINI` |
| `warp` | skills | `ais warp skills add x` |
| `windsurf` | rules, skills | `ais windsurf rules add x` |
| `cline` | rules, skills | `ais cline rules add x` |
| `agents-md` | file | `ais agents-md add .` |

**选项：** `-t` 仓库、`-l` 本地、`-d` 目标目录、`-s` 源目录、`--dry-run`、`--force`、`--user`

### `ais git <command>`

在仓库中运行 git 命令。

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### `ais user install`

从 `~/.config/ai-rules-sync/user.json` 安装所有用户级条目。与 `ais install --user` 等效。

```bash
ais user install
```

### `ais completion install`

安装 shell Tab 补全。自动检测 shell（bash、zsh、fish）并追加到配置文件。

```bash
ais completion install            # 自动检测 shell 并安装
ais completion install --force   # 强制重新安装
ais completion bash               # 仅输出脚本（用于手动安装）
```

### `ais config`

管理配置。

```bash
# 仓库源目录（覆盖 AIS 在仓库中查找规则的位置）
ais config repo set-source <repo> <tool.subtype> <path>
# 示例：ais config repo set-source my-repo cursor.rules custom/rules
ais config repo show <repo>
ais config repo clear-source <repo> [tool.subtype]   # 省略 subtype 则清除全部
ais config repo list            # 与 ais ls 相同

# 用户配置路径
ais config user show
ais config user set <path>
ais config user reset
```

### 通用选项（工具命令）

| 选项 | 描述 |
|------|------|
| `-t, --target <repo>` | 指定仓库（名称、URL 或路径） |
| `-l, --local` | 保存到 `ai-rules-sync.local.json` |
| `-d, --target-dir <dir>` | 自定义目标目录 |
| `-s, --source-dir <dir>` | 自定义源目录 |
| `--dry-run` | 预览，不实际执行 |
| `--force` | 强制覆盖已有 |
| `--user` | 使用用户模式（个人配置） |
