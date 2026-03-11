# 快速开始

## 安装

### 通过 npm（推荐）

```bash
npm install -g ai-rules-sync
```

### 通过 Homebrew（macOS）

```bash
brew tap lbb00/ai-rules-sync https://github.com/lbb00/ai-rules-sync
brew install ais
```

或不使用 tap 的一次性安装：

```bash
brew install --formula https://raw.githubusercontent.com/lbb00/ai-rules-sync/main/Formula/ais.rb
```

### 验证安装

```bash
ais --version
```

### 启用 Tab 补全（可选）

```bash
ais completion install
```

## 快速上手

### 场景 1：使用现有规则

你有一个规则仓库，想在项目中使用其规则。

```bash
# 1. 进入你的项目
cd your-project

# 2. 添加规则（第一次需要指定仓库 URL）
ais cursor add react -t https://github.com/your-org/rules-repo.git

# 完成！规则现在已链接到你的项目
```

发生了什么：
- AIS 将仓库克隆到 `~/.config/ai-rules-sync/repos/`
- 设置其为当前仓库
- 创建软链接：`rules-repo/.cursor/rules/react` → `your-project/.cursor/rules/react`
- 保存配置到 [`ai-rules-sync.json`](/zh/reference/configuration)

之后可以省略 `-t` 标志：

```bash
ais cursor add vue
ais cursor add testing
```

### 场景 2：分享你的现有规则

你在项目中有规则，想通过仓库分享。

```bash
# 1. 创建规则仓库
mkdir ~/my-rules-repo && cd ~/my-rules-repo
git init
ais init
ais use .

# 2. 导入你的现有规则
cd your-project
ais cursor rules import my-custom-rule

# 完成！
```

### 场景 3：加入团队项目

克隆一个已使用 AIS 的项目：

```bash
git clone https://github.com/team/project.git
cd project
ais install
# 所有规则已设置完毕！
```
