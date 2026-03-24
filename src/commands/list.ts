import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { readdir } from 'node:fs/promises';
import { SyncAdapter } from '../adapters/types.js';
import { getCombinedProjectConfig, getRepoSourceConfig, getSourceDir } from '../project-config.js';
import { getUserProjectConfig } from '../config.js';
import { scanAdapterTargetDir } from './import-all.js';

/**
 * Options for the list command
 */
export interface ListOptions {
  /** Filter to a single Claude subtype, e.g. 'rules', 'settings'. undefined = all subtypes. */
  type?: string;
  /** When true, list from user config (user.json) instead of project config */
  user?: boolean;
  /** When true, enumerate repo source directories instead of installed config */
  repo?: boolean;
  /** When true, output entry names only, one per line (no decoration) */
  quiet?: boolean;
  /** When true, scan project target dirs on disk for Claude files */
  local?: boolean;
  /** When true, show unified diff table combining local, repo, and user views */
  diff?: boolean;
}

/**
 * A single list entry representing an installed or available item
 */
export interface ListEntry {
  subtype: string;
  name: string;
  /**
   * i = installed (in repo + in config)
   * a = available (in repo, not installed)
   * l = local only (in config, not found in repo)
   */
  status?: 'i' | 'a' | 'l';
}

/**
 * Result of a list operation
 */
export interface ListResult {
  entries: ListEntry[];
  totalCount: number;
  subtypeCount: number;
}

/**
 * A single row in the unified diff table.
 * Maps to one unique (subtype, name) pair across all data sources.
 */
export interface DiffRow {
  subtype: string;
  name: string;
  local: 'l' | 'i' | '-';
  repo: 'a' | '-';
  user: 'i' | '-';
  repoUser: 'a' | '-';
}

/**
 * Result of a diff list operation.
 */
export interface DiffResult {
  rows: DiffRow[];
  totalCount: number;
  subtypeCount: number;
}

/**
 * Type guard to distinguish DiffResult from ListResult.
 */
export function isDiffResult(result: ListResult | DiffResult): result is DiffResult {
  return 'rows' in result;
}

/**
 * Read a directory and return its entries as a Set. Returns empty Set on ENOENT.
 */
async function readDirSet(dirPath: string): Promise<Set<string>> {
  try {
    return new Set(await readdir(dirPath));
  } catch (e: any) {
    if (e.code === 'ENOENT') return new Set();
    throw e;
  }
}

/**
 * Merge entries from local disk, repo, and user config into unified DiffRows.
 * Pure function: no I/O, no side effects.
 *
 * - Local status is taken from the entry's status value ('i' or 'l').
 * - Repo status is always 'a' (available) for any entry present in repo.
 * - User status is always 'i' (tracked) for any entry present in user config.
 * - Missing sources get '-'.
 */
export function mergeIntoDiffRows(
  localEntries: ListEntry[],
  repoEntries: ListEntry[],
  userEntries: ListEntry[],
  repoUserEntries: ListEntry[] = []
): DiffRow[] {
  const map = new Map<string, DiffRow>();

  function getOrCreate(subtype: string, name: string): DiffRow {
    const key = `${subtype}:${name}`;
    let row = map.get(key);
    if (!row) {
      row = { subtype, name, local: '-', repo: '-', user: '-', repoUser: '-' };
      map.set(key, row);
    }
    return row;
  }

  for (const entry of localEntries) {
    const row = getOrCreate(entry.subtype, entry.name);
    row.local = (entry.status === 'i' || entry.status === 'l') ? entry.status : 'l';
  }

  for (const entry of repoEntries) {
    const row = getOrCreate(entry.subtype, entry.name);
    row.repo = 'a';
  }

  for (const entry of userEntries) {
    const row = getOrCreate(entry.subtype, entry.name);
    row.user = 'i';
  }

  for (const entry of repoUserEntries) {
    const row = getOrCreate(entry.subtype, entry.name);
    row.repoUser = 'a';
  }

  return Array.from(map.values());
}

/**
 * Extract entries from a config object for the given adapter subtypes.
 * Returns ListEntry[] grouped naturally.
 */
function extractConfigEntries(
  config: Record<string, any>,
  adapters: SyncAdapter[]
): ListEntry[] {
  const entries: ListEntry[] = [];
  for (const adapter of adapters) {
    const subtypeConfig = config?.[adapter.tool]?.[adapter.subtype];
    if (subtypeConfig && typeof subtypeConfig === 'object') {
      for (const name of Object.keys(subtypeConfig)) {
        entries.push({ subtype: adapter.subtype, name });
      }
    }
  }
  return entries;
}

/**
 * Compute subtypeCount from entries
 */
function computeSubtypeCount(entries: ListEntry[]): number {
  return new Set(entries.map(e => e.subtype)).size;
}

/**
 * Handle the `ais claude list [type] [--repo] [--user]` command.
 *
 * Operates in four modes based on the flags:
 *   Mode A: no flags — installed entries from project config
 *   Mode B: --user only — installed entries from user config
 *   Mode C: --repo only — available entries in repo source dirs
 *   Mode D: --repo --user — available entries in repo user-source dirs
 */
export async function handleClaudeList(
  claudeAdapters: SyncAdapter[],
  projectPath: string,
  repoPath: string | undefined,
  options: ListOptions
): Promise<ListResult | DiffResult> {
  // Validate type argument if provided
  if (options.type !== undefined) {
    const validSubtypes = claudeAdapters.map(a => a.subtype);
    if (!validSubtypes.includes(options.type)) {
      throw new Error(
        `Invalid type "${options.type}". Valid types are: ${validSubtypes.join(', ')}`
      );
    }
  }

  // Apply type filter to adapters
  const adapters = options.type
    ? claudeAdapters.filter(a => a.subtype === options.type)
    : claudeAdapters;

  // Mutual exclusivity: --diff with --local, --repo, --user
  if (options.diff && (options.local || options.repo || options.user)) {
    throw new Error('--diff is mutually exclusive with --local, --repo, and --user');
  }

  // Mode Diff: --diff
  if (options.diff) {
    return handleModeDiff(adapters, projectPath, repoPath);
  }

  // Mutual exclusivity: --local + --repo
  if (options.local && options.repo) {
    throw new Error('--local and --repo are mutually exclusive. Use --local to scan project files on disk, or --repo to list entries in the rules repository.');
  }

  // Mode E: --local (with or without --user)
  if (options.local) {
    return handleModeE(adapters, projectPath, options.user ?? false);
  }

  // Mode D: --repo --user
  if (options.repo && options.user) {
    return handleModeD(adapters, repoPath, projectPath);
  }

  // Mode C: --repo only
  if (options.repo) {
    return handleModeC(adapters, repoPath!, projectPath);
  }

  // Mode B: --user only
  if (options.user) {
    return handleModeB(adapters, repoPath);
  }

  // Mode A: no flags (default)
  return handleModeA(adapters, projectPath, repoPath);
}

/**
 * Mode A: Read combined project config, extract entries per adapter subtype.
 * Cross-references repo source dirs to set status: 'i' (in repo) or 'l' (local only).
 * When repoPath is undefined, all entries are marked 'l'.
 */
async function handleModeA(adapters: SyncAdapter[], projectPath: string, repoPath: string | undefined): Promise<ListResult> {
  const config = await getCombinedProjectConfig(projectPath);
  const entries = extractConfigEntries(config, adapters);

  for (const adapter of adapters) {
    const adapterEntries = entries.filter(e => e.subtype === adapter.subtype);
    if (adapterEntries.length === 0) continue;

    let repoSet = new Set<string>();
    if (repoPath) {
      const repoConfig = await getRepoSourceConfig(repoPath);
      const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
      repoSet = await readDirSet(path.join(repoPath, sourceDir));
    }

    for (const entry of adapterEntries) {
      entry.status = repoSet.has(entry.name) ? 'i' : 'l';
    }
  }

  return {
    entries,
    totalCount: entries.length,
    subtypeCount: computeSubtypeCount(entries),
  };
}

/**
 * Mode B: Read user config, extract entries per adapter subtype.
 * Cross-references repo user source dirs (userDefaultSourceDir) to set status: 'i' or 'l'.
 * Adapters without userDefaultSourceDir use the regular sourceDir for cross-reference.
 * When repoPath is undefined, all entries are marked 'l'.
 */
async function handleModeB(adapters: SyncAdapter[], repoPath: string | undefined): Promise<ListResult> {
  const config = await getUserProjectConfig();
  const entries = extractConfigEntries(config as Record<string, any>, adapters);

  for (const adapter of adapters) {
    const adapterEntries = entries.filter(e => e.subtype === adapter.subtype);
    if (adapterEntries.length === 0) continue;

    let repoSet = new Set<string>();
    if (repoPath) {
      const sourceDir = adapter.userDefaultSourceDir ?? (() => {
        // Fall back to regular sourceDir when no user-specific dir is defined
        return adapter.defaultSourceDir;
      })();
      repoSet = await readDirSet(path.join(repoPath, sourceDir));
    }

    for (const entry of adapterEntries) {
      entry.status = repoSet.has(entry.name) ? 'i' : 'l';
    }
  }

  return {
    entries,
    totalCount: entries.length,
    subtypeCount: computeSubtypeCount(entries),
  };
}

/**
 * Mode C: Enumerate entries in repo source directories, cross-reference with project config.
 */
async function handleModeC(
  adapters: SyncAdapter[],
  repoPath: string,
  projectPath: string
): Promise<ListResult> {
  const entries: ListEntry[] = [];
  const projectConfig = await getCombinedProjectConfig(projectPath);

  // Verify that repoPath itself is accessible by attempting to read it
  try {
    await readdir(repoPath);
  } catch (err: any) {
    throw new Error(`Repository path is inaccessible: ${repoPath} (${err.message})`);
  }

  for (const adapter of adapters) {
    const repoConfig = await getRepoSourceConfig(repoPath);
    const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
    const sourceDirPath = path.join(repoPath, sourceDir);

    let names: string[];
    try {
      names = await readdir(sourceDirPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Adapter source directory doesn't exist: no entries for this adapter
        continue;
      }
      throw new Error(`Repository source directory is inaccessible: ${sourceDirPath} (${err.message})`);
    }

    const subtypeConfig = (projectConfig as any)?.[adapter.tool]?.[adapter.subtype] || {};
    for (const name of names) {
      entries.push({
        subtype: adapter.subtype,
        name,
        status: Object.prototype.hasOwnProperty.call(subtypeConfig, name) ? 'i' : 'a',
      });
    }
  }

  return {
    entries,
    totalCount: entries.length,
    subtypeCount: computeSubtypeCount(entries),
  };
}

/**
 * Mode D: Enumerate entries in repo user-source directories, cross-reference with user config.
 * Adapters without userDefaultSourceDir are skipped silently.
 */
async function handleModeD(
  adapters: SyncAdapter[],
  repoPath: string | undefined,
  _projectPath: string
): Promise<ListResult> {
  const entries: ListEntry[] = [];
  const userConfig = await getUserProjectConfig();

  for (const adapter of adapters) {
    // Skip adapters that don't define userDefaultSourceDir
    if (!adapter.userDefaultSourceDir) {
      continue;
    }

    const userSourceDirPath = path.join(repoPath || '', adapter.userDefaultSourceDir);

    let names: string[];
    try {
      names = await readdir(userSourceDirPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // Directory doesn't exist in repo: no user-sourced entries for this adapter
        continue;
      }
      throw err;
    }

    const subtypeConfig = (userConfig as any)?.[adapter.tool]?.[adapter.subtype] || {};
    for (const name of names) {
      entries.push({
        subtype: adapter.subtype,
        name,
        status: Object.prototype.hasOwnProperty.call(subtypeConfig, name) ? 'i' : 'a',
      });
    }
  }

  return {
    entries,
    totalCount: entries.length,
    subtypeCount: computeSubtypeCount(entries),
  };
}

/**
 * Mode E: Scan project target directories for Claude files on disk.
 * Cross-references with project config (or user config when --user) to assign status:
 *   'i' = entry exists on disk AND in config (managed)
 *   'l' = entry exists on disk but NOT in config (local-only)
 */
async function handleModeE(
  adapters: SyncAdapter[],
  projectPath: string,
  isUser: boolean
): Promise<ListResult> {
  const entries: ListEntry[] = [];

  // Load config for cross-referencing
  const config = isUser
    ? await getUserProjectConfig() as Record<string, any>
    : await getCombinedProjectConfig(projectPath);

  for (const adapter of adapters) {
    const scanned = await scanAdapterTargetDir(adapter, projectPath, isUser);

    const subtypeConfig = config?.[adapter.tool]?.[adapter.subtype];

    for (const entry of scanned) {
      const inConfig = subtypeConfig && typeof subtypeConfig === 'object'
        && Object.prototype.hasOwnProperty.call(subtypeConfig, entry.entryName);

      entries.push({
        subtype: adapter.subtype,
        name: entry.entryName,
        status: inConfig ? 'i' : 'l',
      });
    }
  }

  return {
    entries,
    totalCount: entries.length,
    subtypeCount: computeSubtypeCount(entries),
  };
}

/**
 * Mode Diff: Produce a unified table combining local disk, repo, and user config views.
 * Each unique (subtype, name) pair appears once with per-source status indicators.
 */
async function handleModeDiff(
  adapters: SyncAdapter[],
  projectPath: string,
  repoPath: string | undefined
): Promise<DiffResult> {
  // 1. Local disk entries (Mode E without user flag)
  const localResult = await handleModeE(adapters, projectPath, false);

  // 2. Repo project entries (Mode C) -- skip when no repoPath
  let repoEntries: ListEntry[] = [];
  if (repoPath) {
    try {
      const repoResult = await handleModeC(adapters, repoPath, projectPath);
      repoEntries = repoResult.entries;
    } catch {
      repoEntries = [];
    }
  }

  // 3. User config entries
  const userConfig = await getUserProjectConfig();
  const userEntries = extractConfigEntries(userConfig as Record<string, any>, adapters);

  // 4. Repo user entries (Mode D) -- skip when no repoPath
  let repoUserEntries: ListEntry[] = [];
  if (repoPath) {
    try {
      const repoUserResult = await handleModeD(adapters, repoPath, projectPath);
      repoUserEntries = repoUserResult.entries;
    } catch {
      repoUserEntries = [];
    }
  }

  // 5. Merge
  const rows = mergeIntoDiffRows(localResult.entries, repoEntries, userEntries, repoUserEntries);

  // 5. Sort by subtype then name
  rows.sort((a, b) => {
    const subtypeCmp = a.subtype.localeCompare(b.subtype);
    if (subtypeCmp !== 0) return subtypeCmp;
    return a.name.localeCompare(b.name);
  });

  // 6. Return DiffResult
  return {
    rows,
    totalCount: rows.length,
    subtypeCount: new Set(rows.map(r => r.subtype)).size,
  };
}

/**
 * Print a DiffResult to stdout.
 * In quiet mode: tab-separated values, no headers, no color.
 * Otherwise: aligned table with colored status indicators.
 */
export function printDiffResult(result: DiffResult, quiet: boolean): void {
  if (result.totalCount === 0) {
    console.log(chalk.gray('No entries found.'));
    return;
  }

  const lp = 'Local(P)';
  const rp = 'Repo(P)';
  const us = 'User';
  const ru = 'Repo(U)';

  if (quiet) {
    const typeWidth = Math.max(...result.rows.map(r => r.subtype.length));
    const nameWidth = Math.max(...result.rows.map(r => r.name.length));
    for (const row of result.rows) {
      console.log(`${row.subtype.padEnd(typeWidth)}  ${row.name.padEnd(nameWidth)}  ${row.local.padEnd(lp.length)}  ${row.repo.padEnd(rp.length)}  ${row.user.padEnd(us.length)}  ${row.repoUser}`);
    }
    return;
  }

  // Calculate column widths
  const typeWidth = Math.max('Type'.length, ...result.rows.map(r => r.subtype.length));
  const nameWidth = Math.max('Name'.length, ...result.rows.map(r => r.name.length));

  // Color helper
  const colorize = (status: string): string => {
    switch (status) {
      case 'i': return chalk.green(status);
      case 'a': return chalk.cyan(status);
      case 'l': return chalk.magenta(status);
      default: return chalk.gray(status);
    }
  };

  // Header
  const header = `${'Type'.padEnd(typeWidth)}  ${'Name'.padEnd(nameWidth)}  ${lp}  ${rp}  ${us.padEnd(us.length)}  ${ru}`;
  console.log(chalk.bold(header));

  // Separator
  const sep = `${'-'.repeat(typeWidth)}  ${'-'.repeat(nameWidth)}  ${'-'.repeat(lp.length)}  ${'-'.repeat(rp.length)}  ${'-'.repeat(us.length)}  ${'-'.repeat(ru.length)}`;
  console.log(sep);

  // Rows
  for (const row of result.rows) {
    const colLocal = colorize(row.local).padEnd(lp.length + (colorize(row.local).length - 1));
    const colRepo = colorize(row.repo).padEnd(rp.length + (colorize(row.repo).length - 1));
    const colUser = colorize(row.user).padEnd(us.length + (colorize(row.user).length - 1));
    const colRepoUser = colorize(row.repoUser);
    console.log(`${row.subtype.padEnd(typeWidth)}  ${row.name.padEnd(nameWidth)}  ${colLocal}  ${colRepo}  ${colUser}  ${colRepoUser}`);
  }

  // Summary
  const summary = `\n${result.totalCount} ${result.totalCount === 1 ? 'entry' : 'entries'} across ${result.subtypeCount} ${result.subtypeCount === 1 ? 'type' : 'types'}`;
  console.log(chalk.gray(summary));

  // Legend
  console.log(chalk.gray('Legend: l=local-only  i=installed  a=available  -=absent'));
}
