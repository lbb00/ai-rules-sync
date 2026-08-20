# 核心概念

## 先缓存，再组合

AIS 不会把资产复制进项目。

```
Git 仓库  ──clone──►  ~/.config/ai-rules-sync/repos/  ──symlink──►  你的项目
```

- 每个 Git remote **克隆一次**到全局缓存
- 每个项目的 [`ai-rules-sync.json`](/zh/reference/configuration) 记录用哪些仓、落到哪里
- 一个仓可以供给多个项目；一个项目可以混合多个仓，并映射目录（Cursor rules → Claude rules）

本地仓库也可以：`ais use ~/my-rules-repo` 会在缓存里放一条软链接。

## 资产仓库

仓库就是普通 Git 仓库，按各工具的原生路径组织：

```
my-rules-repo/
├── .cursor/rules/
├── .cursor/skills/
├── .claude/skills/
├── .claude/CLAUDE.md
├── AGENTS.md
└── ai-rules-sync.json    # 可选：自定义 sourceDir / rootPath
```

```bash
ais use https://github.com/your-org/rules-repo.git
ais ls
ais use company-rules
```

## 三种操作

### `add` — 消费

把仓库里的条目链接到当前项目（或加 `--user` 链接到 `$HOME`）。

```bash
ais cursor rules add react -t https://github.com/org/rules.git
ais cursor rules add react --user
```

### `import` — 发布

把项目里已有的文件复制进仓库并提交，再用软链接替换原文件。

```bash
ais cursor rules import my-custom-rule
```

### `install` — 恢复

读取清单，重建全部软链接。克隆项目、CI、新机器时用。

```bash
ais install          # 项目：ai-rules-sync.json
ais install -g       # 用户：~/.config/ai-rules-sync/user.json
```

## 三层配置

| 文件 | 作用域 | Git |
|------|--------|-----|
| `ai-rules-sync.json` | 共享，当前项目 | 是 |
| `ai-rules-sync.local.json` | 私有，当前项目 | 否 |
| `user.json` | 个人，本机 | 可选（dotfiles） |

合并优先级（高到低）：local → project → user。结构见 [配置](/zh/reference/configuration)。

## 两个范围

- **[项目级](./project-level)** — `cwd`，团队共享
- **[用户级](./user-level)** — `$HOME`，个人 `CLAUDE.md` / `GEMINI.md` / 风格规则

## 保持仓库最新

```bash
ais check              # 是否落后上游？
ais update --dry-run
ais update             # pull + 重新安装
ais init               # 初始化资产仓库模板
```

混合来源、目录映射、`add-all` 和 `ais git` 见 [多仓库](./multiple-repos)。
