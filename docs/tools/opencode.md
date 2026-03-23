# OpenCode

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Commands | file | `.opencode/commands/` | `.md` | [Docs](https://opencode.ai/docs/commands/) |
| Skills | directory | `.opencode/skills/` | - | [Docs](https://opencode.ai/docs/skills/) |
| Agents | file | `.opencode/agents/` | `.md` | [Docs](https://opencode.ai/docs/agents/) |
| Tools | file | `.opencode/tools/` | `.ts`, `.js` | [Docs](https://opencode.ai/docs/tools/) |

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

## User Mode

```bash
# OpenCode uses XDG path: ~/.config/opencode/
ais opencode commands add my-cmd --user
```

## Install All

```bash
ais opencode install
```

## Reference

- [OpenCode Commands Docs](https://opencode.ai/docs/commands/)
- [OpenCode Skills Docs](https://opencode.ai/docs/skills/)
- [OpenCode Agents Docs](https://opencode.ai/docs/agents/)
- [OpenCode Tools Docs](https://opencode.ai/docs/tools/)
