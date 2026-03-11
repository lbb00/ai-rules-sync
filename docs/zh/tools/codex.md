# Codex

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Rules | file | `.codex/rules/` | `.rules` | [文档](https://developers.openai.com/codex/rules) |
| Skills | directory | `.agents/skills/` | - | [文档](https://developers.openai.com/codex/skills) |
| AGENTS.md | file | `.codex/` | `.md` | [文档](https://developers.openai.com/codex) |

## Rules

```bash
# Starlark 语法，用于沙箱控制
ais codex rules add default
ais codex rules rm default
```

## Skills

```bash
ais codex skills add code-assistant
ais codex skills rm code-assistant
```

::: info
Codex skills 使用 `.agents/skills/`（非 `.codex/skills/`），遵循 OpenAI 文档。
:::

## AGENTS.md

```bash
# 项目级
ais codex md add AGENTS

# 用户级
ais codex md add AGENTS --user    # → ~/.codex/AGENTS.md
```

## 导入

```bash
ais codex rules import my-sandbox-rules
ais codex skills import my-helper-skill
```

## 安装全部

```bash
ais codex install
```

## 参考

- [Codex Rules 文档](https://developers.openai.com/codex/rules)
- [Codex Skills 文档](https://developers.openai.com/codex/skills)
- [Codex 文档](https://developers.openai.com/codex)
