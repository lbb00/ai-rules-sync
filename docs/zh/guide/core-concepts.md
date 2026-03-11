# 核心概念

## 仓库

**规则仓库**是一个包含规则的 Git 仓库，按工具组织：

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
│   ├── CLAUDE.md
│   └── skills/
│       └── debug-helper/
└── ai-rules-sync.json
```

### 仓库位置

- **全局**：`~/.config/ai-rules-sync/repos/`（由 AIS 管理）
- **本地**：`ais use ~/path` 在 `repos/` 中创建符号链接

### 管理仓库

```bash
# 设置当前仓库
ais use https://github.com/your-org/rules-repo.git

# 列出所有仓库
ais ls

# 切换仓库
ais use company-rules
ais use personal-rules
```

## 获取规则的三种方式

### `add` — 从仓库使用规则

将仓库中的条目链接到项目，保存依赖到 [`ai-rules-sync.json`](/zh/reference/configuration)。

**何时使用：** 使用共享仓库中的现有规则。

```bash
# 项目级别
ais cursor add react -t https://github.com/org/rules.git

# 用户全局级别
ais cursor add react --user
```

### `import` — 通过仓库分享规则

将项目中已有的条目复制到仓库并提交，用软链接替换原文件。

**何时使用：** 项目中有规则，想分享它们。

```bash
ais cursor rules import my-custom-rule
```

### `install` — 从配置文件恢复

读取配置并重建所有软链接。

**何时使用：** 克隆了带有 [`ai-rules-sync.json`](/zh/reference/configuration) 的项目，或需要在新机器上恢复用户配置。

```bash
# 项目级别：从 ai-rules-sync.json 恢复
ais install

# 用户全局级别：从 user.json 恢复
ais user install
```

## 仓库生命周期

```bash
# 检查仓库是否落后于上游
ais check

# 检查用户配置仓库
ais check --user

# 预览更新
ais update --dry-run

# 拉取更新并重新安装
ais update

# 初始化规则仓库模板
ais init
```
