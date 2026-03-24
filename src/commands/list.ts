import path from 'path';
import fs from 'fs-extra';
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
): Promise<ListResult> {
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
