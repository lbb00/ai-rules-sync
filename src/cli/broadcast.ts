/**
 * Registry-driven `ais <subtype>` broadcast command groups.
 *
 * Complements registerToolGroup (tool-scoped commands) with the other axis:
 * "do this one thing across several tools at once" (design doc §5). A group
 * exists per BROADCAST_GROUPS key; its members are every adapter whose
 * subtype falls in that group's subtype set, across the whole registry.
 * There is no default target — the caller must say --tools <list> or --all,
 * on purpose: a broadcast command silently defaulting to "every tool" is
 * exactly the kind of surprise 1.0 is trying to remove (see design §0).
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { Command } from 'commander';
import { SyncAdapter } from '../adapters/types.js';
import { adapterRegistry } from '../adapters/index.js';
import { BROADCAST_GROUPS, CONCEPT_HINTS, resolveToolByCliName, cliNameForTool } from '../adapters/cli-groups.js';
import {
  resolveSourceDir,
  getRepoSourceConfig,
  getCombinedProjectConfig,
  getConfigSectionWithFallback,
  getEntryConfig,
  getSourceFileOverride,
  getSourceDirOverride,
  SourceDirOrigin,
  ProjectConfig
} from '../project-config.js';
import { RepoConfig, getUserProjectConfig } from '../config.js';
import { handleAdd, handleRemove, CommandContext, AddOptions } from '../commands/handlers.js';
import { getTargetRepo } from '../commands/helpers.js';

/**
 * Commander collector for --tools: accumulates across repeated flags AND
 * splits each value on commas, so `--tools a,b --tools c` and
 * `--tools a --tools b --tools c` both land as ['a', 'b', 'c'].
 */
function collectTools(value: string, previous: string[]): string[] {
  const parts = value.split(',').map(v => v.trim()).filter(Boolean);
  return previous ? previous.concat(parts) : parts;
}

/** Standard Levenshtein edit distance, used for --tools "did you mean" suggestions. */
function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[rows - 1][cols - 1];
}

/** Candidates within edit distance 2 of `input`, closest first. */
function didYouMean(input: string, candidates: string[], maxDistance = 2): string[] {
  return candidates
    .map(candidate => ({ candidate, distance: levenshteinDistance(input, candidate) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate))
    .map(({ candidate }) => candidate);
}

/**
 * Existence check on the *repo* side, for `ais <group> add --dry-run`/preview.
 * Delegates to the adapter's own resolveSource when it has one
 * (createSingleSuffixResolver/createMultiSuffixResolver in src/adapters/base.ts)
 * — the exact function real add() calls via GitRepoSource
 * (src/plugin/git-repo-source.ts) — so "would add succeed" and "does
 * dry-run say hit" can't drift apart the way two hand-written copies of the
 * same mode/suffix logic did. Adapters without resolveSource (mostly
 * directory-mode, plus ~30 file-mode adapters that were never given one)
 * resolve through GitRepoSource's own generic path instead: a bare,
 * override-aware exact-name match, mirrored here without the git clone/pull
 * GitSource.resolve() would otherwise do (this only needs the already-cloned
 * local repo on disk, which is all a preview should touch).
 */
interface RepoEntryCheck {
  hit: boolean;
  /**
   * Set when resolveSource threw something other than its "not found"
   * message — e.g. copilot's suffix-ambiguity error, or agents-md's
   * "only AGENTS.md files are supported" validation error. Every
   * resolveSource implementation's genuine-absence errors consistently say
   * "not found" (base.ts's suffix resolvers, claude-md, codebuddy-md,
   * agents-md); anything else means the entry situation isn't a clean
   * absence, so callers should surface this message instead of a generic
   * "not found in repository".
   */
  error?: string;
}

async function repoHasEntry(
  adapter: SyncAdapter,
  repoDir: string,
  sourceDir: string,
  name: string,
  overrides: { sourceFileOverride?: string; sourceDirOverride?: string } = {}
): Promise<RepoEntryCheck> {
  if (adapter.resolveSource) {
    try {
      await adapter.resolveSource(repoDir, sourceDir, name, overrides);
      return { hit: true };
    } catch (error: any) {
      const message = error?.message ?? String(error);
      if (/not found/i.test(message)) {
        return { hit: false };
      }
      return { hit: false, error: message };
    }
  }
  const effectiveName = overrides.sourceDirOverride ?? name;
  const exists = await fs.pathExists(path.join(repoDir, sourceDir, effectiveName));
  return { hit: exists };
}

/** Temporarily swallow console output — used around handlers that print unconditionally, for --json. */
async function withSilencedConsole<T>(fn: () => Promise<T>): Promise<T> {
  const original = { log: console.log, error: console.error, warn: console.warn };
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
  }
}

/** Context for building the exact replacement command in a CONCEPT_HINTS error. */
interface ConceptHintExample {
  verb: 'add' | 'remove';
  args: Array<string | undefined>;
}

function buildConceptHintLine(groupName: string, resolvedTool: string, example?: ConceptHintExample): string | undefined {
  const hintSubtype = CONCEPT_HINTS[groupName]?.[resolvedTool];
  if (!hintSubtype) {
    return undefined;
  }
  const cliName = cliNameForTool(resolvedTool);
  if (!example) {
    return `"${cliName}"'s equivalent concept here is "${hintSubtype}": ais ${cliName} ${hintSubtype} ...`;
  }
  const args = example.args.filter((a): a is string => !!a).join(' ');
  return `"${cliName}"'s equivalent concept here is "${hintSubtype}": ais ${cliName} ${hintSubtype} ${example.verb} ${args}`.trimEnd();
}

/**
 * Resolves --tools/--all into the adapters a broadcast command should act on.
 * Pure (no I/O, no process.exit) so it's directly testable; callers catch
 * the thrown Error and turn it into a printed message + exit(1). Exported
 * for tests to exercise the mutual-exclusion and did-you-mean paths without
 * going through Commander.
 */
export function resolveScopeAdapters(
  groupName: string,
  groupMembers: SyncAdapter[],
  tools: string[] | undefined,
  all: boolean | undefined,
  example?: ConceptHintExample
): SyncAdapter[] {
  const hasTools = !!tools && tools.length > 0;
  if (!hasTools && !all) {
    throw new Error(`"ais ${groupName}" needs a target: pass --tools <list> or --all.`);
  }
  if (hasTools && all) {
    throw new Error(`"ais ${groupName}": --tools and --all are mutually exclusive; pass exactly one.`);
  }

  if (all) {
    return groupMembers;
  }

  const supportedCliNames = groupMembers.map(a => cliNameForTool(a.tool)).sort();
  const resolved: SyncAdapter[] = [];

  for (const raw of tools!) {
    const resolvedTool = resolveToolByCliName(raw);

    if (!resolvedTool) {
      const suggestions = didYouMean(raw, supportedCliNames);
      const lines = [
        `Unknown tool "${raw}" for --tools.`,
        `Tools supporting "${groupName}": ${supportedCliNames.join(', ')}`
      ];
      if (suggestions.length > 0) {
        lines.push(`Did you mean: ${suggestions.join(', ')}?`);
      }
      throw new Error(lines.join('\n'));
    }

    const adapter = groupMembers.find(a => a.tool === resolvedTool);
    if (!adapter) {
      const cliName = cliNameForTool(resolvedTool);
      const lines = [
        `"${cliName}" has no adapter for the "${groupName}" broadcast group.`,
        `Tools supporting "${groupName}": ${supportedCliNames.join(', ')}`
      ];
      const hintLine = buildConceptHintLine(groupName, resolvedTool, example);
      if (hintLine) {
        lines.push(hintLine);
      }
      throw new Error(lines.join('\n'));
    }

    if (!resolved.includes(adapter)) {
      resolved.push(adapter);
    }
  }

  return resolved;
}

/**
 * Whether `key` (or a suffixed variant of it) is already configured for this
 * adapter. File/hybrid-mode entries are stored in config under their
 * suffix-appended name (manager.add() writes the manifest under the
 * suffix-resolved targetName, src/dotany/manager.ts), so a bare exact-key
 * lookup misses an entry added as "foo.md" when re-checking with "foo" —
 * mirrors handleAdd's own suffix-variant pre-check (src/commands/handlers.ts).
 *
 * Reads by adapter.configPath, not [adapter.tool, adapter.subtype] — for
 * every adapter but one they're identical, but agents-md's project-config
 * key is ['agentsMd', 'file'] while its tool/subtype are 'agents-md'/'file'
 * (the config namespace and the repo sourceDir namespace use different
 * keys for that one adapter; resolveSourceDir's repoConfig reads elsewhere
 * in this file are correctly keyed by tool/subtype, a separate config).
 */
function isEntryConfigured(projectConfig: ProjectConfig, adapter: SyncAdapter, key: string): boolean {
  const [topLevel, subLevel] = adapter.configPath;
  if (getEntryConfig(projectConfig, topLevel, subLevel, key)) {
    return true;
  }
  const suffixes = adapter.fileSuffixes ?? adapter.hybridFileSuffixes ?? [];
  return suffixes.some(suffix => {
    const keyWithSuffix = key.endsWith(suffix) ? key : `${key}${suffix}`;
    return !!getEntryConfig(projectConfig, topLevel, subLevel, keyWithSuffix);
  });
}

export interface AddPreviewRow {
  tool: string;
  cliName: string;
  origin: SourceDirOrigin;
  sourceDir: string;
  hit: boolean;
  configured: boolean;
  action: 'will-add' | 'skip: not-in-repo' | 'skip: already-configured';
  targetPath: string;
  /** The real resolveSource error, when `action` is 'skip: not-in-repo' for a reason other than plain absence (see RepoEntryCheck). */
  error?: string;
}

/**
 * Preview a single tool's outcome for `ais <group> add`: where its repo
 * source resolves from (and via which priority tier — resolveSourceDir's
 * origin), whether the named entry actually exists there, and whether the
 * target project/user config already has it. Exported so dry-run's origin
 * column can be tested directly against fabricated repo layouts.
 */
export async function buildAddPreviewRow(
  adapter: SyncAdapter,
  repo: RepoConfig,
  name: string,
  alias: string | undefined,
  isGlobal: boolean
): Promise<AddPreviewRow> {
  const repoConfig = await getRepoSourceConfig(repo.path);
  const { dir, origin } = resolveSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
  const repoSourceDir = path.join(repo.path, dir);
  const overrides = {
    sourceFileOverride: getSourceFileOverride(repoConfig, adapter.tool, adapter.subtype),
    sourceDirOverride: getSourceDirOverride(repoConfig, adapter.tool, adapter.subtype)
  };
  const { hit, error: resolveError } = await repoHasEntry(adapter, repo.path, dir, name, overrides);

  const configKey = alias || name;
  const projectConfig = isGlobal ? await getUserProjectConfig() : await getCombinedProjectConfig(process.cwd());
  const configured = isEntryConfigured(projectConfig, adapter, configKey);

  let action: AddPreviewRow['action'];
  if (!hit) {
    action = 'skip: not-in-repo';
  } else if (configured) {
    action = 'skip: already-configured';
  } else {
    action = 'will-add';
  }

  return {
    tool: adapter.tool,
    cliName: cliNameForTool(adapter.tool),
    origin,
    sourceDir: repoSourceDir,
    hit,
    configured,
    action,
    targetPath: path.join(adapter.targetDir, configKey),
    ...(resolveError ? { error: resolveError } : {})
  };
}

/**
 * Rows --strict turns from a warning into a dry-run failure: entries the
 * broadcast group would otherwise silently skip because the repo has
 * nothing at the resolved source dir. Split out from runAdd so the --strict
 * wiring is directly testable without going through Commander/process.exit.
 */
export function selectStrictFailures(rows: AddPreviewRow[], strict: boolean | undefined): AddPreviewRow[] {
  return strict ? rows.filter(r => r.action === 'skip: not-in-repo') : [];
}

function printAddPreviewTable(groupName: string, rows: AddPreviewRow[]): void {
  console.log(chalk.bold(`\n[DRY RUN] ais ${groupName} add — preview:\n`));
  for (const row of rows) {
    const color = row.action === 'will-add' ? chalk.green : chalk.yellow;
    const suffix = row.error ? chalk.red(` (${row.error})`) : '';
    console.log(
      `  ${row.cliName.padEnd(12)} (${row.origin.padEnd(8)}) ${color(row.action.padEnd(24))} -> ${row.targetPath}${suffix}`
    );
  }
}

interface AddCmdOptions {
  tools?: string[];
  all?: boolean;
  global?: boolean;
  user?: boolean;
  local?: boolean;
  dryRun?: boolean;
  strict?: boolean;
  json?: boolean;
}

async function runAdd(
  groupName: string,
  groupMembers: SyncAdapter[],
  program: Command,
  name: string,
  alias: string | undefined,
  options: AddCmdOptions
): Promise<void> {
  try {
    const isGlobal = !!(options.global || options.user);
    const targets = resolveScopeAdapters(groupName, groupMembers, options.tools, options.all, {
      verb: 'add',
      args: [name, alias]
    });
    const repo = await getTargetRepo(program.opts());

    if (options.dryRun) {
      const rows = await Promise.all(targets.map(adapter => buildAddPreviewRow(adapter, repo, name, alias, isGlobal)));
      const strictFailures = selectStrictFailures(rows, options.strict);

      if (options.json) {
        console.log(JSON.stringify({
          group: groupName,
          dryRun: true,
          results: rows,
          errors: strictFailures.map(r => ({ tool: r.tool, error: r.error ?? 'not found in repository' })),
          installed: rows.filter(r => r.action === 'will-add').length,
          skipped: rows.filter(r => r.action !== 'will-add').length
        }, null, 2));
      } else {
        printAddPreviewTable(groupName, rows);
        if (strictFailures.length > 0) {
          console.error(chalk.red(`\n--strict: ${strictFailures.length} tool(s) have no matching entry in the repository.`));
        }
      }

      if (strictFailures.length > 0) {
        process.exit(1);
      }
      return;
    }

    const results: Array<{ tool: string; cliName: string; hit: boolean; action: string; error?: string }> = [];
    const errors: Array<{ entry: string; error: string }> = [];
    let installed = 0;
    let skipped = 0;

    for (const adapter of targets) {
      const cliName = cliNameForTool(adapter.tool);
      const repoConfig = await getRepoSourceConfig(repo.path);
      const { dir } = resolveSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
      const repoSourceDir = path.join(repo.path, dir);
      const overrides = {
        sourceFileOverride: getSourceFileOverride(repoConfig, adapter.tool, adapter.subtype),
        sourceDirOverride: getSourceDirOverride(repoConfig, adapter.tool, adapter.subtype)
      };
      const { hit, error: resolveError } = await repoHasEntry(adapter, repo.path, dir, name, overrides);

      if (!hit) {
        const message = resolveError ?? `entry "${name}" not found in repository (checked ${repoSourceDir})`;
        if (options.strict) {
          errors.push({ entry: `${cliName}/${name}`, error: message });
          results.push({ tool: adapter.tool, cliName, hit: false, action: 'error', error: message });
          if (!options.json) {
            console.error(chalk.red(`${cliName}: ${message}`));
          }
        } else {
          skipped++;
          results.push({ tool: adapter.tool, cliName, hit: false, action: 'skipped: not-in-repo', ...(resolveError ? { error: resolveError } : {}) });
          if (!options.json) {
            console.log(chalk.yellow(`${cliName}: skipped, ${message}`));
          }
        }
        continue;
      }

      const ctx: CommandContext = {
        projectPath: isGlobal ? os.homedir() : process.cwd(),
        repo,
        isLocal: options.local || false,
        ...(isGlobal ? { user: true, skipIgnore: true } : {})
      };
      const addOptions: AddOptions = { local: options.local, user: isGlobal };

      try {
        if (options.json) {
          await withSilencedConsole(() => handleAdd(adapter, ctx, name, alias, addOptions));
        } else {
          await handleAdd(adapter, ctx, name, alias, addOptions);
        }
        installed++;
        results.push({ tool: adapter.tool, cliName, hit: true, action: 'added' });
      } catch (error: any) {
        errors.push({ entry: `${cliName}/${name}`, error: error.message });
        results.push({ tool: adapter.tool, cliName, hit: true, action: 'error', error: error.message });
        if (!options.json) {
          console.error(chalk.red(`${cliName}: ${error.message}`));
        }
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ group: groupName, results, errors, installed, skipped }, null, 2));
    } else {
      console.log(chalk.bold('\nSummary:'));
      console.log(chalk.green(`  Installed: ${installed}`));
      if (skipped > 0) {
        console.log(chalk.yellow(`  Skipped: ${skipped}`));
      }
      if (errors.length > 0) {
        console.log(chalk.red(`  Errors: ${errors.length}`));
        errors.forEach(e => console.log(chalk.red(`    - ${e.entry}: ${e.error}`)));
      }
    }

    if (errors.length > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

interface RemoveCmdOptions {
  tools?: string[];
  all?: boolean;
  global?: boolean;
  user?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

async function runRemove(
  groupName: string,
  groupMembers: SyncAdapter[],
  alias: string,
  options: RemoveCmdOptions
): Promise<void> {
  try {
    const isGlobal = !!(options.global || options.user);
    const targets = resolveScopeAdapters(groupName, groupMembers, options.tools, options.all, {
      verb: 'remove',
      args: [alias]
    });
    const projectPath = isGlobal ? os.homedir() : process.cwd();

    const results: Array<{ tool: string; cliName: string; removed: boolean; removedFrom: string[]; error?: string }> = [];
    const errors: Array<{ entry: string; error: string }> = [];
    let removed = 0;
    let skipped = 0;

    for (const adapter of targets) {
      const cliName = cliNameForTool(adapter.tool);
      try {
        const run = () => handleRemove(adapter, projectPath, alias, isGlobal, { dryRun: options.dryRun });
        const result = options.json ? await withSilencedConsole(run) : await run();
        if (result.removedFrom.length > 0) {
          removed++;
        } else {
          skipped++;
        }
        results.push({ tool: adapter.tool, cliName, removed: result.removedFrom.length > 0, removedFrom: result.removedFrom });
      } catch (error: any) {
        errors.push({ entry: `${cliName}/${alias}`, error: error.message });
        results.push({ tool: adapter.tool, cliName, removed: false, removedFrom: [], error: error.message });
        if (!options.json) {
          console.error(chalk.red(`${cliName}: ${error.message}`));
        }
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ group: groupName, dryRun: !!options.dryRun, results, errors, removed, skipped }, null, 2));
    } else if (!options.dryRun) {
      console.log(chalk.bold('\nSummary:'));
      console.log(chalk.green(`  Removed: ${removed}`));
      if (skipped > 0) {
        console.log(chalk.yellow(`  Not found: ${skipped}`));
      }
      if (errors.length > 0) {
        console.log(chalk.red(`  Errors: ${errors.length}`));
        errors.forEach(e => console.log(chalk.red(`    - ${e.entry}: ${e.error}`)));
      }
    }

    if (errors.length > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

interface ListCmdOptions {
  tools?: string[];
  all?: boolean;
  global?: boolean;
  user?: boolean;
  json?: boolean;
}

async function runList(
  groupName: string,
  groupMembers: SyncAdapter[],
  options: ListCmdOptions
): Promise<void> {
  try {
    const isGlobal = !!(options.global || options.user);
    const targets = resolveScopeAdapters(groupName, groupMembers, options.tools, options.all);
    const config = isGlobal ? await getUserProjectConfig() : await getCombinedProjectConfig(process.cwd());

    const rows = targets.map(adapter => {
      // adapter.configPath, not [adapter.tool, adapter.subtype] — see the
      // comment on isEntryConfigured above for why (agents-md).
      const section = getConfigSectionWithFallback(config, adapter.configPath[0], adapter.configPath[1]);
      return {
        tool: adapter.tool,
        cliName: cliNameForTool(adapter.tool),
        configured: Object.keys(section).sort()
      };
    });

    if (options.json) {
      console.log(JSON.stringify({ group: groupName, scope: isGlobal ? 'user' : 'project', tools: rows }, null, 2));
      return;
    }

    console.log(chalk.bold(`\n${groupName} (${isGlobal ? 'user' : 'project'} config):\n`));
    for (const row of rows) {
      const label = row.configured.length > 0 ? row.configured.join(', ') : chalk.gray('(none)');
      console.log(`  ${row.cliName.padEnd(12)} ${String(row.configured.length).padEnd(3)} configured -> ${label}`);
    }
  } catch (error: any) {
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Registers `ais <group> add/remove/list` for every BROADCAST_GROUPS entry.
 * Group names and membership come entirely from cli-groups.ts — this module
 * only wires them into Commander, it doesn't decide what a group covers.
 */
export function registerBroadcastGroups(program: Command): void {
  for (const groupName of Object.keys(BROADCAST_GROUPS)) {
    const groupMembers = adapterRegistry.all().filter(adapter => BROADCAST_GROUPS[groupName].includes(adapter.subtype));
    const cliNames = groupMembers.map(a => cliNameForTool(a.tool)).sort();

    const group = program
      .command(groupName)
      .description(`Broadcast ${groupName} across tools (${cliNames.join(', ')})`);

    group
      .command('add <name> [alias]')
      .description(`Add a ${groupName} entry to one or more tools`)
      .option('--tools <list>', 'Comma-separated CLI tool names, repeatable', collectTools)
      .option('--all', `Target every tool with a ${groupName} adapter`)
      .option('-g, --global', 'Write to user config (~/.config/ai-rules-sync/user.json)')
      .option('-u, --user', 'Alias for --global')
      .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
      .option('--dry-run', 'Preview without making changes')
      .option('--strict', 'Fail instead of warning when a tool has no matching repo entry')
      .option('--json', 'Structured JSON output instead of text')
      .action((name: string, alias: string | undefined, options: AddCmdOptions) =>
        runAdd(groupName, groupMembers, program, name, alias, options)
      );

    group
      .command('remove <alias>')
      .alias('rm')
      .description(`Remove a ${groupName} entry from one or more tools`)
      .option('--tools <list>', 'Comma-separated CLI tool names, repeatable', collectTools)
      .option('--all', `Target every tool with a ${groupName} adapter`)
      .option('-g, --global', 'Remove from user config')
      .option('-u, --user', 'Alias for --global')
      .option('--dry-run', 'Preview without making changes')
      .option('--json', 'Structured JSON output instead of text')
      .action((alias: string, options: RemoveCmdOptions) => runRemove(groupName, groupMembers, alias, options));

    group
      .command('list')
      .alias('ls')
      .description(`List configured ${groupName} entries per tool`)
      .option('--tools <list>', 'Comma-separated CLI tool names, repeatable', collectTools)
      .option('--all', `Target every tool with a ${groupName} adapter`)
      .option('-g, --global', 'Read from user config')
      .option('-u, --user', 'Alias for --global')
      .option('--json', 'Structured JSON output instead of text')
      .action((options: ListCmdOptions) => runList(groupName, groupMembers, options));
  }
}
