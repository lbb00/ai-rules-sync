# Product

## Purpose

AI Rules Sync (`ais`) is a CLI tool that solves the problem of AI agent configuration drift. Teams and individuals accumulate rules, instructions, and prompts for AI coding tools (Cursor, GitHub Copilot, Claude Code, etc.) but have no reliable way to share, version, or sync them across projects and machines. AIS manages these files through Git repositories and symbolic links, giving one source of truth that propagates automatically.

## Core Value

- Rules live in a shared Git repo; projects link to them — no copying, no drift
- One command to restore all rules after cloning (`ais install`)
- Privacy: local-only rules go in `ai-rules-sync.local.json`, never committed
- Personal AI config files (`~/.claude/CLAUDE.md`, etc.) versioned via User Mode

## Key Capabilities

1. **Add**: create a symlink from a rules repo into a project, save the dependency
2. **Remove**: delete the symlink and remove the dependency entry
3. **Import**: move an existing project file into the rules repo, commit it, replace with symlink
4. **Install**: read `ai-rules-sync.json` and recreate all symlinks (post-clone setup)
5. **Update**: pull all repos and reinstall links
6. **add-all**: discover and link every entry in a repo for a given tool/type
7. **User Mode** (`--user`): target `$HOME` instead of the project root, track in `~/.config/ai-rules-sync/user.json`

## Supported Tools

Cursor, GitHub Copilot, Claude Code, Trae, OpenCode, Codex, Gemini CLI, Windsurf, Cline, Warp, and the universal AGENTS.md standard. Each tool may have multiple subtypes (rules, commands, skills, agents, instructions, prompts, tools, md files).

## Users

- Individual developers managing personal AI config across machines
- Teams standardising coding rules and sharing them via Git
- Organisations with private rules repos mixed alongside public ones
