# 项目级别同步

将规则同步到特定项目目录。依赖关系记录在项目的 [`ai-rules-sync.json`](/zh/reference/configuration) 中，通过 Git 与团队共享。

```
规则仓库                              你的项目 (./your-project/)
├── .cursor/rules/react.mdc   ──→   .cursor/rules/react.mdc (符号链接)
├── .claude/skills/review/    ──→   .claude/skills/review/   (符号链接)
└── .github/instructions/     ──→   .github/instructions/    (符号链接)
```

**主要特征：**
- **范围：** 当前项目目录 (`cwd`)
- **配置文件：** `ai-rules-sync.json`（提交到 git）+ `ai-rules-sync.local.json`（私有）
- **典型用途：** 团队共享编码规范、项目特定规则
- **命令：** 所有命令默认为项目范围

```bash
cd your-project

# 为此项目添加规则
ais cursor add react -t https://github.com/org/rules.git

# 从 ai-rules-sync.json 安装所有规则
ais install
```

## 配置文件

### [`ai-rules-sync.json`](/zh/reference/configuration)（提交到 git）

```json
{
  "cursor": {
    "rules": {
      "react": "https://github.com/org/rules.git"
    }
  }
}
```

### `ai-rules-sync.local.json`（不提交）

用于不应共享的私有规则：

```json
{
  "cursor": {
    "rules": {
      "company-secrets": "https://github.com/company/private-rules.git"
    }
  }
}
```

## 完整工作流示例

从创建规则到团队共享的完整流程：

```bash
# 1. 在仓库中创建规则
cd ~/my-rules-repo
echo "# React rules" > .cursor/rules/react.mdc
git add . && git commit -m "Add react rule"
git push

# 2. 添加到项目
cd your-project
ais cursor add react -t https://github.com/you/my-rules-repo.git

# 3. 提交配置（ai-rules-sync.json）供团队使用
git add ai-rules-sync.json && git commit -m "Add react rule via AIS"
git push

# 4. 队友克隆后执行
git clone https://github.com/team/project.git && cd project
ais install
```
