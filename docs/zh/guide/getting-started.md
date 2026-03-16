# 快速开始

## 安装

### 通过 npm（推荐）

```bash
npm install -g ai-rules-sync
```

### 通过 Homebrew（macOS）

```bash
brew tap lbb00/ai-rules-sync https://github.com/lbb00/ai-rules-sync
brew install ais
```

或不使用 tap 的一次性安装：

```bash
brew install --formula https://raw.githubusercontent.com/lbb00/ai-rules-sync/main/Formula/ais.rb
```

### 验证安装

```bash
ais --version
```

### 启用 Tab 补全（可选）

```bash
ais completion install
```

## 快速上手

::: tip 规则仓库 vs 项目
**规则仓库**存储你的规则（如 `react.mdc`）。**项目**消费这些规则 — AIS 在仓库与项目之间创建符号链接。添加规则前需要先有规则仓库（或创建一个）。
:::

### 场景 1：使用现有规则

你有一个规则仓库，想在项目中使用其规则。

::: info 没有规则仓库？
可尝试[场景 4](#场景-4-从零创建规则)从零创建，或使用任何已有 `.cursor/rules/`、`.claude/skills/` 等目录的 Git 仓库。
:::

```bash
# 1. 进入你的项目
cd your-project

# 2. 添加规则（第一次需要指定仓库 URL）
ais cursor add react -t https://github.com/your-org/rules-repo.git

# 完成！规则现在已链接到你的项目
```

发生了什么：
- AIS 将仓库克隆到 `~/.config/ai-rules-sync/repos/`
- 设置其为当前仓库
- 创建软链接：`rules-repo/.cursor/rules/react` → `your-project/.cursor/rules/react`
- 保存配置到 [`ai-rules-sync.json`](/zh/reference/configuration)

之后可以省略 `-t` 标志：

```bash
ais cursor add vue
ais cursor add testing
```

### 场景 2：分享你的现有规则

你在项目中有规则，想通过仓库分享。

**前置条件：** 项目中必须已有规则文件（例如 `.cursor/rules/my-custom-rule.mdc`）。

```bash
# 1. 创建规则仓库
mkdir ~/my-rules-repo && cd ~/my-rules-repo
git init
ais init
ais use .

# 2. （可选）推送到远程，便于他人使用
git remote add origin https://github.com/your-org/rules-repo.git
git add . && git commit -m "Initial rules repo"
git push -u origin main

# 3. 从项目中导入现有规则
cd your-project
ais cursor rules import my-custom-rule

# 4. （可选）将导入的规则推送到远程
ais git push

# 完成！
```

### 场景 3：加入团队项目

克隆一个已使用 AIS 的项目：

```bash
git clone https://github.com/team/project.git
cd project
ais install
# 所有规则已设置完毕！
```

### 场景 4：从零创建规则

你想从零构建规则仓库并在多个项目中使用。

```bash
# 1. 创建并初始化规则仓库
mkdir ~/my-rules-repo && cd ~/my-rules-repo
git init
ais init
ais use .

# 2. 向仓库添加规则文件（创建 .cursor/rules/ 等）
mkdir -p .cursor/rules
echo "# React Best Practices" > .cursor/rules/react.mdc
git add . && git commit -m "Add react rule"

# 3. 推送到远程
git remote add origin https://github.com/your-org/rules-repo.git
git push -u origin main

# 4. 在任何项目中使用
cd your-project
ais cursor add react -t https://github.com/your-org/rules-repo.git
```

## 下一步

- **理解模型：** [核心概念](/zh/guide/core-concepts) — add、import、install 的区别，仓库生命周期
- **项目 vs 个人：** [项目级别同步](/zh/guide/project-level) 用于团队规则，[用户全局级别同步](/zh/guide/user-level) 用于个人 CLAUDE.md / GEMINI.md
- **你的工具：** [工具指南](/zh/guide/tool-guides) — Cursor、Copilot、Claude 等
- **CLI 参考：** [CLI 命令](/zh/reference/cli) — 完整命令列表

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 首次 add 需要 `-t` | 第一次需指定仓库 URL：`ais cursor add react -t https://github.com/org/repo.git` |
| 导入失败：「entry not found」 | 导入前确保项目中已有规则文件（如 `.cursor/rules/my-rule.mdc`） |
| 克隆后符号链接损坏 | 在项目根目录运行 `ais install` 根据配置重建符号链接 |
| 使用了错误仓库 | 运行 `ais use <repo>` 切换，或在 add/import 时使用 `-t <repo>` |
