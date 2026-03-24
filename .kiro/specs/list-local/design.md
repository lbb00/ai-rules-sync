# Design: list-local

## Overview

Add a `--local` flag to `ais claude list` that scans project target directories for Claude files on disk, regardless of whether they are tracked in `ai-rules-sync.json`. This introduces Mode E to the existing multi-mode list architecture. Discovered entries are cross-referenced against the project config to indicate managed (`i`) vs local-only (`l`) status.

---

## 1. Interface Changes

### 1.1 ListOptions (src/commands/list.ts)

Add `local` to the existing options interface.

```typescript
export interface ListOptions {
  type?: string;
  user?: boolean;
  repo?: boolean;
  quiet?: boolean;
  local?: boolean;  // NEW: scan project target dirs on disk
}
```

**Traces**: Requirement 1

### 1.2 ListEntry Status Union (src/commands/list.ts)

No change to the status union type. The `--local` mode reuses existing status values:
- `i` = entry exists on disk AND in project config (installed/managed)
- `l` = entry exists on disk but NOT in any config (local-only/unmanaged)

These are the same semantics already used in Mode A/B. No new status character is needed.

```typescript
export interface ListEntry {
  subtype: string;
  name: string;
  status?: 'i' | 'a' | 'l';  // UNCHANGED
}
```

**Traces**: Requirements 3, 8

---

## 2. Extracted Scanner Function

### 2.1 scanAdapterTargetDir (src/commands/import-all.ts)

Extract the pure filesystem scanning logic from `discoverProjectEntriesForAdapter()` into a standalone function with no `RepoConfig` dependency. This function handles:
- Target directory resolution (project vs user)
- Directory reading with ENOENT tolerance
- Hidden file filtering (`.` prefix)
- Symlink exclusion via `lstat()`
- Mode-aware entry matching (file/directory/hybrid with suffix filtering)

**Signature**:

```typescript
export interface ScannedEntry {
  sourceName: string;   // filename or dirname on disk
  entryName: string;    // normalized name (suffix stripped for file/hybrid modes)
  isDirectory: boolean;
  suffix?: string;      // matched suffix, if applicable
}

export async function scanAdapterTargetDir(
  adapter: SyncAdapter,
  projectPath: string,
  isUser: boolean
): Promise<ScannedEntry[]>
```

**Return**: Array of `ScannedEntry` objects representing filesystem entries that match the adapter's mode and suffix configuration.

**Behavior**:
1. Resolve `scanDir` = `path.join(path.resolve(projectPath), isUser ? (adapter.userTargetDir ?? adapter.targetDir) : adapter.targetDir)`
2. If `scanDir` does not exist, return `[]`
3. Read directory contents, filter out names starting with `.`
4. For each remaining item, `lstat()` it; skip symlinks
5. Apply mode dispatch:
   - `file`: skip directories; match against `adapter.fileSuffixes`; strip matched suffix for `entryName`
   - `directory`: skip non-directories
   - `hybrid`: include directories (entryName = sourceName); for files, match against `adapter.hybridFileSuffixes` and strip suffix

**Traces**: Requirements 4, 5, 9

### 2.2 Refactor discoverProjectEntriesForAdapter

After extracting `scanAdapterTargetDir`, refactor `discoverProjectEntriesForAdapter` to call it internally, then layer on the `alreadyInRepo` check for each scanned entry. This eliminates the duplicated scanning logic while preserving the existing function's contract and return type (`DiscoveredProjectEntry[]`).

```typescript
export async function discoverProjectEntriesForAdapter(
  adapter: SyncAdapter,
  repo: RepoConfig,
  projectPath: string,
  isUser: boolean
): Promise<DiscoveredProjectEntry[]> {
  const scanned = await scanAdapterTargetDir(adapter, projectPath, isUser);

  // Build repo source path for alreadyInRepo checks
  const repoDir = repo.path;
  const repoConfig = await getRepoSourceConfig(repoDir);
  const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
  const repoSourcePath = path.join(repoDir, sourceDir);
  const scanDir = path.join(
    path.resolve(projectPath),
    isUser ? (adapter.userTargetDir ?? adapter.targetDir) : adapter.targetDir
  );

  return Promise.all(scanned.map(async (entry) => ({
    adapter,
    sourceName: entry.sourceName,
    entryName: entry.entryName,
    sourcePath: path.join(scanDir, entry.sourceName),
    isDirectory: entry.isDirectory,
    suffix: entry.suffix,
    alreadyInRepo: await fs.pathExists(path.join(repoSourcePath, entry.sourceName)),
  })));
}
```

**Traces**: Requirement 9

---

## 3. Mode E Handler (src/commands/list.ts)

### 3.1 handleModeE Function

New private function in `list.ts` that implements the `--local` scan.

**Signature**:

```typescript
async function handleModeE(
  adapters: SyncAdapter[],
  projectPath: string,
  isUser: boolean
): Promise<ListResult>
```

**Algorithm**:

1. Load the config to cross-reference against:
   - If `isUser`: call `getUserProjectConfig()`
   - Else: call `getCombinedProjectConfig(projectPath)`
2. For each adapter in `adapters`:
   a. Call `scanAdapterTargetDir(adapter, projectPath, isUser)`
   b. For each scanned entry, look up `config[adapter.tool][adapter.subtype][entry.entryName]`
   c. If found in config: status = `'i'`; otherwise status = `'l'`
   d. Push `{ subtype: adapter.subtype, name: entry.entryName, status }` to entries array
3. Return `{ entries, totalCount: entries.length, subtypeCount: computeSubtypeCount(entries) }`

**Traces**: Requirements 1, 2, 3

### 3.2 Dispatch Integration in handleClaudeList

Add Mode E dispatch to `handleClaudeList` before the existing mode checks. The mutual exclusivity check with `--repo` goes first.

```typescript
// Mutual exclusivity: --local + --repo
if (options.local && options.repo) {
  throw new Error('--local and --repo are mutually exclusive. Use --local to scan project files on disk, or --repo to list entries in the rules repository.');
}

// Mode E: --local (with or without --user)
if (options.local) {
  return handleModeE(adapters, projectPath, options.user ?? false);
}

// ... existing Mode D, C, B, A dispatch
```

**Traces**: Requirements 1, 7

---

## 4. CLI Registration (src/index.ts)

### 4.1 Add --local Option

Add the `-l, --local` option to the `claude list` command registration.

```typescript
claude
  .command('list [type]')
  .description('List installed or available Claude entries across all subtypes')
  .option('-r, --repo', 'List entries available in the rules repository source directories')
  .option('-u, --user', 'List entries from user config (~/.config/ai-rules-sync/user.json)')
  .option('-l, --local', 'Scan project directory for Claude files on disk')  // NEW
  .option('--quiet', 'Output entry names only, one per line')
  .action(async (type, cmdOptions) => {
    // ... cmdOptions type updated to include local?: boolean
    const listOptions: ListOptions = {
      type,
      repo: cmdOptions.repo,
      user: cmdOptions.user,
      local: cmdOptions.local,  // NEW
      quiet: cmdOptions.quiet,
    };
    // ...
  });
```

**Traces**: Requirement 1

### 4.2 Update printListResult Legend and Source Label

Update the `source` label logic and legend to account for `--local`.

**STATUS_MARKERS**: No change needed. The `--local` mode uses `i` and `l`, which already have markers (`green` and `magenta` respectively).

**Source label**: Add a branch for `--local`:

```typescript
const source = options.local
  ? options.user ? 'disk [--user]' : 'disk [--local]'
  : options.repo
    ? options.user ? '--repo [--user]' : '--repo'
    : options.user ? 'local [--user]' : 'local';
```

**Legend string**: Unchanged. The `i=installed`, `a=available`, `l=local-only` legend already covers the status values used by Mode E. The `a=available` marker is simply not used in Mode E output, which is consistent with how Mode A/B also do not produce `a` status entries.

**Traces**: Requirement 6

---

## 5. Flag Interaction Matrix

| Flags | Mode | Data Source | Config Cross-Ref | Status Values |
|-------|------|------------|-----------------|---------------|
| `--local` | E | Project target dirs on disk | `ai-rules-sync.json` + `.local.json` | `i`, `l` |
| `--local --user` | E | User target dirs on disk | `user.json` | `i`, `l` |
| `--local --repo` | ERROR | -- | -- | -- |
| `--local <type>` | E (filtered) | Single adapter target dir | Same as above | `i`, `l` |
| `--local --quiet` | E (quiet) | Same as `--local` | Same | names only |

**Traces**: Requirements 2, 6, 7

---

## 6. File Modification Summary

| File | Change | Scope |
|------|--------|-------|
| `src/commands/import-all.ts` | Extract `scanAdapterTargetDir()` + `ScannedEntry` interface; refactor `discoverProjectEntriesForAdapter()` to call it | Refactor |
| `src/commands/list.ts` | Add `local` to `ListOptions`; add `handleModeE()`; add mutual exclusivity guard and Mode E dispatch in `handleClaudeList()` | Feature |
| `src/index.ts` | Add `-l, --local` option to `claude list`; pass `local` to `ListOptions`; update `source` label in `printListResult()` | CLI |
| `src/__tests__/claude-list.test.ts` | Add Mode E describe block with tests for: all-subtype scan, type-filtered scan, status cross-reference, quiet mode, `--local --repo` error | Tests |
| `src/__tests__/import-all.test.ts` | Add tests for `scanAdapterTargetDir()` covering hidden files, symlinks, mode filtering; verify `discoverProjectEntriesForAdapter()` still passes existing tests | Tests |

**Traces**: Requirement 10

---

## 7. Test Strategy

### 7.1 New Tests for scanAdapterTargetDir (import-all.test.ts)

Mock `fs-extra` (`pathExists`, `readdir`, `lstat`) to simulate:
- Directory with mixed files, directories, hidden entries, and symlinks
- File-mode adapter with `fileSuffixes` filtering
- Directory-mode adapter with non-directory exclusion
- Hybrid-mode adapter with `hybridFileSuffixes`
- Non-existent target directory returning `[]`

### 7.2 New Tests for Mode E (claude-list.test.ts)

Add a `describe('Mode E: --local flag')` block. Mock `scanAdapterTargetDir` (imported from `import-all.js`) along with existing project-config mocks.

Test cases:
1. Local scan returns entries across all subtypes with correct status
2. Type-filtered local scan returns only matching subtype
3. Entry in config gets status `i`; entry not in config gets status `l`
4. `--local --repo` throws mutual exclusivity error
5. `--local --user` calls `getUserProjectConfig()` instead of `getCombinedProjectConfig()`
6. `--local --quiet` (verified at CLI layer or integration; Mode E returns standard `ListResult`)
7. Empty target directories return `totalCount: 0` without error

### 7.3 Regression Tests

Verify `discoverProjectEntriesForAdapter()` passes all existing `import-all.test.ts` tests unchanged after the refactor.

**Traces**: Requirement 10
