# Monorepo & Custom Directories

## Custom Target Directories

Use `-d` to specify where symlinks should be created:

```bash
# Add to custom directory
ais cursor add my-rule -d docs/ai/rules
```

### Monorepo Usage

In a monorepo, you can sync different rules to different packages:

```bash
ais cursor add react-rules frontend-rules -d packages/frontend/.cursor/rules
ais cursor add node-rules backend-rules -d packages/backend/.cursor/rules
```

::: warning
Adding the same rule to multiple locations requires **aliases**:

```bash
ais cursor add auth-rules -d packages/frontend/.cursor/rules
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules
```
:::

## Custom Source Directories

Override where AIS looks for rules in a repository.

### CLI Parameters (temporary)

```bash
ais cursor rules add-all -s custom/rules
ais add-all -s cursor.rules=custom/rules -s cursor.commands=custom/cmds
```

### Global Configuration (persistent)

```bash
ais config repo set-source third-party cursor.rules custom/rules
ais config repo show third-party
ais config repo clear-source third-party cursor.rules
```

**Priority:** CLI Parameters > Global Config > Repository Config > Adapter Defaults
