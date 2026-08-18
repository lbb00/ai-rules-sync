---
outline: [2, 3]
---

# CLI 命令

## 命令结构

每条命令都显式指定目标工具和子类型，不再有自动猜测模式。以下三种写法可以到达同一个条目：

```bash
ais cursor rules add react        # 一个工具，一个子类型
ais rules add react --tools cursor,claude   # 一个子类型，同时作用于多个工具
ais rules add react --all         # 所有带 rules 适配器的工具
```

`ais ls` 用于列出仓库（`ais list` 同样可用）。没有顶层的 `add`/`remove` 命令——始终需要指定工具、广播命令组，或者两者都指定。

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

从配置文件安装所有条目（默认项目作用域）。

```bash
ais install                 # 项目条目（来自 ai-rules-sync.json）
ais install -g              # 用户条目（来自 ~/.config/ai-rules-sync/user.json）
ais install --json
```

`-g, --global`（别名 `-u, --user`）切换到用户作用域——不再有单独的 `ais user install` 命令。

### `ais init [name]`

初始化一个规则仓库模板。

```bash
ais init
ais init my-rules-repo
ais init --force                 # 覆盖已有的 ai-rules-sync.json
ais init --no-dirs               # 不创建默认源目录
ais init --only cursor copilot   # 仅包含指定工具
ais init --exclude codex         # 排除指定工具
ais init --json
```

多个工具共用的子类型（skills、agents、rules、commands、prompts）会合并成一条 `sourceDir` 通配符条目（`"*"`），而不是每个工具一行；各工具专属的文件子类型（md、instructions 等）因内容因工具而异，仍会逐条列出。

### `ais update`

拉取仓库更新并重新安装条目。

```bash
ais update
ais update --user
ais update --dry-run
ais update --json
```

### `ais check`

检查仓库是否落后于上游。

```bash
ais check
ais check --user
ais check --json
```

### `ais doctor`

校验每个已配置条目是否真的对应一个健康的符号链接——只读，不做任何修改，也不会克隆仓库。每条会报告为 `ok`（正常）、`missing`（目标路径上什么都没有）、`conflict`（本该是符号链接的位置放了一个真实文件/目录）或 `stale`（符号链接指向的不是当前仓库源，或者源仓库本地不可用、无法校验）。只要有条目需要处理就以非零状态退出，可以直接接入 CI。

```bash
ais doctor
ais doctor --user     # 同时检查用户作用域的条目
ais doctor --json
```

`missing` → 运行 `ais install`（用户条目用 `ais install -g`）重新链接。`conflict` 需要手动处理——AIS 不会覆盖真实文件。`stale` 通常意味着仓库自条目添加后有了变动；用 `ais update` 刷新即可。

### `ais status`

显示项目状态（仓库、符号链接、配置文件）。

```bash
ais status
ais status --user                 # 包含用户配置状态
ais status --json
```

### `ais search [query]`

搜索仓库中可用的条目。

```bash
ais search react
ais search --tools claude,cursor
ais search --configured           # 仅显示已在项目配置中的条目
ais search --unconfigured         # 仅显示尚未配置的条目
ais search --json
```

### `ais add-all`

从当前仓库发现并安装所有条目。

```bash
ais add-all
ais add-all --dry-run             # 仅预览，不安装
ais add-all --tools cursor,copilot # 按工具筛选（未知名称会报错退出）
ais add-all --interactive         # 逐条确认
ais add-all --force               # 覆盖已有
ais add-all --skip-existing       # 跳过已在配置中的条目
ais add-all -l                    # 保存到 ai-rules-sync.local.json
ais add-all --quiet               # 最小化输出
```

传给 `--tools` 的未知名称会以非零状态退出并列出受支持的工具，而不再是静默跳过。

### `ais import <name>`

将项目里已有的文件或目录导入仓库，自动识别工具与子类型。

```bash
ais import my-rule
ais import my-rule --dry-run
ais import my-rule --push
```

当你不知道（或不想指定）具体工具时，优先用这个命令；如果明确是哪个工具，改用 `ais <tool> import` 或 `ais <tool> <subtype> import`。

## 工具命令

已注册的 30+ 个工具都遵循同一套命令形态，由适配器注册表自动生成：`ais <tool> <subtype> add/remove/install/add-all/import`，此外还有作用于该工具全部子类型的 `ais <tool> install/add-all/import`。

```bash
ais cursor rules add react              # 添加一条 Cursor 规则
ais cursor rules add react my-alias -d dir  # 带别名和自定义目标目录
ais cursor rules remove react           # （别名：rm）
ais claude skills add code-review       # 添加一个 Claude skill
ais copilot instructions add coding-style
ais cursor install                      # 安装 Cursor 的全部条目（所有子类型）
ais cursor add-all                      # 从仓库添加 Cursor 的全部条目
ais cursor import my-rule               # 从项目导入到仓库（自动识别子类型）
ais cursor rules import my-rule         # 同上，显式指定子类型
```

::: tip
`ais <tool> add`/`ais <tool> remove`（不带子类型）是隐藏命令，仅用于让旧教程运行失败时给出替代命令，而不是报「unknown command」——它们只打印替代命令并以非零状态退出，不会写入任何内容。请始终指定子类型：用 `ais cursor rules add x`，而不是 `ais cursor add x`。
:::

**工具与子类型**（以下为代表性示例，完整的 30+ 工具列表见[支持的工具](/zh/reference/supported-tools)）：

| 工具 | 子类型 | 示例 |
|------|--------|------|
| `cursor` | rules, commands, skills, agents | `ais cursor rules add react` |
| `copilot` | instructions, prompts, skills, agents | `ais copilot instructions add x` |
| `claude` | rules, skills, agents, md | `ais claude md add CLAUDE --user` |
| `trae` | rules, skills | `ais trae rules add x` |
| `opencode` | rules, commands, skills, agents, tools | `ais opencode skills add x` |
| `codex` | rules, skills, agents, md | `ais codex md add AGENTS` |
| `gemini` | commands, skills, agents, md | `ais gemini md add GEMINI` |
| `warp` | skills | `ais warp skills add x` |
| `windsurf` | rules, skills, commands | `ais windsurf rules add x` |
| `cline` | rules, skills, commands, agents | `ais cline rules add x` |
| `agents-md` | file | `ais agents-md file add .` |

所有工具都是同一套命令形态：`ais <tool> <subtype> add <name> [alias]`。

**`add` 选项：** `-l` 本地、`-u` 用户作用域、`-d` 目标目录（`-t` 用于选择来源仓库，跨工具通用）。
**`remove` 选项：** `-u` 用户作用域、`--dry-run`。
**`install`/`add-all` 选项：** 见各命令的 `--help`；它们与全局 `ais install`/`ais add-all` 的参数一致，只是作用范围限定在该工具上。

## 广播命令组

一条命令把同一个条目推送到多个工具，不用对每个工具重复敲一遍 `ais <tool> <subtype> add`。每个共享子类型对应一个命令组：`skills`、`agents`、`rules`、`commands`、`md`（包含 AGENTS.md）、`prompts`。

```bash
ais skills add my-skill --tools claude,cursor,codex
ais skills add my-skill --all               # 所有带 skills 适配器的工具
ais skills remove my-skill --tools claude   # 别名：rm
ais skills list                             # 查看每个工具的配置情况
ais skills add my-skill --all --dry-run     # 预览：will-add / skip: not-in-repo / skip: already-configured
```

```bash
ais agents add reviewer --all
ais rules add style-guide --tools cursor,windsurf
ais commands add deploy --all
ais md add AGENTS.md --tools agents-md,claude
ais prompts add release-notes --tools copilot
```

每个 `<group> add/remove/list` 都接受 `--tools <list>`（逗号分隔，可重复传）或 `--all`，以及表示用户作用域的 `-g/--global`（别名 `-u/--user`）和 `--json`。`add` 还额外支持 `-l/--local`、`--dry-run` 和 `--strict`（某个工具在仓库中没有匹配条目时直接报错退出，而不是只警告）。

无法识别的 `--tools` 名称会给出「你是不是想输入」的建议；如果某个工具在该组里没有对应适配器、但存在已知的等价物（例如 Copilot 用 `instructions` 对应 `rules` 组），会直接提示对应的替代命令，而不是悄无声息地什么都不做。

## 其他命令

### `ais git <command>`

在仓库中运行 git 命令。

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```

### `ais completion [shell]`

输出或安装 shell 的 Tab 补全（bash、zsh、fish）。

```bash
ais completion install            # 自动检测 shell 并安装
ais completion install --force    # 强制重新安装
ais completion bash               # 仅输出脚本（用于手动安装）
```

### `ais config`

管理配置。

```bash
# 仓库源目录（覆盖 AIS 在仓库中查找条目的位置）
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

## 从 1.0 之前版本迁移

| 旧命令 | 新命令 |
|-----|-----|
| `ais add <name> [alias]`（顶层，自动猜测工具） | `ais <tool> <subtype> add <name> [alias]`，或 `ais <subtype> add <name> --tools <tool>` |
| `ais remove <alias>`（顶层，自动猜测工具） | `ais <tool> <subtype> remove <alias>`——如果不记得是哪个工具，可以先用 `ais search --configured <alias>` 查找 |
| `ais user install` | `ais install -g` |
