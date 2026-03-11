# Windsurf

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.windsurf/rules/` | `.md` | [Docs](https://docs.windsurf.com/windsurf/cascade/memories) |
| Skills | directory | `.windsurf/skills/` | - | [Docs](https://docs.windsurf.com/windsurf/cascade/skills) |

## Rules

```bash
ais windsurf add project-style
ais windsurf rm project-style
```

## Skills

```bash
ais windsurf skills add deploy-staging
ais windsurf skills rm deploy-staging
```

## Install All

```bash
ais windsurf install
```

::: tip
Windsurf Memories are managed inside Cascade UI/runtime. AIS syncs file-based artifacts (`.windsurf/rules` and `.windsurf/skills`).
:::

## Reference

- [Windsurf Rules Docs](https://docs.windsurf.com/windsurf/cascade/memories)
- [Windsurf Skills Docs](https://docs.windsurf.com/windsurf/cascade/skills)
