# Tool Guides

AIS uses one command shape for every tool:

```bash
ais <tool> <subtype> <add|rm|import|install|add-all> [name]
```

Examples:

```bash
ais cursor rules add react
ais copilot instructions add coding-style
ais claude skills add code-review
ais agents-md file add .
```

[Supported Tools](/reference/supported-tools) lists every adapter, path, and suffix. Pages below cover the tools with extra notes (hybrid Cursor rules, Codex skills path, Warp vs AGENTS.md, …).

| Tool | Guide |
|------|-------|
| Cursor | [Cursor](/tools/cursor) |
| GitHub Copilot | [GitHub Copilot](/tools/copilot) |
| Claude Code | [Claude Code](/tools/claude) |
| Trae | [Trae](/tools/trae) |
| OpenCode | [OpenCode](/tools/opencode) |
| Codex | [Codex](/tools/codex) |
| Gemini CLI | [Gemini CLI](/tools/gemini) |
| Warp | [Warp](/tools/warp) |
| Windsurf | [Windsurf](/tools/windsurf) |
| Cline | [Cline](/tools/cline) |
| AGENTS.md | [AGENTS.md](/tools/agents-md) |

Other tools (Aider, Amp, Continue, Junie, Kiro, Qwen, Zed, …) use the same CLI. Look up `ais <tool> --help` and the [directory reference](/reference/supported-tools).
