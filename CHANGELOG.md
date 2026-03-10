# ai-rules-sync

## 0.7.0

### Minor Changes

- feat: import-all command for batch importing project entries
  feat: import --user flag for custom git commit author
  fix: hybrid mode for claude-agents, claude-rules, and claude-commands adapters
  fix: graceful handling of no-op force imports

## 0.6.0

### Minor Changes

- Add Windsurf, Cline, user-level sync, and Cursor AI 9384 support

  - Add Windsurf and Cline AI adapter support (rules and skills)
  - Add user-level sync support (`--user` flag) for all tools, syncing to home directory
  - Add user config management via `~/.config/ai-rules-sync/user.json`
  - Add Cursor AI 9384 support
  - Add Homebrew tap support for `brew install ais`

## 0.5.0

### Minor Changes

- Add support for Warp agent skills, Gemini CLI, GitHub Copilot agent skills, and OpenAI Codex
