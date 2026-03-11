# Monorepo 与自定义目录

## 自定义目标目录

使用 `-d` 指定软链接的创建位置：

```bash
# 添加到自定义目录
ais cursor add my-rule -d docs/ai/rules
```

### Monorepo 用法

在 Monorepo 中，可以将不同规则同步到不同的包：

```bash
ais cursor add react-rules frontend-rules -d packages/frontend/.cursor/rules
ais cursor add node-rules backend-rules -d packages/backend/.cursor/rules
```

::: warning
将同一规则添加到多个位置需要**别名**：

```bash
ais cursor add auth-rules -d packages/frontend/.cursor/rules
ais cursor add auth-rules backend-auth -d packages/backend/.cursor/rules
```
:::

## 自定义源目录

覆盖 AIS 在仓库中查找规则的位置。

### CLI 参数（临时）

```bash
ais cursor rules add-all -s custom/rules
ais add-all -s cursor.rules=custom/rules -s cursor.commands=custom/cmds
```

### 全局配置（持久）

```bash
ais config repo set-source third-party cursor.rules custom/rules
ais config repo show third-party
ais config repo clear-source third-party cursor.rules
```

**优先级：** CLI 参数 > 全局配置 > 仓库配置 > 适配器默认值
