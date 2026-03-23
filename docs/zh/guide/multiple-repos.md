# 多仓库

AIS 支持同时使用多个 Git 仓库的规则。使用 `-t` 标志指定仓库：

```bash
ais cursor add coding-standards -t company-rules
ais cursor add react-best-practices -t https://github.com/community/rules.git
ais cursor add my-utils -t personal-rules
```

## 管理仓库

```bash
# 添加仓库
ais use https://github.com/your-org/rules-repo.git

# 列出所有仓库
ais ls
# * company-rules (current)
#   personal-rules
#   community-rules

# 切换当前仓库
ais use personal-rules
```

## 发现并安装全部（`add-all`）

从仓库快速安装所有内容：

```bash
# 从当前仓库安装所有
ais add-all

# 安装所有 Cursor 规则
ais cursor add-all

# 安装前预览
ais add-all --dry-run

# 按工具过滤
ais add-all --tools cursor,copilot

# 交互模式
ais cursor add-all --interactive

# 强制覆盖 / 跳过已有
ais add-all --force
ais add-all --skip-existing
```

## 仓库生命周期

```bash
# 检查仓库是否落后于上游
ais check

# 预览更新
ais update --dry-run

# 拉取更新并重新安装
ais update

# 初始化规则仓库模板
ais init
```

## Git 命令

从 CLI 直接管理仓库：

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```
