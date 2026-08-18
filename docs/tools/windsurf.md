# Windsurf

| Type | Mode | Default Source Directory | File Suffixes | Documentation |
|------|------|--------------------------|---------------|---------------|
| Rules | file | `.windsurf/rules/` | `.md` | [Docs](https://docs.windsurf.com/windsurf/cascade/memories) |
| Skills | directory | `.windsurf/skills/` | - | [Docs](https://docs.windsurf.com/windsurf/cascade/skills) |
| Commands | file | `.windsurf/workflows/` | `.md` | [Docs](https://docs.windsurf.com) |

## Rules

```bash
ais windsurf rules add project-style
ais windsurf rules rm project-style
```

## Skills

```bash
ais windsurf skills add deploy-staging
ais windsurf skills rm deploy-staging
```

## Commands

```bash
ais windsurf commands add deploy-docs
ais windsurf commands rm deploy-docs
```

## Install All

```bash
ais windsurf install
```

::: tip
Windsurf Memories are managed inside Cascade UI/runtime. AIS syncs file-based artifacts (`.windsurf/rules`, `.windsurf/skills`, and `.windsurf/workflows`).
:::

## Reference

- [Windsurf Rules Docs](https://docs.windsurf.com/windsurf/cascade/memories)
- [Windsurf Skills Docs](https://docs.windsurf.com/windsurf/cascade/skills)
- [Windsurf Docs](https://docs.windsurf.com)
