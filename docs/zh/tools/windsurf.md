# Windsurf

| 类型 | 模式 | 默认源目录 | 文件后缀 | 文档 |
|------|------|------------|----------|------|
| Rules | file | `.windsurf/rules/` | `.md` | [文档](https://docs.windsurf.com/windsurf/cascade/memories) |
| Skills | directory | `.windsurf/skills/` | - | [文档](https://docs.windsurf.com/windsurf/cascade/skills) |
| Commands | file | `.windsurf/workflows/` | `.md` | [文档](https://docs.windsurf.com) |

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

## 安装全部

```bash
ais windsurf install
```

::: tip
Windsurf Memories 在 Cascade UI/运行时中管理。AIS 同步基于文件的资产（`.windsurf/rules`、`.windsurf/skills` 和 `.windsurf/workflows`）。
:::

## 参考

- [Windsurf Rules 文档](https://docs.windsurf.com/windsurf/cascade/memories)
- [Windsurf Skills 文档](https://docs.windsurf.com/windsurf/cascade/skills)
- [Windsurf 文档](https://docs.windsurf.com)
