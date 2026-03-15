# 高级功能

## 全局选项

所有命令支持：

- `-t, --target <repo>` — 指定仓库（名称、URL 或本地路径）
- `-l, --local` — 保存到 `ai-rules-sync.local.json`（私有）

```bash
ais cursor add react -t company-rules --local
```

## 查询命令

```bash
ais status              # 检查项目状态
ais search react        # 搜索规则
ais check               # 检查仓库是否落后
ais check --user        # 检查用户配置仓库

# JSON 输出（脚本/CI）
ais ls --json
ais status --json
ais search react --json
```

## 多工具示例

在同一仓库中为 Cursor、Copilot 和 Claude 使用规则：

```bash
# 添加 Cursor 规则
ais cursor add react -t https://github.com/org/rules.git
ais cursor add typescript

# 添加 Copilot instructions（同一仓库）
ais copilot instructions add coding-standards -t https://github.com/org/rules.git

# 添加 Claude skills（同一仓库）
ais claude skills add code-review -t https://github.com/org/rules.git

# 或使用 add-all 一次性安装全部
ais use https://github.com/org/rules.git
ais add-all --tools cursor,copilot,claude
```

## 更多

- [多仓库](./multiple-repos) — 同时使用多个 Git 仓库的规则
- [导入规则](./import-rules) — 通过仓库分享规则
- [Monorepo 与自定义目录](./monorepo) — 自定义源目录和目标目录
- [用户全局级别同步](./user-level) — 个人 AI 配置管理
- [故障排查](./troubleshooting) — 常见问题及解决方案
