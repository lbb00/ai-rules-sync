# Warp

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Rules | file | `.`（根目录） | `.md` | [文档](https://docs.warp.dev/agent-platform/capabilities/rules) |
| Skills | directory | `.agents/skills/` | - | [文档](https://docs.warp.dev/agent-platform/capabilities/skills) |

## Rules

Warp Rules 使用 [AGENTS.md 标准](https://agents.md/)，请使用 `agents-md` 命令：

```bash
# 从仓库根目录添加 AGENTS.md（在 Warp 中全局生效）
ais agents-md add .

# 添加目录特定规则
ais agents-md add src

# 移除
ais agents-md rm .
```

## Skills

```bash
ais warp skills add my-skill
ais warp skills rm my-skill
ais warp skills install
```

## 参考

- [Warp Rules 文档](https://docs.warp.dev/agent-platform/capabilities/rules)
- [Warp Skills 文档](https://docs.warp.dev/agent-platform/capabilities/skills)
