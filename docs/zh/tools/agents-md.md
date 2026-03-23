# AGENTS.md（通用）

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| AGENTS.md | file | `.`（根目录） | `.md` | [标准](https://agents.md/) |

## 使用

```bash
# 从根目录添加
ais agents-md add .

# 从子目录添加
ais agents-md add frontend

# 带别名添加（区分多个 AGENTS.md 文件）
ais agents-md add frontend fe-agents
ais agents-md add backend be-agents

# 移除
ais agents-md rm fe-agents
```

## 参考

- [AGENTS.md 标准](https://agents.md/)
