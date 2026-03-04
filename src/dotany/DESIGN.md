# Dotfile 抽象层设计文档

## 一、背景与动机

### 问题：硬编码蔓延

在引入这一层之前，ai-rules-sync 的核心逻辑分散在几个文件中，并且对具体工具（cursor、copilot、claude 等）存在大量硬编码：

```
project-config.ts  — 44 行 REPO_SOURCE_PATHS 常量列出所有 tool/subtype 组合
                   — mergeCombined() 每个工具各写一遍展开逻辑（约 50 行）
                   — ProjectConfig / SourceDirConfig / RepoSourceConfig 接口各写一遍
commands/helpers.ts — DefaultMode 联合类型硬编码所有工具名
                   — inferDefaultMode() 对每个工具手动累加 count
                   — requireExplicitMode() 手写工具列表字符串
```

每新增一个工具（如 windsurf、cline），需要在 **8 个不同位置** 同步修改，漏掉任何一处都会导致 bug。

### 目标

1. **提取通用能力**：将 symlink 创建、manifest 读写、ignore 文件管理提炼为与工具无关的库。
2. **消除硬编码**：所有工具列表改为从 adapter registry 动态生成。
3. **统一抽象**：新增工具只需「创建 adapter 文件 + 注册」两步，其他文件零修改。
4. **为提取 npm 包铺路**：`src/dotany/` 在结构稳定后可直接提取为独立包。

---

## 二、对标分析

| 特性 | GNU Stow | chezmoi | yadm | 本库 |
|------|----------|---------|------|------|
| 链接方式 | symlink | 文件拷贝 | git 直接管理 | **symlink-only** |
| 状态追踪 | 无 | SHA256 manifest | git history | **可插拔 ManifestStore** |
| 多 source | ✗ | ✗ | ✗ | **✓（SourceResolver 接口）** |
| 扩展性 | ✗ | ✗ | ✗ | **Plugin 架构** |
| Stow 模式 | ✓ | ✗ | ✗ | **✓（不传 manifest）** |
| Manifest 模式 | ✗ | ✓ | 间接 | **✓（传入 manifest）** |
| 多 repo 支持 | ✗ | ✗ | ✗ | **✓（RepoResolverFn）** |
| Library-first | ✗ | ✗ | ✗ | **✓** |

**核心差异化**：同一套 API 同时支持 Stow 模式（目录即真相）和 Manifest 模式（声明式追踪），通过 `manifest` 参数是否传入来区分，调用方无需感知底层差异。

---

## 三、模块结构

```
src/
├── dotfile/                         ← 通用 dotfile 库（与 ai-rules-sync 业务无关）
│   ├── types.ts                     ← 所有核心接口与类型
│   ├── manager.ts                   ← DotfileManager 类（唯一实现，通过 linkany 执行 symlink）
│   ├── composer.ts                  ← DotfileComposer（多 manager 组合）
│   ├── sources/
│   │   ├── filesystem.ts            ← FileSystemSource（本地目录 SourceResolver）
│   │   └── git.ts                   ← GitSource（git 仓库 SourceResolver，自动 clone/pull）
│   ├── manifest/
│   │   └── json.ts                  ← JsonManifest（通用 JSON ManifestStore）
│   └── index.ts                     ← 主入口：dotfile.create() / dotfile.compose()
│
├── plugin/                          ← ai-rules-sync 的 dotfile 插件实现
│   ├── git-repo-source.ts           ← GitRepoSource（SourceResolver 的 git 仓库实现）
│   └── ai-rules-sync-manifest.ts   ← AiRulesSyncManifest（ManifestStore 的 json 实现）
│
└── adapters/
    ├── base.ts                      ← createBaseAdapter() 使用 dotfile.create()
    └── types.ts                     ← SyncAdapter 接口含 forProject() 方法
```

---

## 四、核心接口设计

### 4.1 两个可插拔接口

设计的核心是两个接口，让 `DotfileManager` 与具体存储/来源解耦：

```typescript
// 来源解析：「这个名字对应的文件在哪里？」
interface SourceResolver {
    resolve(name: string, config: ResolveConfig): Promise<ResolvedSource>;
    resolveFromManifest?(entry: ManifestEntry): Promise<ResolvedSource>; // apply() 专用
    list?(config: ResolveConfig): Promise<string[]>;                     // stow() 专用
    destinationPath?(name: string): Promise<string>;                     // import() 专用
}

// Manifest 持久化：「哪些文件已经被纳管？」
interface ManifestStore {
    readAll(): Promise<Record<string, ManifestEntry>>;
    write(key: string, value: ManifestEntry): Promise<void>;
    delete(key: string): Promise<void>;
}
```

**为什么是两个接口而不是一个？**

来源解析（从哪来）和状态追踪（管了哪些）是正交的关注点：
- GNU Stow：有来源解析（目录扫描），无 manifest
- chezmoi：有 manifest，来源是固定目录
- 本库：两者都可以有，也可以只有其中一个

### 4.2 ManifestEntry 的 meta 字段

```typescript
interface ManifestEntry {
    sourceName: string;             // 在源仓库中的原始名称
    meta?: Record<string, unknown>; // 插件自定义元数据
}
```

`meta` 是开放的 `Record<string, unknown>`，不在通用库层面规定具体字段。ai-rules-sync 插件使用它存储：
- `repoUrl`：源仓库 URL（用于 apply() 时按条目重新定位仓库）
- `targetDir`：覆盖默认目标目录
- `alias`：目标文件名与源名不同时的别名

### 4.3 RepoResolverFn：多 repo 动态解析

```typescript
// 定义在 dotfile/types.ts — 返回 any 避免与 ai-rules-sync 的 RepoConfig 耦合
type RepoResolverFn = (repoUrl: string, entryName: string) => Promise<any>;
```

`GitRepoSource` 构造函数接受 `RepoConfig | RepoResolverFn | null`：

| 传入值 | 适用场景 |
|--------|---------|
| `RepoConfig` | 静态单仓库（add/import 时已知 repo） |
| `RepoResolverFn` | 动态多仓库（install 时按 manifest 条目动态 find/clone） |
| `null` | 仅删除操作（remove 不需要解析 source） |

### 4.4 DotfileCreateOptions 中的 resolveTargetName

```typescript
interface DotfileCreateOptions {
    // ...
    resolveTargetName?: (name: string, alias?: string, sourceSuffix?: string) => string;
}
```

这个可选 hook 解决了「suffix 感知重命名」问题：

**场景**：copilot instructions 文件在仓库中叫 `my-rule.instructions.md`，用户用别名 `my-rule` 引用它。如果直接用 `alias || resolved.name`，目标文件名会是 `my-rule`（丢失 suffix）。

**解决**：`createSuffixAwareTargetResolver` 检查 alias 是否已有 suffix，没有则自动追加 source suffix：

```typescript
// base.ts 中
const resolver = createSuffixAwareTargetResolver(['.instructions.md', '.md']);
// 调用：resolver('my-rule', undefined, '.instructions.md') → 'my-rule.instructions.md'
```

---

## 五、DotfileManager 完整 API

```typescript
class DotfileManager {
    // ── 单文件操作 ──────────────────────────────────────────────────
    add(name, options?): Promise<LinkResult>
    // 创建 symlink；若有 manifest，同时写入 manifest。等价于 chezmoi add。

    remove(alias): Promise<void>
    // 删除 symlink；若有 manifest，同时从 manifest 删除。

    import(targetFilePath, name, options?): Promise<LinkResult>
    // 将项目中已有的文件纳管：copy → remove original → symlink。
    // 需要 source.destinationPath()；纯 fs 操作，不含 git 逻辑。

    // ── 批量操作 ────────────────────────────────────────────────────
    apply(): Promise<ApplyResult>
    // 幂等地重建所有 manifest 条目对应的 symlink。需要 manifest。
    // 等价于 chezmoi apply。

    stow(): Promise<StowResult>
    // 将 source 目录下所有文件 symlink 到 targetDir。需要 source.list()。
    // 等价于 GNU Stow。

    unstow(): Promise<void>
    // 移除所有 stowed symlink。有 manifest 则按 manifest，否则按 source.list()。

    restow(): Promise<StowResult>
    // unstow() + stow()，用于更新 source 目录后刷新所有 symlink。

    // ── 只读查询 ────────────────────────────────────────────────────
    diff(): Promise<DiffResult>
    // 预览 apply() 会做什么，不执行任何写操作。需要 manifest。

    status(): Promise<StatusResult>
    // 返回每个 manifest 条目当前的 symlink 状态（linked/missing/conflict）。

    readManifest(): Promise<Record<string, ManifestEntry>>
    // 读取所有 manifest 条目（无 manifest 时返回 {}）。
}
```

### 操作矩阵

| 操作 | 需要 source | 需要 manifest | 需要 source.list() | 需要 source.destinationPath() |
|------|------------|--------------|-------------------|------------------------------|
| add  | ✓ | 可选（有则写） | ✗ | ✗ |
| remove | ✗ | 可选（有则删） | ✗ | ✗ |
| import | ✓ | 可选（有则写） | ✗ | ✓ |
| apply | ✓ | ✓ | ✗ | ✗ |
| stow | ✓ | 可选（有则写） | ✓ | ✗ |
| unstow | ✓/manifest 二选一 | 可选 | 可选 | ✗ |
| diff | ✓ | ✓ | ✗ | ✗ |
| status | ✗ | ✓ | ✗ | ✗ |

---

## 六、两种工作模式

### 6.1 Stow 模式（不传 manifest）

```typescript
const manager = dotfile.create({
    name: 'shell',
    source: new FileSystemSource('~/dotfiles/shell'),
    targetDir: '~/',
});

await manager.stow();
// → 将 ~/dotfiles/shell/ 下所有文件 symlink 到 ~/
// → ~/.zshrc → ~/dotfiles/shell/.zshrc

await manager.add('.vimrc');
// → 单独 add 一个文件（不写 manifest）
```

**用途**：简单的目录镜像，目录本身即真相，无需追踪状态。

### 6.2 Manifest 模式（传入 manifest）

```typescript
// 项目级：forProject() 自动组装 source + manifest
const manager = adapter.forProject(projectPath, repo, isLocal);

await manager.add('my-rule', { repoUrl: 'https://...' });
// → 创建 symlink + 写入 ai-rules-sync.json

await manager.apply();
// → 读取 ai-rules-sync.json → 幂等地重建所有 symlink

await manager.status();
// → [{ alias: 'my-rule', status: 'linked' }, ...]
```

**用途**：声明式管理，支持跨机器同步（`apply()` 基于 manifest 幂等重建）。

### 6.3 多 manager 组合（DotfileComposer）

```typescript
const composer = dotfile.compose([
    adapter.forProject(projectPath, repo1),
    adapter.forProject(projectPath, repo2),
]);

await composer.apply(); // 依次 apply，后者可覆盖前者
await composer.status(); // 汇总所有 manager 的状态
```

---

## 七、内置实现

### 7.1 FileSystemSource

本地目录 SourceResolver，GNU Stow 模式的基础：

```typescript
const source = new FileSystemSource('/home/user/dotfiles/shell');
// resolve('zshrc') → { name: 'zshrc', path: '/home/user/dotfiles/shell/zshrc' }
// list()           → ['zshrc', 'bashrc', 'vimrc', ...]
// destinationPath('zshrc') → '/home/user/dotfiles/shell/zshrc'
```

无任何 git 依赖，可独立于 ai-rules-sync 使用。

### 7.2 GitSource

git 仓库 SourceResolver，自动处理 clone/pull：

```typescript
const source = new GitSource(
    'https://github.com/user/dotfiles.git',
    '/home/user/.cache/my-tool/user-dotfiles',  // clone 到这里
    'nvim'                                        // 使用仓库内 nvim/ 子目录
);
// resolve('init.lua') → 先 clone/pull，再返回 /...clone.../nvim/init.lua
// list()             → 列出 /...clone.../nvim/ 下所有文件
```

无 ai-rules-sync 依赖，可独立使用。

### 7.3 JsonManifest

通用 JSON ManifestStore，支持可选的命名空间：

```typescript
// 扁平结构（无 namespace）
const m1 = new JsonManifest('/path/to/manifest.json');

// 命名空间结构（多工具共用一个文件）
const m2 = new JsonManifest('/path/to/manifest.json', 'cursor-rules');
// 文件结构：{ "cursor-rules": { "my-rule": { sourceName: "...", meta: {} } } }
```

不绑定任何 ai-rules-sync 业务格式，可独立使用。

---

## 八、plugin 实现说明（ai-rules-sync 专用）

### GitRepoSource

负责「从 git 仓库解析出源文件路径」，支持三种构造方式：

```typescript
// 1. 静态单仓库（add/import 时）
new GitRepoSource(repoConfig, adapterConfig)

// 2. 动态多仓库（install 的 apply() 时）
new GitRepoSource(
    (repoUrl, entryName) => findOrCreateRepo(repos, repoUrl, entryName),
    adapterConfig
)

// 3. 仅删除模式（remove 时不需要 source）
new GitRepoSource(null, adapterConfig)
```

关键方法：
- `resolve(name, config)` — `add()` 时调用，使用 `config.repoUrl` 或静态 repo
- `resolveFromManifest(entry)` — `apply()` 时调用，从 `entry.meta.repoUrl` 动态找仓库
- `destinationPath(name)` — `import()` 时调用，返回仓库中的目标路径

### AiRulesSyncManifest

负责「将 ai-rules-sync.json 适配为通用 ManifestStore 接口」：

**readAll()** 将 JSON 格式翻译为 `ManifestEntry`：
```json
// ai-rules-sync.json 中
{ "cursor": { "rules": { "my-rule": "https://..." } } }

// 翻译为 ManifestEntry
{ "my-rule": { "sourceName": "my-rule", "meta": { "repoUrl": "https://..." } } }
```

**write() / delete()** 委托给 `addDependencyGeneric` / `removeDependencyGeneric`，复用现有的 JSON 读写和迁移逻辑。

---

## 九、关键设计决策

### 决策 A：link() 用于 user 模式，project 模式用 forProject().add()

Phase 2 中命令流统一到 `forProject()` API：

```
# project 模式
ais cursor add my-rule
  → adapter.forProject(projectPath, repo, isLocal).add(name, opts)
  // 一步完成：symlink + 写 ai-rules-sync.json

# user 模式（user.json 不走 forProject 的 manifest）
ais cursor add my-rule --user
  → adapter.link(...)           // 只创建 symlink
  → addUserDependency(...)      // 单独写 user.json

# install（重建 symlink）
ais cursor install
  → adapter.forProject(projectPath, repoResolver).apply()
  // 读 manifest → 按条目动态 find/clone repo → 幂等重建 symlink

# remove
ais cursor remove my-rule
  → adapter.forProject(projectPath, null).remove(alias)
  // null 表示无需 source（remove 不需要解析来源）
  // 一步完成：删 symlink + 从 manifest 删除
  // ignore 条目清理由 handlers.ts 负责（ai-rules-sync 专有逻辑）
```

### 决策 B：import 中 fs 与 git 分离

`manager.import()` 只做文件系统操作，git 操作留在 `sync-engine.ts`：

```typescript
// sync-engine.ts importEntry()
const manager = adapter.forProject(projectPath, repo, isLocal);
await manager.import(targetPath, name, { force, repoUrl: repo.url });
// manager.import() 完成：copy → remove original → symlink

// git 操作保留在 sync-engine（ai-rules-sync 专有逻辑）
await execa('git', ['add', relativePath], { cwd: repoDir });
await execa('git', ['commit', '-m', message], { cwd: repoDir });
```

**权衡**：相比原来「copy → git commit → remove → symlink」的顺序，新顺序是「copy → remove → symlink → git commit」。若 git 失败，symlink 已建立，但 commit 未完成。这简化了实现，且 dotfile 库本身不应感知 git 概念。

### 决策 C：避免循环依赖

**问题**：如果 `project-config.ts` 的 `mergeCombined()` 从 `adapters/index.ts` 读取 registry，会形成循环：

```
project-config.ts → adapters/index.ts → adapters/base.ts → project-config.ts
```

**解决**：`mergeCombined()` 不依赖 registry，改为对两个 config 对象的键做动态迭代：

```typescript
// 不需要知道有哪些 tool，直接合并两个对象中实际存在的键
function mergeCombined(main, local) {
    const allKeys = new Set([...Object.keys(main), ...Object.keys(local)]);
    for (const key of allKeys) {
        // agentsMd：flat merge
        // 其他 tool：按 subtype 两层 merge
    }
}
```

`helpers.ts` 可以安全地导入 `adapterRegistry`（单向依赖：commands → adapters）。

### 决策 D：RepoSourceConfig 使用 any 索引

```typescript
interface RepoSourceConfig {
    rootPath?: string;
    [tool: string]: any; // 而非 Record<string, string> | string | undefined
}
```

严格类型（`Record<string, string> | string | undefined`）会让 `repoConfig.windsurf?.rules` 这样的访问报 TS 错误，因为 TypeScript 无法静态判断 `windsurf` 是 Record 还是 string。

使用 `any` 牺牲了部分类型安全，但保留了直观的点语法访问，且测试文件中已有具体的值断言来保证正确性。

### 决策 F：所有 symlink 操作通过 linkany 执行

`manager.ts` 不再直接调用 `fs.ensureSymlink` / `fs.remove`，而是通过两个私有 helper 委托给 `linkany`：

```typescript
// doLink(source, target) → 'linked' | 'noop' | 'conflict'
// 内部调用 linkany.add({ version: 1, installs: [] }, { source, target, atomic: true })
// 传入 in-memory manifest 对象（非文件路径）→ 获得原子 symlink，无需持久化

// doUnlink(target) → boolean
// 只删除 symlink，不删真实文件
await fs.unlink(target); // 而非 fs.remove（后者会删真实文件）
```

**为什么用 in-memory manifest？**

`linkany.add()` 的第一个参数既接受文件路径字符串，也接受 manifest 对象。传入对象时，linkany 跳过文件读写但仍执行真实的 symlink 操作，获得原子性保证而无需引入额外的持久化文件。

**re-link 处理**：linkany 遇到 target 已是指向不同 source 的 symlink 时，会拒绝操作（返回错误 "Refusing to migrate"）。`doLink` 在调用 linkany 前检测这种情况并先 `fs.unlink`，由此实现安全的 re-link。

**结果映射**：
| `result.changes` 包含 `symlink` 或 `move` action | → `'linked'`（实际创建/更新） |
|---|---|
| changes 为空（target 已正确指向 source） | → `'noop'` |
| target 存在且不是 symlink | → `'conflict'`（提前返回，不调用 linkany） |

### 决策 E：sync-engine.ts 保留为薄包装层

`linkEntry()` 和 `unlinkEntry()` 继续作为导出函数存在（向后兼容）：
- `unlinkEntry()` 仍被 `adapter.unlink()` 使用（从 project config 读取 targetDir）
- `linkEntry()` 保留为兼容导出，不再被 `adapter.link()` 调用
- `importEntry()` 现在按 `adapter.forProject` 是否存在走不同路径，优先使用新 API

---

## 十、新增工具的流程对比

### 之前（8 步）

1. 创建 `src/adapters/<tool>-<subtype>.ts`
2. 在 `src/adapters/index.ts` 注册
3. 在 `project-config.ts` 的 `REPO_SOURCE_PATHS` 追加条目
4. 在 `SourceDirConfig` 接口追加字段
5. 在 `ProjectConfig` 接口追加字段
6. 在 `RepoSourceConfig` 接口追加字段
7. 在 `mergeCombined()` 追加合并逻辑
8. 在 `commands/helpers.ts` 的 `DefaultMode` 联合类型和 `inferDefaultMode()` 追加

### 之后（2 步）

1. 创建 `src/adapters/<tool>-<subtype>.ts`
2. 在 `src/adapters/index.ts` 注册

其他所有文件自动感知新工具。

---

## 十一、未来演进方向

### 提取为 npm 包

`src/dotany/` 核心模块（`types.ts`、`manager.ts`、`composer.ts`、`sources/`、`manifest/`、`index.ts`）仅依赖 `fs-extra`、`chalk`、`path`、`linkany`，完全不依赖 ai-rules-sync 业务逻辑。结构稳定后可直接发布为 `@ai-rules-sync/dotfile` 或独立的 `dotfile-manager`（需将 `linkany` 作为 peer/direct dependency 一并发布）。

### diff/status CLI

```bash
ais cursor diff     # 预览 install 会做什么，不执行
ais cursor status   # 查看所有 cursor rules 的 symlink 状态
```
