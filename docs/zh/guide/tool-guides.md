# 工具指南

所有工具共用同一套命令形态：

```bash
ais <tool> <subtype> <add|rm|import|install|add-all> [name]
```

示例：

```bash
ais cursor rules add react
ais copilot instructions add coding-style
ais claude skills add code-review
ais agents-md file add .
```

[支持的工具](/zh/reference/supported-tools) 列出全部适配器、路径和后缀。下面这些页面补充了额外说明（Cursor 混合规则、Codex skills 路径、Warp 与 AGENTS.md 等）。

| 工具 | 指南 |
|------|------|
| Cursor | [Cursor](/zh/tools/cursor) |
| GitHub Copilot | [GitHub Copilot](/zh/tools/copilot) |
| Claude Code | [Claude Code](/zh/tools/claude) |
| Trae | [Trae](/zh/tools/trae) |
| OpenCode | [OpenCode](/zh/tools/opencode) |
| Codex | [Codex](/zh/tools/codex) |
| Gemini CLI | [Gemini CLI](/zh/tools/gemini) |
| Warp | [Warp](/zh/tools/warp) |
| Windsurf | [Windsurf](/zh/tools/windsurf) |
| Cline | [Cline](/zh/tools/cline) |
| AGENTS.md | [AGENTS.md](/zh/tools/agents-md) |

其他工具（Aider、Amp、Continue、Junie、Kiro、Qwen、Zed 等）命令相同。查阅 `ais <tool> --help` 和 [目录参考](/zh/reference/supported-tools)。
