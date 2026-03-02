/**
 * Declarative CLI registration module
 * Reduces command registration duplication by generating commands from adapter configuration
 */

import os from 'os';
import { Command } from 'commander';
import chalk from 'chalk';
import { SyncAdapter } from '../adapters/types.js';
import { handleAdd, handleRemove, handleImport, ImportCommandOptions } from '../commands/handlers.js';
import { installEntriesForAdapter, installUserEntriesForAdapter } from '../commands/install.js';
import { getTargetRepo } from '../commands/helpers.js';
import { handleAddAll } from '../commands/add-all.js';
import { adapterRegistry } from '../adapters/index.js';
import { parseSourceDirParams } from './source-dir-parser.js';

/**
 * Options for registering commands for an adapter
 */
export interface RegisterCommandsOptions {
  adapter: SyncAdapter;
  parentCommand: Command;
  programOpts: () => { target?: string };
}

/**
 * Collector function for commander to accumulate multiple option values
 */
function collect(value: string, previous: string[]): string[] {
  return previous ? previous.concat([value]) : [value];
}

/**
 * Register add/remove/install/import commands for an adapter
 */
export function registerAdapterCommands(options: RegisterCommandsOptions): void {
  const { adapter, parentCommand, programOpts } = options;
  const entityName = getSingularName(adapter.subtype);

  // Add command
  parentCommand
    .command('add <name> [alias]')
    .description(`Sync ${adapter.tool} ${entityName} to project`)
    .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
    .option('-u, --user', 'Add to user config (~/.config/ai-rules-sync/user.json)')
    .option('-d, --target-dir <dir>', 'Custom target directory for this entry')
    .action(async (name: string, alias: string | undefined, cmdOptions: { local?: boolean; user?: boolean; targetDir?: string }) => {
      try {
        const repo = await getTargetRepo(programOpts());
        const isUser = cmdOptions.user || false;
        const projectPath = isUser ? os.homedir() : process.cwd();
        await handleAdd(adapter, {
          projectPath,
          repo,
          isLocal: cmdOptions.local || false,
          user: isUser,
          skipIgnore: isUser
        }, name, alias, {
          local: cmdOptions.local,
          user: isUser,
          targetDir: cmdOptions.targetDir
        });
      } catch (error: any) {
        console.error(chalk.red(`Error adding ${adapter.tool} ${entityName}:`), error.message);
        process.exit(1);
      }
    });

  // Remove command
  parentCommand
    .command('remove <alias>')
    .alias('rm')
    .description(`Remove a ${adapter.tool} ${entityName} from project`)
    .option('-u, --user', 'Remove from user config')
    .action(async (alias: string, cmdOptions: { user?: boolean }) => {
      try {
        const isUser = cmdOptions.user || false;
        const projectPath = isUser ? os.homedir() : process.cwd();
        await handleRemove(adapter, projectPath, alias, isUser);
      } catch (error: any) {
        console.error(chalk.red(`Error removing ${adapter.tool} ${entityName}:`), error.message);
        process.exit(1);
      }
    });

  // Install command
  parentCommand
    .command('install')
    .description(`Install all ${adapter.tool} ${adapter.subtype} from config`)
    .option('-u, --user', 'Install from user config')
    .action(async (cmdOptions: { user?: boolean }) => {
      try {
        if (cmdOptions.user) {
          await installUserEntriesForAdapter(adapter);
        } else {
          await installEntriesForAdapter(adapter, process.cwd());
        }
      } catch (error: any) {
        console.error(chalk.red(`Error installing ${adapter.tool} ${adapter.subtype}:`), error.message);
        process.exit(1);
      }
    });

  // Add-all command
  parentCommand
    .command('add-all')
    .description(`Add all ${adapter.tool} ${adapter.subtype} from repository`)
    .option('--dry-run', 'Preview without making changes')
    .option('-f, --force', 'Overwrite existing entries')
    .option('-i, --interactive', 'Prompt for each entry')
    .option('-l, --local', 'Add to ai-rules-sync.local.json')
    .option('--skip-existing', 'Skip entries already in config')
    .option('--quiet', 'Minimal output')
    .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
    .action(async (cmdOptions: { dryRun?: boolean; force?: boolean; interactive?: boolean; local?: boolean; skipExisting?: boolean; quiet?: boolean; sourceDir?: string[] }) => {
      try {
        const projectPath = process.cwd();
        const repo = await getTargetRepo(programOpts());

        // Parse source-dir overrides with adapter context
        let sourceDirOverrides;
        if (cmdOptions.sourceDir && cmdOptions.sourceDir.length > 0) {
          try {
            sourceDirOverrides = parseSourceDirParams(cmdOptions.sourceDir, adapter.tool, adapter.subtype);
          } catch (error: any) {
            console.error(chalk.red('Error parsing --source-dir:'), error.message);
            process.exit(1);
          }
        }

        const result = await handleAddAll(
          projectPath,
          repo,
          adapterRegistry,
          {
            adapters: [adapter.name],
            dryRun: cmdOptions.dryRun,
            force: cmdOptions.force,
            interactive: cmdOptions.interactive,
            isLocal: cmdOptions.local,
            skipExisting: cmdOptions.skipExisting,
            quiet: cmdOptions.quiet,
            sourceDirOverrides
          }
        );

        if (!cmdOptions.quiet) {
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

        if (result.errors.length > 0) {
          process.exit(1);
        }
      } catch (error: any) {
        console.error(chalk.red(`Error in ${adapter.tool} ${adapter.subtype} add-all:`), error.message);
        process.exit(1);
      }
    });

  // Import command
  parentCommand
    .command('import <name>')
    .description(`Import ${adapter.tool} ${entityName} from project to repository`)
    .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
    .option('-m, --message <message>', 'Custom git commit message')
    .option('-f, --force', 'Overwrite if entry already exists in repository')
    .option('-p, --push', 'Push to remote repository after commit')
    .action(async (name: string, cmdOptions: ImportCommandOptions & { local?: boolean }) => {
      try {
        const repo = await getTargetRepo(programOpts());
        await handleImport(adapter, {
          projectPath: process.cwd(),
          repo,
          isLocal: cmdOptions.local || false
        }, name, cmdOptions);
      } catch (error: any) {
        console.error(chalk.red(`Error importing ${adapter.tool} ${entityName}:`), error.message);
        process.exit(1);
      }
    });
}

/**
 * Get singular name from plural subtype
 * e.g., 'rules' -> 'rule', 'skills' -> 'skill'
 */
function getSingularName(subtype: string): string {
  if (subtype.endsWith('s')) {
    return subtype.slice(0, -1);
  }
  return subtype;
}
