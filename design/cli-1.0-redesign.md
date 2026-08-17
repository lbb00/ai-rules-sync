# ais 1.0.0 CLI 命令面重设计

状态：方案定稿，待实现。本文档是实现的唯一依据，实现 agent 应以此为准，不要重新发明。

## 0. 背景与决策边界

1.0.0 是一次明确的 breaking 大版本：**不保留旧命令的向后兼容**。这不是疏忽，是刻意决定——原因是当前顶层命令面（`ais add`/`ais remove`/`ais install` 等）依赖一套"猜你想用哪个工具/哪个 subtype"的推断逻辑（`inferDefaultMode`、`resolveSingleAdapterForMode`、`TOOLS_WITH_DEFAULT_ADD_SUBTYPE` 等），这套逻辑正是此前一轮 bug 修复（PR #45）里大部分静默失败、mode 不匹配问题的根源。1.0 的设计原则：

> **没有推断，只有显式或广播两条路。** 每个命令的目标要么完全显式（`ais <tool> <subtype> <verb>`），要么显式声明广播范围（`--tools <list>` 或 `--all`）。adapter 注册表（`src/adapters/index.ts`）是"命令是否存在、命令是什么意思"的唯一真相来源。

以下两点是经用户明确拍板、不再讨论的边界（除非实现中发现真实场景证明其错误）：

- **完全显式，任何工具都没有默认 subtype 魔法**，包括当前 cursor/copilot/windsurf/cline 的"猜 subtype"行为，以及单 subtype 工具（warp/aider/zed 等）的扁平 `ais warp add`——**全部取消**，没有例外。短命令需求由广播组承接。
- **广播组的 `--tools` 过滤值用 CLI 命令组名**（如 `agy`、`droid`），不是 adapter 内部的 `tool` 字段（`antigravity-cli`、`factorydroid`）——因为这是用户在 CLI 别处实际敲的字符串（`ais agy skills add ...`）。这个选择参照了 `vercel-labs/skills`（一个真实存在、覆盖 72+ agent 的同类 CLI）的既有约定：它用 `-a/--agent <names...>` 做同类目标选择、`-g/--global` 做项目/用户作用域切换，两者都被市场验证过。

本方案经过两轮 Fable 5 模型的独立评审（构造用户画像、走真实命令序列、找漏洞），第二轮修正了第一轮的一处事实误判（sourceDir 通配符其实已经存在于代码中，见 §3），并收敛了全部悬而未决的设计点。

---

## 1. 用户画像与场景（评审依据）

设计决策基于以下六个画像的真实命令路径压测，不是纸面推演：

| 画像 | 目标 | 水平 |
|---|---|---|
| **Mika**（独立开发者） | 一份个人 skills + 一份 CLAUDE.md/AGENTS.md，同步到本机 claude、codex、cursor、opencode、droid 五个工具的用户级目录 | 高，重度终端用户 |
| **Serena**（平台组 tech lead） | 维护公司 rules repo；monorepo 里前端组用 cursor+copilot、后端组用 claude+codex | 高，但每周只碰 ais 一次 |
| **Devon**（换新电脑的工程师） | 一条命令恢复整套用户级配置 | 中，照 README 操作 |
| **CI 流水线** | clone 后非交互 `install`，退出码可靠，输出机器可读 | 脚本，零容忍模糊行为 |
| **Priya**（单工具用户，只用 Claude Code） | 加两个 skill、一个 CLAUDE.md，其余 29 个工具是噪音 | 中低，讨厌长 help |
| **Old Guard Tom**（从手工 dotfiles 迁移，代表老版本肌肉记忆） | 怀疑 symlink 工具，每一步都要先看清会动什么文件；也代表会打 `ais cursor add x` 这种旧命令的用户 | 高（shell），对 ais 是新手 |

Mika 的场景就是这次重设计的起点——"一个 skill 一键给所有工具"，这是用户本人最初提出的真实需求，不是虚构画像。

关键结论（详细过程见 §7 Journey 复走）：**如果只做广播命令、不修 §3 的 sourceDir 通配符问题，Mika 的核心场景会静默失败**（每个工具都得到"仓库里没这条"，默认跳过，退出 0，什么都没发生）。这是本方案范围包含 §3 的直接原因。

---

## 2. 最终命令面

| 命令 | 状态 |
|---|---|
| `ais use / init / list / status / search / check / update / config` | 基本不变（`init`、`status` 有小改，见 §3.4、§6.6） |
| `ais install [-g]` | 简化：无 mode 检测，直接按 `adapterRegistry.all()` 分组安装已有配置的部分；新增 `--json` |
| `ais add-all [--tools ...] [...]` | 不变（仓库→项目发现），`--tools` 未知名改硬错（对齐广播组） |
| `ais import <name>` | 不变（fs 自动探测，遍历全部 adapter） |
| `ais user install` | **删除**（见 §6.4），并入 `ais install -g` |
| `ais add` / `ais remove`（顶层猜工具） | **删除** |
| `ais <tool>` | 统一 `registerToolGroup()` 工厂生成，覆盖全部 30 个工具（见 §4） |
| `ais <subtype> add/remove/list` | **新增**广播组：skills、agents、rules、commands、md、prompts（见 §5） |

---

## 3. sourceDir 通配符（修正后的范围：补齐三个缺口，不是从零设计）

### 3.1 现状事实核查（已亲读代码确认）

**通配符机制本身已经存在且能工作**，第一轮评审误判了这一点：

- `readNestedSourceDirValue`（`src/project-config.ts:77-88`）：精确 `(tool, subtype)` 命中优先，未命中时若 `tool !== '*'` 则回退到 `WILDCARD_TOOL`（`'*'`，定义于 `project-config.ts:11`）查找。
- `getSourceDir`（`project-config.ts:412-437`）：第 422-428 行的 CLI/global override 走 `readNestedStringValue`（同样 wildcard-aware，41-52 行）；第 431 行的 repo 配置走上面的 `readNestedSourceDirValue`。优先级：**override > repo 显式 tool 条目 > repo `"*"` 条目 > `adapter.defaultSourceDir`**。`rootPath` 只前缀 repo 条目与 default，不前缀 override（现状，不改）。
- 两条实际调用链都经过它：`handleAdd`（`src/commands/handlers.ts:429-430`）、`discoverAllEntries`（`src/commands/add-all.ts:104-105`）。
- `docs/reference/configuration.md:90-107` 已经把这套优先级写进了文档。

**真正缺的是三样**，1.0 要补的就是这三样，不是重新设计机制：

1. **零测试覆盖**（`tests/` 目录搜不到任何 `"*"` 相关用例）。
2. **`ais init` 模板不生成通配符**——`buildTemplateSourceDirConfig`（`src/commands/lifecycle.ts:462-474`）逐 adapter 枚举，为每个 `(tool, subtype)` 写一行 `adapter.defaultSourceDir`，从不使用 `"*"`。新建的仓库天生就是"29 行手写映射"的状态，Mika 的痛点直接由此产生。
3. **广播命令的 `--dry-run` 没有可视化"这条命中是靠通配符还是显式条目"**——用户看不懂为什么命中/不命中。

### 3.2 Schema（现状即终态，不新增格式）

```jsonc
{
  "version": 1,
  "sourceDir": {
    "*":      { "skills": "skills", "rules": "rules" },
    "claude": { "skills": "claude-only-skills" },        // 显式条目，覆盖 "*"
    "codex":  { "md": { "mode": "file", "dir": "common", "sourceFile": "AGENTS.md" } }
  }
}
```

### 3.3 代码改动

| 改动 | 文件 |
|---|---|
| 新增 `resolveSourceDir(repoConfig, tool, subtype, defaultDir, globalOverride): { dir: string; origin: 'override' \| 'explicit' \| 'wildcard' \| 'default' }`；`getSourceDir` 改为其薄包装（只返回 `.dir`），所有现有调用点不动 | `src/project-config.ts` |
| 广播命令 `--dry-run` 表格增加 origin 列，调用 `resolveSourceDir` | 新广播模块（见 §5） |
| 单测：三级优先级各一条、`SourceDirValue` 对象形态的通配符、`rootPath` 拼接、`origin` 正确性 | `tests/` |
| 集成测试：通配符 repo + `ais skills add x --tools a,b,c` 全部命中 | `tests/` |

### 3.4 `ais init` 模板改造

`buildTemplateSourceDirConfig`（`lifecycle.ts:462`）：

- 对**被 ≥2 个工具共享的 subtype**（skills、agents、rules、commands、prompts）只生成一条 `"*": { "<subtype>": "<subtype>" }`（扁平目录名，如 `skills/`、`rules/`）。
- 对**工具独有或源文件名各异的 subtype**（各家 `md`、agents-md 的 `file`、copilot 的 `instructions`、agy 的 `workflows`、opencode 的 `tools`）保留显式 per-tool 条目，值仍取 `adapter.defaultSourceDir`。
- `createDirs`（`lifecycle.ts:494-508`）改为按**生成后的配置**建目录，不再按 `adapter.defaultSourceDir` 逐个枚举。
- `--only`/`--exclude` 语义不变；若排除后某 subtype 只剩 1 个工具成员，该工具退回显式条目（不再共享 `"*"` 目录，因为共享已经没有意义）。
- 共享目录内部靠各 adapter 的 `fileSuffixes` 区分（如 cursor 的 `.mdc`）。**验收测试**：共享 `rules/` 目录里放一个 `.md` 文件，确认 cursor（若只认 `.mdc`）在 dry-run 表格里显式给出 `skip: not-in-repo`，是可见行为，不是静默。

### 3.5 迁移

**无需迁移**。显式条目语义不变，`"*"` 是纯增量能力。用户已有的、全枚举式的仓库（比如实际调查过的 `ai-brain` 仓库，显式列出 claude/cursor/codex）原样继续工作——显式条目永远压过 `"*"`，不需要、也不应该提示用户改写。

### 3.6 与项目侧通配符的关系（不合并机制）

依赖侧的通配符（`getRuleSection`，`project-config.ts:284-296` 附近，"这条规则适用于哪些工具"）和 sourceDir 侧的通配符（`readNestedSourceDirValue`）是同一概念（工具级回退）、同一常量 `WILDCARD_TOOL`、同一文件，但作用的 value 形状不同（`RuleEntry` vs `SourceDirValue`）。**裁决：不强行合并成一套遍历器**——那只会为两种不同形状的 value 引入不必要的泛型噪音。要求：两个函数的 docstring 互相引用对方，注明"概念对齐、形状不同"；两侧各自保留独立测试。新增的 `resolveSourceDir` 继续复用同一个 `WILDCARD_TOOL` 常量。

---

## 4. `ais <tool>` 组：统一 `registerToolGroup()` 工厂

替换现在 index.ts 里手写的 cursor 块、claude 块、`registerRulesAndSkillsToolGroup`（windsurf/cline 专用）、以及约 15 个只有 `install` 的残次品组。对每个工具生成：

- 每个 subtype 子组 `ais <tool> <subtype> add/remove/install/add-all/import`——复用现有 `registerAdapterCommands`（`src/cli/register.ts`，此前 bug 修复已经是 registry 驱动，**不改**）。
- `ais <tool> install [-g]`——循环该工具自己的全部 adapter，安装配置里已有的条目。
- `ais <tool> add-all [...]`——现有 `handleAddAll` 限定到该工具的 adapter 集合。
- `ais <tool> import <name>`——按该工具全部 adapter 的 `targetDir` 做文件系统探测，泛化现有 cursor/opencode/codex/gemini/warp/windsurf/cline 的 import 聚合模式到全部 30 个工具。**硬前置**（见 §6.2）：探测必须做类型匹配——`mode: 'file'` 的 adapter 只命中普通文件且后缀 ∈ `fileSuffixes`；`mode: 'directory'` 只命中目录。当前实现（如 index.ts:965-971 的 cursor 模式）是纯 `fs.pathExists` 判断，没有类型区分，工厂化时必须补上，否则 cline 这种"commands 目录嵌套在 rules 的 targetDir 内部"的场景会互相误判。
- **扁平 `add`/`remove` 一律不提供真实功能**——见 §6.6 的隐藏 stub 设计,不区分单/多 subtype 工具,取消已锁定的"单 subtype 例外"路径。

---

## 5. `ais <subtype>` 广播组（新增）

只为 §6.1 定义的 `BROADCAST_GROUPS` 里 ≥2 adapter 成员的组生成命令：**skills、agents、rules、commands、md、prompts**。`workflows`（仅 antigravity）、`tools`（仅 opencode）这类单工具 subtype 不生成组（广播无意义）。

```bash
ais skills add my-skill --tools claude,cursor,codex
ais skills add my-skill --tools claude --tools codex     # --tools 也支持重复传参
ais skills add my-skill --all -g
ais skills add my-skill --all --dry-run
ais skills remove my-skill --tools claude,cursor
ais skills list --all -g
```

**参数**：

- `--tools <list>`：CLI 命令组名（`agy`、`droid`，不是 `antigravity-cli`/`factorydroid`），逗号分隔且支持重复传参（复用 `src/index.ts` 现有的 `collect()` 辅助函数），做 trim。传入未知名字**直接硬错**并给出编辑距离 ≤2 的"did you mean"建议（这几个新命令里 `--tools` 是主入口，不像旧 `add-all --tools` 那样只值得警告）。
- `--all`：目标 = 全部拥有该 subtype adapter 的工具。
- `--tools`/`--all` **必须二选一**，都不给直接报错——不设"默认全部"，避免漏参导致意外全量操作。
- `-g, --global` / `-u, --user`：互为别名（见 §6.3 的覆盖范围）。
- `--dry-run`：打印解析表 `工具 → 仓库源路径(origin: override/explicit/wildcard/default) → 目标路径 → 动作(will-add/skip:not-in-repo/skip:already-configured)`，不落盘。
- `--strict`：把"仓库里这个工具没有该条目"从默认的跳过+警告变成硬失败。
- `--json`：结构化输出替代彩色文本。
- `-l, --local`：语义同现有 `add`（写 `.git/info/exclude` 而非 `.gitignore`）。

**语义**：

- 目标工具压根没有该 subtype 的 adapter（如 `ais rules add --tools pi`，pi 无 rules adapter）——调用方错误，硬失败并列出真正支持该 subtype 的工具；如果该工具有近义概念（见 `CONCEPT_HINTS`，§6.1），错误信息给出确切替代命令（例：`--tools copilot` 打到 `rules` 组时，提示"copilot 的对应概念是 instructions，运行 ais copilot instructions add ts-style"）。
- 目标工具有 adapter、但仓库里没这个 entry——默认跳过+警告，`--strict` 转为失败。
- 已解析但落盘失败——始终计入 errors，最终 exit 1，跟现有 `add-all` 的错误累积模式一致。
- 配置落盘：不引入新格式。项目模式按 adapter 各写各的配置段（复用 `handleAdd`，对每个命中的 adapter 调一次）；`-g`/`-u` 模式写 user.json，同现有 user 模式 add。
- `[alias]`：给出则统一应用到每个命中的工具。

**`ais <subtype> list`**：新增能力，每工具一行展示"仓库里有没有这个 entry / 项目里装没装"（configured/linked 两列），`--json` 支持。实现上复用现有 `collectToolCounts`/status 的采集模式,成本低。**纳入 v1**——它是广播模型的安全教学入口（用户第一次接触 `--tools`/`--all` 语义最好发生在只读命令上），也是 Serena 做验收、CI 做 drift 检测的直接需求。

---

## 6. 悬案裁决（全部收敛，不留选项）

### 6.1 共享模块 `src/adapters/cli-groups.ts`

```ts
// CLI 组名 ≠ adapter.tool 的映射（合并原 add-all.ts 的 TOOL_CLI_ALIASES 和 scripts.ts 的 TOOL_CLI_GROUPS）
export const CLI_GROUP_TOOL_MAP = { agy: 'antigravity-cli', droid: 'factorydroid' } as const;
export function resolveToolByCliName(name: string): string | undefined; // CLI 组名与底层 tool 名均可解析
export function cliNameForTool(tool: string): string; // 反查，供错误信息/补全使用

// 广播组名 -> 涵盖的 subtype 集合。组成员 = subtype ∈ 该集合的全部 adapter
export const BROADCAST_GROUPS: Record<string, readonly string[]> = {
  skills:   ['skills'],
  agents:   ['agents'],
  rules:    ['rules'],
  commands: ['commands'],
  md:       ['md', 'file'],   // 'file' = agents-md 的 subtype，显式收编进 md 组（用户直觉上 AGENTS.md 就是"那个 md 文件"）
  prompts:  ['prompts'],      // 3 个成员：copilot-prompts、continue-prompts、pi-prompts
};

// 概念近义提示（广播硬错时输出精确替代命令），刻意保持最小，不做穷举
export const CONCEPT_HINTS: Record<string, Record<string, string>> = {
  rules: { copilot: 'instructions' },
};
```

**注册时断言**（模块加载时执行，命中即 throw，防止未来新工具/新 subtype 静默撞名）：广播组名 ∉（全部工具 CLI 名集合 ∪ 顶层保留字 `{use, init, list, ls, status, search, check, update, config, install, add-all, import}`）。"每个 ≥2 成员的 subtype 必须有对应广播组"是**测试**（新 subtype 涨到 2 个成员时测试变红，逼着人做显式决策），不是运行时断言（不能让 CLI 因为新 adapter 注册就启动崩溃）。

### 6.2 五个未接线 adapter：**全部接线，附一个硬前置**

`cline-commands`、`cline-agents`、`windsurf-commands`、`opencode-rules`、`codex-agents`——此前 review 阶段发现它们注册在 adapter 表里但没有真实 CLI 命令（见 `src/completion/scripts.ts` 的 `UNWIRED_ADAPTER_NAMES`）。逐个核实 `targetDir`：

| adapter | targetDir | 裁决 |
|---|---|---|
| windsurf-commands | `.windsurf/workflows` | 原样接线，与 `.windsurf/rules`、`.windsurf/skills` 无路径重叠 |
| opencode-rules | `.opencode/rules`（含 `userTargetDir`） | 原样接线，无重叠 |
| codex-agents | `.codex/agents`（`.toml`） | 原样接线，与 `.codex/rules`、`.agents/skills` 无重叠 |
| cline-agents | `.cline/agents`（`.yaml`） | 原样接线，无重叠 |
| cline-commands | `.clinerules/workflows` | **接线需要 §4 的类型匹配硬前置**——它的路径嵌套在 cline-rules 的 targetDir `.clinerules` 内部,现行"纯路径存在性"探测会和 cline-rules 互相误判 |

统一工厂落地、类型匹配硬前置补上之后，删除 `UNWIRED_ADAPTER_NAMES`（`scripts.ts:97-103`），补全改为从注册表 + `cli-groups.ts` 单一来源生成。**未验证残留**：这 5 个 adapter 对应的上游工具（Cline/Windsurf/Codex/OpenCode）是否真的读取这些路径——不阻塞接线（adapter 本就在注册表内、用户可自行配置使用），但 `docs/reference/supported-tools.md` 对应条目需要标注"未逐一验证上游行为"。

### 6.3 `-g` 作用域：**不扩展到 `add-all`/`import`**

`-g/--global`（= `-u/--user`）覆盖：per-adapter `add`/`remove`/`install`、`ais <tool> install`、顶层 `ais install`、广播组 `add`/`remove`/`list`。**`add-all` 与 `import` 保持 project-only**，理由：

- `add-all` 的 user 版等价于"把仓库全量灌进 user.json"，恰是广播组要求"必须显式 `--tools`/`--all`"防的那类整机误操作，该需求已由 `ais skills add x --all -g` 承接,语义更可控。
- `import` 的探测语义定义在项目工作树上（`targetDir` 相对 cwd）；home 目录版需要 `userTargetDir` 探测，是新能力，不在 1.0 范围。

`docs/reference/cli.md` 要给出一张 `-g` 覆盖矩阵表；不支持的命令上传 `-g` 由 Commander 的 unknown-option 报错自然拒绝，不做静默忽略。

### 6.4 `ais user` 组：**整组删除**

`ais user install`（`index.ts` 现有实现,唯一子命令）调用 `installAllUserEntries(adapterRegistry.all())`，与顶层 `ais install -g` 分支完全等价,零能力差异。删除，canonical 写法收敛为 `ais install -g`。**注意区分**：`ais config user show/set/reset`（管理 `user.json` 文件路径本身，不是安装条目）是完全不同的东西，**保留**。

### 6.5 已采纳、不再论证的项

did-you-mean（工具名编辑距离 ≤2 建议）；`CONCEPT_HINTS` 近义提示（§6.1）；`--tools` 逗号+重复传参二选一均可；`add-all --tools` 未知名改硬错，统一走 `resolveToolByCliName`；顶层 `--help` 把 30 个工具组折叠为一行索引（`program.configureHelp`，展示顺序：核心命令 → 广播组 → 工具索引行），服务 Priya 这类单工具用户；`ais install --json` + 退出码文档（部分失败 = exit 1）；`ais <subtype> list` 进 v1（§5 已定）。

### 6.6 扁平 add/remove 全灭后的替代：隐藏 stub

每个工具组注册一个**隐藏**命令（Commander `{ hidden: true }`，补全脚本同步排除，不出现在 `--help` 里）：`ais <tool> add`/`ais <tool> remove`，单/多 subtype 工具统一同一代码路径。行为：非零退出，输出该工具的真实 subtype 清单 + 两条可直接复制的替代命令（`ais <tool> <subtype> add <用户实际输入的参数>` 和 `ais <subtype> add <name> --tools <tool>`）。

**为什么隐藏而不是完全不注册**：Old Guard Tom 这类用户会输入旧教程里的 `ais cursor add x`，未注册命令时 Commander 给的是冷冰冰的 "unknown command"，没有出路；注册且隐藏，则既不污染 `--help`/补全（Priya 的噪音问题不会恶化），又能在真被输入时给出可操作的引导。

**删除清单追加项**（原方案 §6 遗漏，本轮补齐）：
- `ais status` 输出里的 `inferredMode` 字段依赖 `inferDefaultMode`，随整个推断层一起删除——这是一处 JSON 输出的 breaking 变更，1.0 可接受，需要写进 changelog。
- `findAdapterForAlias`（`src/adapters/index.ts`）：原本只被旧顶层 `ais remove` 的"按 alias 反查工具"路径使用，随其删除。"我只记得名字，不记得哪个工具"的场景由 `ais search --configured <name>` 承接，需要在迁移说明里明确写出这条替代路径。

---

## 7. Journey 复走（确认关键问题已解决）

**Mika**：`ais init my-rules` → 模板按 §3.4 自动生成 `"*": { skills: "skills", ... }` → skill 只写一份在仓库的 `skills/code-review/` → `ais skills add code-review --tools claude,codex,cursor,opencode,droid -g` → 五个工具全部经通配符命中，一次成功；`--dry-run` 表格的 origin 列显示 `wildcard`，能看懂命中原因。第一轮发现的"空心广播"场景（5 个工具全部 `skip: not-in-repo`）只会在"仓库既没配置也不符合默认布局"时出现，且在 dry-run 里可见,不是静默。习惯性敲 `ais warp add x` → 隐藏 stub 给出两条可复制替代——warp 从来不是多个画像的真实痛点，属一次性重训成本，不是设计缺陷。"CLAUDE.md/AGENTS.md 一份源多处落地"用现有的 `sourceFile` 覆写机制即可（`docs/reference/configuration.md` 已有 `common/AGENTS.md → CLAUDE.md` 的配方），文档给 recipe 就够，不需要额外机制。

**Serena**：共享 `rules/` 目录 + `ais rules add ts-style --tools cursor,claude,codex --dry-run` 确认表格 → 执行；`--tools copilot` 硬错但带 `CONCEPT_HINTS` 精确替代命令，从死路变成引导（仍是两条命令，可接受）；`ais rules list --all` 做验收。残留风险：共享目录内 `.mdc`/`.md` 等后缀分流是否符合预期，由 §3.4 的验收测试钉住。

---

## 8. 实施验收清单

1. `resolveSourceDir` + 通配符测试套（§3.3）。
2. `ais init` 模板通配符化 + `createDirs` 跟随（§3.4），含共享目录后缀分流的验收测试。
3. `src/adapters/cli-groups.ts`：四个导出（`CLI_GROUP_TOOL_MAP`、`resolveToolByCliName`、`cliNameForTool`、`BROADCAST_GROUPS`、`CONCEPT_HINTS`）+ 注册时断言 + 覆盖测试。
4. 统一 `registerToolGroup` 工厂：subtype 子组（`register.ts` 不动）+ `install` + `add-all` + 类型匹配版 `import`（§4 硬前置）+ 隐藏 stub（§6.6）。
5. 六个广播组：`--tools`/`--all` 互斥必选、`--dry-run` 表格带 origin 列、`--strict`、`--json`、`-g`、部分失败 exit 1、did-you-mean、`CONCEPT_HINTS`。
6. 删除：顶层 `add`/`remove`、推断层五函数（`inferDefaultMode`/`resolveSingleAdapterForMode`/`requireExplicitMode`/`TOOLS_WITH_DEFAULT_ADD_SUBTYPE`/`getToolsForInstallMode`）、`status.inferredMode` 字段、`findAdapterForAlias`、`ais user` 组、`UNWIRED_ADAPTER_NAMES`。
7. 顶层 `--help` 折叠 30 个工具组为一行索引。
8. `ais install --json` + 退出码文档。
9. 文档：`docs/reference/cli.md` 补 `-g` 覆盖矩阵 + 迁移说明（`ais remove` → `ais search --configured` + 显式 remove；`ais user install` → `ais install -g`）；`supported-tools.md` 标注 5 个新接线 adapter 的"未逐一验证上游行为"。**时序：等当前 docs 重构 WIP 独立落地后，1.0 命令面 PR 必须同 PR 更新这些文档**，不能让已删除的命令留在已发布文档里。
10. Changeset：1.0.0，major，breaking，列出全部删除项。

**未验证残留（不阻塞方案定稿，列为实现期验收项）**：
- `handleAdd` 对"目标路径已存在但不是 symlink"的行为（cline-commands/cline-rules 路径嵌套场景下可能触发）。
- `cursor-rules` 等 adapter 的 `fileSuffixes` 实际值是否与共享目录设计吻合。
- 5 个新接线 adapter 对应工具的真实上游读取行为。
- `ais install` 离线场景（`cloneOrUpdateRepo` 在无网络时的行为）。
