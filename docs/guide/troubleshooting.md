# Troubleshooting

Common issues and solutions when using AIS.

## First-Time Setup

### "Repository required" or `-t` flag needed

**Symptom:** Adding a rule fails with a message about specifying a repository.

**Solution:** On the first `add` in a project (or when no current repo is set), specify the repository:

```bash
ais cursor add react -t https://github.com/your-org/rules-repo.git
```

After that, `ais use` remembers the repo and you can omit `-t`.

### Import fails: "entry not found"

**Symptom:** `ais cursor rules import my-rule` fails with "entry not found".

**Solution:** The rule file must exist in your project before importing. Ensure you have e.g. `.cursor/rules/my-rule.mdc` (or `.md`) in the project root.

## Symlinks

### Broken symlinks after git clone

**Symptom:** After cloning a project, `.cursor/rules/` shows broken symlinks.

**Solution:** Run `ais install` in the project root. AIS reads `ai-rules-sync.json` and recreates all symlinks.

### Symlinks point to wrong location

**Symptom:** Rules don't update when you change the source repository.

**Solution:** Check that the symlink target exists. Run `ais status` to verify. If the repo was moved, run `ais use <correct-repo>` and `ais install`.

## Repositories

### Wrong repository used for add/import

**Symptom:** Rules are added from the wrong repository.

**Solution:**

```bash
ais ls                    # List all repos
ais use correct-repo      # Switch current repo
ais cursor add react -t https://github.com/org/correct-repo.git  # Or specify -t explicitly
```

### Repository behind upstream

**Symptom:** You want to pull latest rules from the remote.

**Solution:**

```bash
ais check                 # Check if repos are behind
ais update                # Pull and reinstall
ais update --dry-run      # Preview without applying
```

## User-Level Config

### `ais user install` does nothing

**Symptom:** Running `ais user install` completes but no files appear in `~/.claude/`, etc.

**Solution:** Ensure `~/.config/ai-rules-sync/user.json` has entries. Add them first:

```bash
ais use https://github.com/me/my-rules.git
ais claude md add CLAUDE --user
ais user install
```

### User config path

**Symptom:** Want to store `user.json` in dotfiles.

**Solution:**

```bash
ais config user set ~/dotfiles/ai-rules-sync/user.json
ais config user show      # Verify
```

## Monorepo

### Same rule, different packages

**Symptom:** Need the same rule in `packages/frontend` and `packages/backend`.

**Solution:** Use aliases so the same repo entry maps to different local names:

```bash
ais cursor add auth-rules -d packages/frontend/.cursor/rules
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules
```

## Getting Help

- Run `ais status` for project overview
- Run `ais status --json` for machine-readable output
- [GitHub Issues](https://github.com/lbb00/ai-rules-sync/issues)
