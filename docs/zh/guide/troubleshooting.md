# 故障排查

使用 AIS 时的常见问题及解决方案。

## 首次设置

### 需要指定仓库或 `-t` 标志

**现象：** 添加规则失败，提示需要指定仓库。

**解决：** 在项目首次 `add`（或未设置当前仓库）时，需指定仓库：

```bash
ais cursor add react -t https://github.com/your-org/rules-repo.git
```

之后 `ais use` 会记住仓库，可省略 `-t`。

### 导入失败：「entry not found」

**现象：** `ais cursor rules import my-rule` 失败，提示「entry not found」。

**解决：** 导入前项目中必须已有规则文件。确保项目根目录存在如 `.cursor/rules/my-rule.mdc`（或 `.md`）。

## 符号链接

### 克隆后符号链接损坏

**现象：** 克隆项目后，`.cursor/rules/` 显示损坏的符号链接。

**解决：** 在项目根目录运行 `ais install`。AIS 会读取 `ai-rules-sync.json` 并重建所有符号链接。

### 符号链接指向错误位置

**现象：** 修改源仓库后规则未更新。

**解决：** 检查符号链接目标是否存在。运行 `ais status` 验证。若仓库已移动，运行 `ais use <正确仓库>` 和 `ais install`。

## 仓库

### add/import 使用了错误仓库

**现象：** 规则被添加到错误的仓库。

**解决：**

```bash
ais ls                    # 列出所有仓库
ais use correct-repo      # 切换当前仓库
ais cursor add react -t https://github.com/org/correct-repo.git  # 或显式指定 -t
```

### 仓库落后于上游

**现象：** 需要从远程拉取最新规则。

**解决：**

```bash
ais check                 # 检查仓库是否落后
ais update                # 拉取并重新安装
ais update --dry-run      # 仅预览不执行
```

## 用户级配置

### `ais user install` 无效果

**现象：** 运行 `ais user install` 完成，但 `~/.claude/` 等目录无文件。

**解决：** 确保 `~/.config/ai-rules-sync/user.json` 中有条目。先添加：

```bash
ais use https://github.com/me/my-rules.git
ais claude md add CLAUDE --user
ais user install
```

### 用户配置路径

**现象：** 想将 `user.json` 存到 dotfiles。

**解决：**

```bash
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais config user show      # 验证
```

## Monorepo

### 同一规则用于不同包

**现象：** 需要在 `packages/frontend` 和 `packages/backend` 使用同一规则。

**解决：** 使用别名，使同一仓库条目映射到不同本地名称：

```bash
ais cursor add auth-rules -d packages/frontend/.cursor/rules
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules
```

## 获取帮助

- 运行 `ais status` 查看项目概览
- 运行 `ais status --json` 获取机器可读输出
- [GitHub Issues](https://github.com/lbb00/ai-rules-sync/issues)
