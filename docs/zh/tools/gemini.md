# Gemini CLI

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Commands | file | `.gemini/commands/` | `.toml` | [文档](https://geminicli.com/docs/cli/custom-commands/) |
| Skills | directory | `.gemini/skills/` | - | [文档](https://geminicli.com/docs/cli/skills/) |
| Agents | file | `.gemini/agents/` | `.md` | [文档](https://geminicli.com/docs/core/subagents/) |
| GEMINI.md | file | `.gemini/` | `.md` | [网站](https://geminicli.com/) |

## Commands

```bash
ais gemini commands add deploy-docs
ais gemini commands rm deploy-docs
```

## Skills

```bash
ais gemini skills add code-review
ais gemini skills rm code-review
```

## Agents

```bash
ais gemini agents add code-analyzer
ais gemini agents rm code-analyzer
```

## GEMINI.md

```bash
# 项目级
ais gemini md add GEMINI

# 用户级
ais gemini md add GEMINI --user    # → ~/.gemini/GEMINI.md
```

## 安装全部

```bash
ais gemini install
```

## 参考

- [Gemini CLI Commands 文档](https://geminicli.com/docs/cli/custom-commands/)
- [Gemini CLI Skills 文档](https://geminicli.com/docs/cli/skills/)
- [Gemini CLI Agents 文档](https://geminicli.com/docs/core/subagents/)
- [Gemini CLI 网站](https://geminicli.com/)
