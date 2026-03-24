# ai-rules-sync

## 0.8.2-beta.3

### Patch Changes

- 5d98907: Add CI workflow for PRs and coverage reporting

## 0.8.2-beta.2

### Patch Changes

- 2ecaffd: Improve test coverage from 67% to 91% statements, 80% branches, 92% functions. Add vitest coverage configuration with enforced thresholds. Add 18 new test files covering git, plugins, commands, adapters, dotany, and utilities (802 total tests).
- 2ecaffd: Merge upstream lbb00/ai-rules-sync (aa53caac..6b562a3) bringing sourceDir object format, init --only/--exclude, wildcard config fallback, and VitePress documentation site. All fork features preserved.

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
