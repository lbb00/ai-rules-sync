/**
 * Registry-driven `ais <tool>` command group.
 *
 * Replaces the ~30 hand-written per-tool blocks that used to live in
 * index.ts (one copy-pasted install/add-all/import per tool, three
 * inconsistent shapes depending on when the tool was added). Every tool
 * now gets the same command set, generated straight from whatever adapters
 * `adapterRegistry` has for it — adding a new adapter to the registry is
 * enough to wire it into the CLI, no hand-written block required.
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { Command } from 'commander';
import { SyncAdapter } from '../adapters/types.js';
import { adapterRegistry } from '../adapters/index.js';
import { cliNameForTool, broadcastGroupForSubtype } from '../adapters/cli-groups.js';
import { registerAdapterCommands } from './register.js';
import { parseSourceDirParams } from './source-dir-parser.js';
import { handleImport } from '../commands/handlers.js';
import { installEntriesForTool, installAllUserEntries } from '../commands/install.js';
import { handleAddAll } from '../commands/add-all.js';
import { getTargetRepo } from '../commands/helpers.js';

/**
 * Collector for commander to accumulate multiple option values (e.g. repeated -s).
 */
function collect(value: string, previous: string[]): string[] {
  return previous ? previous.concat([value]) : [value];
}

function printAddAllSummary(
  result: { installed: number; skipped: number; errors: Array<{ entry: string; error: string }> },
  quiet: boolean | undefined
): void {
  if (quiet) {
    return;
  }

  console.log(chalk.bold('\nSummary:'));
  console.log(chalk.green(`  Installed: ${result.installed}`));
  if (result.skipped > 0) {
    console.log(chalk.yellow(`  Skipped: ${result.skipped}`));
  }
  if (result.errors.length > 0) {
    console.log(chalk.red(`  Errors: ${result.errors.length}`));
    result.errors.forEach(e => {
      console.log(chalk.red(`    - ${e.entry}: ${e.error}`));
    });
  }
}

/**
 * Human-readable label for help text, derived from the CLI group name
 * (not the internal `tool` field) so it matches what the user actually typed.
 */
function humanize(cliName: string): string {
  return cliName
    .split(/[-_]/)
    .map(part => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    return (await fs.stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(targetPath: string): Promise<boolean> {
  try {
    return (await fs.stat(targetPath)).isFile();
  } catch {
    return false;
  }
}

export interface ImportDetectionResult {
  adapter: SyncAdapter;
  /**
   * The actual on-disk file/directory name matched — may differ from the
   * name the user typed when a suffix was appended to find it (e.g. typed
   * "foo", matched "foo.mdc"). importEntry()/manager.import() require the
   * exact on-disk name (no suffix resolution of their own), so callers must
   * pass this through instead of the user's raw input.
   */
  resolvedName: string;
}

/**
 * Find the adapter whose target path matches `name`, for `import` subtype
 * auto-detection. Must be type-aware (mode + fileSuffixes/hybridFileSuffixes),
 * not just fs.pathExists — adapters can nest (e.g. cline-commands' targetDir
 * `.clinerules/workflows` sits inside cline-rules' targetDir `.clinerules`),
 * so a plain existence check on the un-suffixed path can hit the wrong
 * adapter or miss a real match entirely (file-mode entries live at
 * `<targetDir>/<name><suffix>`, not `<targetDir>/<name>`). Exported for
 * direct testing without going through Commander/process.exit.
 */
export async function detectImportAdapter(
  adapters: SyncAdapter[],
  projectPath: string,
  name: string
): Promise<ImportDetectionResult | null> {
  for (const adapter of adapters) {
    const targetPath = path.join(projectPath, adapter.targetDir, name);

    if (adapter.mode === 'directory') {
      if (await isDirectory(targetPath)) {
        return { adapter, resolvedName: name };
      }
    } else if (adapter.mode === 'file') {
      const suffixes = adapter.fileSuffixes && adapter.fileSuffixes.length > 0 ? adapter.fileSuffixes : [''];
      // name may already carry its suffix (e.g. "foo.md") — check the exact
      // path before trying to append a suffix a second time.
      if (suffixes.some(suffix => suffix && name.endsWith(suffix)) && await isFile(targetPath)) {
        return { adapter, resolvedName: name };
      }
      for (const suffix of suffixes) {
        if (await isFile(`${targetPath}${suffix}`)) {
          return { adapter, resolvedName: `${name}${suffix}` };
        }
      }
    } else if (adapter.mode === 'hybrid') {
      // directory, or file possibly already carrying its suffix, else try
      // each hybridFileSuffixes candidate (mirrors createMultiSuffixResolver).
      if (await fs.pathExists(targetPath)) {
        return { adapter, resolvedName: name };
      }
      for (const suffix of adapter.hybridFileSuffixes ?? []) {
        if (await isFile(`${targetPath}${suffix}`)) {
          return { adapter, resolvedName: `${name}${suffix}` };
        }
      }
    }
  }
  return null;
}

/**
 * "A, B, or C" — matches the phrasing the hand-written import error messages
 * used before this factory replaced them.
 */
function formatTargetDirList(dirs: string[]): string {
  if (dirs.length <= 1) return dirs[0] ?? '';
  if (dirs.length === 2) return `${dirs[0]} or ${dirs[1]}`;
  return `${dirs.slice(0, -1).join(', ')}, or ${dirs[dirs.length - 1]}`;
}

/**
 * Flat `<tool> add`/`<tool> remove` used to write directly to a default
 * subtype. That default guess was a frequent source of surprise once tools
 * had more than one subtype, so 1.0 removes the real behavior and leaves a
 * hidden stub that always fails with the two commands that replace it: the
 * subtype-scoped version, and (once broadcast groups land) the cross-tool
 * version. Hidden rather than unregistered so users following old tutorials
 * get an actionable message instead of Commander's "unknown command".
 */
function printStubRedirect(options: {
  action: 'add' | 'remove';
  cliName: string;
  adapters: SyncAdapter[];
  primaryArg: string;
  secondaryArg?: string;
}): void {
  const { action, cliName, adapters, primaryArg, secondaryArg } = options;
  const defaultSubtype = adapters[0]?.subtype ?? '<subtype>';
  const subtypeList = adapters.map(a => a.subtype).join(', ');
  const localArgs = secondaryArg ? `${primaryArg} ${secondaryArg}` : primaryArg;
  const broadcastGroup = broadcastGroupForSubtype(defaultSubtype);

  console.error(chalk.red(`\`ais ${cliName} ${action}\` no longer writes anything directly — pick a subtype.`));
  console.error(chalk.gray(`${cliName} subtypes: ${subtypeList}`));
  console.error(chalk.gray('Try one of:'));
  console.error(chalk.gray(`  ais ${cliName} ${defaultSubtype} ${action} ${localArgs}`));
  if (broadcastGroup) {
    console.error(chalk.gray(`  ais ${broadcastGroup} ${action} ${primaryArg} --tools ${cliName}`));
  }
}

/**
 * Registers the full `ais <tool>` command group for one tool: a subgroup per
 * adapter (add/remove/install/add-all/import, via the existing
 * registerAdapterCommands), a tool-wide install/add-all/import that operate
 * across all of the tool's adapters, and the hidden add/remove stubs.
 */
export function registerToolGroup(program: Command, tool: string): void {
  const adapters = adapterRegistry.getForTool(tool);
  if (adapters.length === 0) {
    return;
  }

  const cliName = cliNameForTool(tool);
  const label = humanize(cliName);

  const group = program
    .command(cliName)
    .description(`Manage ${label} assets in a project`);

  // ---- subtype subgroups: ais <tool> <subtype> add/remove/install/add-all/import ----
  for (const adapter of adapters) {
    const subgroup = group.command(adapter.subtype).description(`Manage ${label} ${adapter.subtype}`);
    registerAdapterCommands({ adapter, parentCommand: subgroup, programOpts: () => program.opts() });
  }

  // ---- ais <tool> install [-g|-u] ----
  group
    .command('install')
    .description(`Install all ${label} entries from config`)
    .option('-g, --global', 'Install all user config entries (~/.config/ai-rules-sync/user.json)')
    .option('-u, --user', 'Alias for --global')
    .action(async (cmdOptions: { global?: boolean; user?: boolean }) => {
      try {
        if (cmdOptions.global || cmdOptions.user) {
          await installAllUserEntries(adapters);
          return;
        }
        await installEntriesForTool(adapters, process.cwd());
      } catch (error: any) {
        console.error(chalk.red(`Error installing ${label} entries:`), error.message);
        process.exit(1);
      }
    });

  // ---- ais <tool> add-all [...] (project-only, see design §6.3) ----
  group
    .command('add-all')
    .description(`Add all ${label} entries from repository`)
    .option('--dry-run', 'Preview without making changes')
    .option('-f, --force', 'Overwrite existing entries')
    .option('-i, --interactive', 'Prompt for each entry')
    .option('-l, --local', 'Add to ai-rules-sync.local.json')
    .option('--skip-existing', 'Skip entries already in config')
    .option('--quiet', 'Minimal output')
    .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
    .action(async (options: {
      dryRun?: boolean;
      force?: boolean;
      interactive?: boolean;
      local?: boolean;
      skipExisting?: boolean;
      quiet?: boolean;
      sourceDir?: string[];
    }) => {
      try {
        const projectPath = process.cwd();
        const opts = program.opts();
        const currentRepo = await getTargetRepo(opts);

        let sourceDirOverrides;
        if (options.sourceDir && options.sourceDir.length > 0) {
          try {
            sourceDirOverrides = parseSourceDirParams(options.sourceDir, tool);
          } catch (error: any) {
            console.error(chalk.red('Error parsing --source-dir:'), error.message);
            process.exit(1);
          }
        }

        const result = await handleAddAll(
          projectPath,
          currentRepo,
          adapterRegistry,
          {
            target: opts.target,
            tools: [tool],
            dryRun: options.dryRun,
            force: options.force,
            interactive: options.interactive,
            isLocal: options.local,
            skipExisting: options.skipExisting,
            quiet: options.quiet,
            sourceDirOverrides
          }
        );

        printAddAllSummary(result, options.quiet);
        if (result.errors.length > 0) {
          process.exit(1);
        }
      } catch (error: any) {
        console.error(chalk.red(`Error in ${cliName} add-all:`), error.message);
        process.exit(1);
      }
    });

  // ---- ais <tool> import <name> (project-only, type-matched subtype detection) ----
  group
    .command('import <name>')
    .description(`Import ${label} entry from project to repository (auto-detects subtype)`)
    .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
    .option('-m, --message <message>', 'Custom git commit message')
    .option('-f, --force', 'Overwrite if entry already exists in repository')
    .option('-p, --push', 'Push to remote repository after commit')
    .option('--dry-run', 'Preview changes without applying')
    .action(async (name: string, options) => {
      try {
        const projectPath = process.cwd();
        const repo = await getTargetRepo(program.opts());
        const detected = await detectImportAdapter(adapters, projectPath, name);

        if (!detected) {
          const dirs = formatTargetDirList(adapters.map(a => a.targetDir));
          throw new Error(`Entry "${name}" not found in ${dirs}.`);
        }

        const { adapter: foundAdapter, resolvedName } = detected;
        console.log(chalk.gray(`Detected ${foundAdapter.subtype}: ${resolvedName}`));
        await handleImport(foundAdapter, { projectPath, repo, isLocal: options.local || false }, resolvedName, options);
      } catch (error: any) {
        console.error(chalk.red(`Error importing ${label} entry:`), error.message);
        process.exit(1);
      }
    });

  // ---- hidden ais <tool> add/remove stubs (design §6.6) ----
  group
    .command('add <name> [alias]', { hidden: true })
    .action((name: string, alias: string | undefined) => {
      printStubRedirect({ action: 'add', cliName, adapters, primaryArg: name, secondaryArg: alias });
      process.exit(1);
    });

  group
    .command('remove <alias>', { hidden: true })
    .action((alias: string) => {
      printStubRedirect({ action: 'remove', cliName, adapters, primaryArg: alias });
      process.exit(1);
    });
}
