# ai-rules-sync

## 0.8.1

### Patch Changes

- - feat(config): add sourceDir object format for one-source-multi-target sync (#35)
  - feat(config): extend sourceDir for directory/hybrid mode with sourceDir and targetName (#36)
  - docs: update and simplify documentation (#37)

## 0.8.0

### Minor Changes

- - feat(config): add sourceDir object format for one-source-multi-target sync (#35)
  - feat(config): extend sourceDir for directory/hybrid mode with sourceDir and targetName (#36)
  - docs: update and simplify documentation (#37)

## 0.7.0

### Minor Changes

- - feat(cli): add check, update, init lifecycle commands
  - feat: introduce dotany abstraction layer with linkany-backed symlinks
  - feat(ais): use local path symlink
  - fix(remove): harden symlink cleanup and upgrade linkany
  - refactor!: remove legacy compatibility code paths

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
