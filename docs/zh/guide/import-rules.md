# 导入规则

将项目中已有的规则导入到仓库，使其可以在项目和团队间共享。

`import` 命令会将条目复制到仓库并提交，然后用软链接替换原文件。

```bash
# 从项目导入规则到仓库
ais cursor rules import my-custom-rule

# 自定义提交信息
ais cursor rules import my-rule -m "Add custom rule"

# 导入并推送到远程
ais cursor rules import my-rule --push

# 强制覆盖
ais cursor rules import my-rule --force

# 预览
ais cursor rules import my-rule --dry-run
```

## 工作流程

1. 你的项目中有一个规则文件（例如 `.cursor/rules/my-custom-rule.mdc`）
2. 运行 `ais cursor rules import my-custom-rule`
3. AIS 将文件复制到当前仓库
4. 在仓库中创建 git 提交
5. 用指向仓库副本的软链接替换原文件
6. 将依赖保存到 [`ai-rules-sync.json`](/zh/reference/configuration)

现在规则存储在仓库中，可以通过 `ais cursor add my-custom-rule` 共享到其他项目。
