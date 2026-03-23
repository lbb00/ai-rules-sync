# Multiple Repositories

AIS supports using rules from multiple Git repositories simultaneously. Use the `-t` flag to specify which repository to use:

```bash
ais cursor add coding-standards -t company-rules
ais cursor add react-best-practices -t https://github.com/community/rules.git
ais cursor add my-utils -t personal-rules
```

## Managing Repositories

```bash
# Add a repository
ais use https://github.com/your-org/rules-repo.git

# List all repositories
ais ls
# * company-rules (current)
#   personal-rules
#   community-rules

# Switch current repository
ais use personal-rules
```

## Discover and Install All (`add-all`)

Quickly install everything from a repository:

```bash
# Install everything from current repository
ais add-all

# Install all Cursor rules
ais cursor add-all

# Preview before installing
ais add-all --dry-run

# Filter by tool
ais add-all --tools cursor,copilot

# Interactive mode
ais cursor add-all --interactive

# Force overwrite / skip existing
ais add-all --force
ais add-all --skip-existing
```

## Repository Lifecycle

```bash
# Check whether repositories are behind upstream
ais check

# Preview updates without pulling
ais update --dry-run

# Pull updates and reinstall entries
ais update

# Initialize a rules repository template
ais init
```

## Git Commands

Manage repository directly from CLI:

```bash
ais git status
ais git pull
ais git push
ais git log --oneline
ais git status -t company-rules
```
