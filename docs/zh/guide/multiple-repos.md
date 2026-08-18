# 多仓库

AIS 是多对多：**一个仓库可以供给多个项目**，**一个项目可以组合多个仓库**。`-t` 选择来源；项目清单记下这套组合。

```bash
ais cursor rules add coding-standards -t company-rules
ais cursor rules add react-best-practices -t https://github.com/community/rules.git
ais cursor rules add my-utils -t personal-rules
```

`ai-rules-sync.json` 会列出每条资产及其来源仓库。同事用 `ais install` 恢复同一套组合。

## 注册与切换

```bash
ais use https://github.com/your-org/rules-repo.git
ais ls
# * company-rules (current)
#   personal-rules
#   community-rules

ais use personal-rules
```

第一次 add 之后可省略 `-t`，使用当前仓库。

## 同一仓库供给多种工具

缓存里的一次克隆，可以同时给项目提供 Cursor、Copilot 和 Claude：

```bash
ais cursor rules add react -t https://github.com/org/rules.git
ais copilot instructions add coding-standards -t https://github.com/org/rules.git
ais claude skills add code-review -t https://github.com/org/rules.git

ais use https://github.com/org/rules.git
ais add-all --tools cursor,copilot,claude
```

## 映射目录

第三方仓库或跨工具布局需要自定义源路径。持久配置：

```bash
ais config repo set-source third-party cursor.rules custom/rules
ais config repo show third-party
```

一次性：

```bash
ais cursor rules add-all -s custom/rules
```

也可以在**资产仓库**的 `ai-rules-sync.json` 里写 `sourceDir`（通配符、文件重命名、目录重命名）。见 [配置](/zh/reference/configuration) 和 [Monorepo 与自定义目录](./monorepo)。

## 发现并全部安装（`add-all`）

```bash
ais add-all
ais cursor add-all
ais add-all --dry-run
ais add-all --tools cursor,copilot
ais cursor add-all --interactive
ais add-all --force
ais add-all --skip-existing
```

## 保持缓存仓库最新

```bash
ais check
ais update --dry-run
ais update
ais init
```

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```
