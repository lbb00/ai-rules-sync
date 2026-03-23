# 用户全局级别同步

将规则同步到用户主目录（`$HOME`）。依赖关系记录在 `~/.config/ai-rules-sync/user.json` 中，适用于机器上的**所有项目**。

```
规则仓库                              用户主目录 (~/)
├── .claude/CLAUDE.md          ──→   ~/.claude/CLAUDE.md      (符号链接)
├── .gemini/GEMINI.md          ──→   ~/.gemini/GEMINI.md      (符号链接)
├── .codex/AGENTS.md           ──→   ~/.codex/AGENTS.md       (符号链接)
└── .cursor/rules/my-style.mdc ──→   ~/.cursor/rules/my-style (符号链接)
```

**主要特征：**
- **范围：** 用户主目录（`$HOME`）
- **配置文件：** `~/.config/ai-rules-sync/user.json`
- **典型用途：** 个人 AI 配置（CLAUDE.md、GEMINI.md、AGENTS.md）、跨项目编码风格
- **Gitignore：** 自动跳过（主目录不是 git 仓库）
- **命令：** 在任何 add/remove/install 命令后加 `--user` 或 `-u`

```bash
# 添加个人 CLAUDE.md
ais claude md add CLAUDE --user

# 添加个人 Gemini 配置
ais gemini md add GEMINI --user

# 添加个人 Codex 配置
ais codex md add AGENTS --user

# 添加用户级别 cursor 规则（适用于所有项目）
ais cursor add my-style --user

# 安装所有用户条目（适合新机器设置）
ais user install
```

## 与项目级别对比

| | 项目级别 | 用户全局级别 |
|---|---|---|
| **范围** | 单个项目目录 | `$HOME`（所有项目） |
| **标志** | （默认） | `--user` / `-u` |
| **配置文件** | [`ai-rules-sync.json`](/zh/reference/configuration) | `~/.config/ai-rules-sync/user.json` |
| **通过 Git 共享** | ✅ 是 | ❌ 否（个人） |
| **管理 Gitignore** | ✅ 是 | ❌ 跳过 |
| **典型内容** | 团队规则、项目规范 | 个人 CLAUDE.md、GEMINI.md、编码风格 |
| **恢复命令** | `ais install` | `ais user install` |

## 多机器工作流

将用户级别同步与个人规则仓库结合，保持 AI 配置在多台机器间一致：

```bash
# 机器 A：初始设置
ais use git@github.com:me/my-rules.git
ais claude md add CLAUDE --user
ais gemini md add GEMINI --user
ais cursor add my-style --user

# 机器 B：一条命令恢复
ais use git@github.com:me/my-rules.git
ais user install
# 完成！所有个人 AI 配置已恢复
```

## 自定义用户配置路径（Dotfiles 集成）

将 `user.json` 存储到 dotfiles 仓库，方便跨机器同步：

```bash
# 将用户配置指向 dotfiles
ais config user set ~/dotfiles/ai-rules-sync/user.json

# 查看当前路径
ais config user show

# 重置为默认
ais config user reset
```
