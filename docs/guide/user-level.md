# User Global-Level Sync

Sync rules into your home directory (`$HOME`). Dependencies are tracked in `~/.config/ai-rules-sync/user.json` and apply to **all projects** on the machine.

```
Rules Repository                    Your Home Directory (~/)
├── .claude/CLAUDE.md          ──→   ~/.claude/CLAUDE.md      (symlink)
├── .gemini/GEMINI.md          ──→   ~/.gemini/GEMINI.md      (symlink)
├── .codex/AGENTS.md           ──→   ~/.codex/AGENTS.md       (symlink)
└── .cursor/rules/my-style.mdc ──→   ~/.cursor/rules/my-style (symlink)
```

**Key characteristics:**
- **Scope:** Home directory (`$HOME`)
- **Config file:** `~/.config/ai-rules-sync/user.json`
- **Typical use:** Personal AI configuration (CLAUDE.md, GEMINI.md, AGENTS.md), cross-project coding style
- **Gitignore:** Automatically skipped (home dir is not a git repo)
- **Commands:** Append `--user` or `-u` to any add/remove/install command

```bash
# Add personal CLAUDE.md
ais claude md add CLAUDE --user

# Add personal Gemini config
ais gemini md add GEMINI --user

# Add personal Codex config
ais codex md add AGENTS --user

# Add user-level cursor rules (apply to all projects)
ais cursor add my-style --user

# Install all user entries (perfect for new machine setup)
ais user install
```

## Comparison with Project-Level

| | Project-Level | User Global-Level |
|---|---|---|
| **Scope** | Single project directory | `$HOME` (all projects) |
| **Flag** | (default) | `--user` / `-u` |
| **Config file** | [`ai-rules-sync.json`](/reference/configuration) | `~/.config/ai-rules-sync/user.json` |
| **Shared via Git** | ✅ Yes | ❌ No (personal) |
| **Gitignore managed** | ✅ Yes | ❌ Skipped |
| **Typical content** | Team rules, project standards | Personal CLAUDE.md, GEMINI.md, coding style |
| **Restore command** | `ais install` | `ais user install` |

## Multi-Machine Workflow

Combine user-level sync with a personal rules repository to keep your AI configurations consistent across machines:

```bash
# Machine A: initial setup
ais use git@github.com:me/my-rules.git
ais claude md add CLAUDE --user
ais gemini md add GEMINI --user
ais cursor add my-style --user

# Machine B: one-command restore
ais use git@github.com:me/my-rules.git
ais user install
# Done! All personal AI configs are restored
```

## Custom User Config Path (Dotfiles Integration)

Store `user.json` in your dotfiles repo for easier cross-machine sync:

```bash
# Point user config to dotfiles
ais config user set ~/dotfiles/ai-rules-sync/user.json

# View current path
ais config user show

# Reset to default
ais config user reset
```
