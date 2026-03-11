# OpenCode

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Commands | file | `.opencode/commands/` | `.md` | [文档](https://opencode.ai/docs/commands/) |
| Skills | directory | `.opencode/skills/` | - | [文档](https://opencode.ai/docs/skills/) |
| Agents | file | `.opencode/agents/` | `.md` | [文档](https://opencode.ai/docs/agents/) |
| Tools | file | `.opencode/tools/` | `.ts`, `.js` | [文档](https://opencode.ai/docs/tools/) |

## Commands

```bash
ais opencode commands add build-optimizer
ais opencode commands rm build-optimizer
```

## Skills

```bash
ais opencode skills add refactor-helper
ais opencode skills rm refactor-helper
```

## Agents

```bash
ais opencode agents add code-reviewer
ais opencode agents rm code-reviewer
```

## Tools

```bash
ais opencode tools add project-analyzer
ais opencode tools rm project-analyzer
```

## User 模式

```bash
# OpenCode 使用 XDG 路径：~/.config/opencode/
ais opencode commands add my-cmd --user
```

## 安装全部

```bash
ais opencode install
```

## 参考

- [OpenCode Commands 文档](https://opencode.ai/docs/commands/)
- [OpenCode Skills 文档](https://opencode.ai/docs/skills/)
- [OpenCode Agents 文档](https://opencode.ai/docs/agents/)
- [OpenCode Tools 文档](https://opencode.ai/docs/tools/)
