# Import Assets

Copy an existing file from your project into an asset repository, commit it, then replace the original with a symlink so other projects can `add` it.

```bash
# Import rule from project to repository
ais cursor rules import my-custom-rule

# With custom commit message
ais cursor rules import my-rule -m "Add custom rule"

# Import and push to remote
ais cursor rules import my-rule --push

# Force overwrite
ais cursor rules import my-rule --force

# Preview
ais cursor rules import my-rule --dry-run
```

## Workflow

1. You have a rule file in your project (e.g., `.cursor/rules/my-custom-rule.mdc`)
2. Run `ais cursor rules import my-custom-rule`
3. AIS copies the file into the current repository
4. Creates a git commit in the repository
5. Replaces the original file with a symlink pointing to the repository copy
6. Saves the dependency to [`ai-rules-sync.json`](/reference/configuration)

Now the rule lives in the repository and can be shared with other projects via `ais cursor rules add my-custom-rule`.
