#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { getConfig, setConfig, getReposBaseDir, getCurrentRepo, RepoConfig } from './config.js';
import { cloneOrUpdateRepo, runGitCommand } from './git.js';
import { addIgnoreEntry } from './utils.js';
import { getCombinedProjectConfig, getRepoSourceConfig, getSourceDir } from './project-config.js';
import { checkAndPromptCompletion, forceInstallCompletion } from './completion.js';
import { getCompletionScript } from './completion/scripts.js';
import { adapterRegistry, getAdapter, findAdapterForAlias } from './adapters/index.js';
import { copilotInstructionsAdapter } from './adapters/copilot-instructions.js';
import { copilotSkillsAdapter } from './adapters/copilot-skills.js';
import { copilotPromptsAdapter } from './adapters/copilot-prompts.js';
import { copilotAgentsAdapter } from './adapters/copilot-agents.js';
import { registerAdapterCommands } from './cli/register.js';
import {
  getTargetRepo,
  inferDefaultMode,
  requireExplicitMode,
  resolveCopilotAliasFromConfig,
  resolveCommandAliasFromConfig,
  DefaultMode
} from './commands/helpers.js';
import { handleAdd, handleRemove, handleImport } from './commands/handlers.js';
import { installEntriesForAdapter, installEntriesForTool } from './commands/install.js';
import { handleAddAll } from './commands/add-all.js';
import { parseSourceDirParams } from './cli/source-dir-parser.js';
import { setRepoSourceDir, clearRepoSourceDir, showRepoConfig, listRepos } from './commands/config.js';
import { getFormattedVersion } from './commands/version.js';

// Intercept version flags to show detailed version info before Commander processes them
if (process.argv.includes('-v') || process.argv.includes('--version')) {
  const output = await getFormattedVersion();
  console.log(output);
  process.exit(0);
}

const program = new Command();

/**
 * Collector function for commander to accumulate multiple option values
 */
function collect(value: string, previous: string[]): string[] {
  return previous ? previous.concat([value]) : [value];
}

program
  .name('ais')
  .description('AI Rules Sync - Sync agent rules from git repository')
  .version('0.4.0', '-v, --version', 'Display version information')
  .option('-t, --target <repoName>', 'Specify target rule repository (name or URL)');

// ============ Use command ============
program
  .command('use')
  .description('Config cursor rules git repository')
  .argument('[urlOrName]', 'Git repository URL or response name')
  .action(async (urlOrName) => {
    try {
      const config = await getConfig();

      if (!urlOrName) {
        if (config.currentRepo) {
          console.log(chalk.blue(`Current repository: ${config.currentRepo} (${config.repos[config.currentRepo].url})`));
          return;
        } else {
          console.error(chalk.red('Error: Please provide a git repository URL or name.'));
          process.exit(1);
        }
      }

      if (config.repos && config.repos[urlOrName]) {
        await setConfig({ currentRepo: urlOrName });
        console.log(chalk.green(`Switched to repository: ${urlOrName}`));
        await cloneOrUpdateRepo(config.repos[urlOrName]);
        return;
      }

      const isUrl = urlOrName.includes('://') || urlOrName.includes('git@') || urlOrName.endsWith('.git');

      if (isUrl) {
        const url = urlOrName;
        let name = path.basename(url, '.git');
        if (!name) name = 'default';

        if (config.repos && config.repos[name] && config.repos[name].url !== url) {
          console.log(chalk.yellow(`Warning: Repository with name "${name}" already exists. Overwriting...`));
        }

        const repoDir = path.join(getReposBaseDir(), name);
        const newRepo: RepoConfig = { name, url, path: repoDir };
        const newRepos = { ...(config.repos || {}), [name]: newRepo };

        await setConfig({ currentRepo: name, repos: newRepos });
        console.log(chalk.green(`Configured repository: ${name} (${url})`));
        await cloneOrUpdateRepo(newRepo);
        console.log(chalk.green('Repository ready.'));
      } else {
        console.error(chalk.red(`Error: Repository "${urlOrName}" not found in configuration.`));
        console.log(chalk.yellow(`Use "ais use <url>" to add a new repository.`));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('Error configuring repository:'), error.message);
      process.exit(1);
    }
  });

// ============ List command ============
program
  .command('list')
  .description('List all cursor rules git repositories')
  .action(async () => {
    const config = await getConfig();
    const repos = config.repos || {};
    const names = Object.keys(repos);

    if (names.length === 0) {
      console.log(chalk.yellow('No repositories configured. Use "ais use [url]" to configure.'));
      return;
    }

    console.log(chalk.bold('Configured repositories:'));
    for (const name of names) {
      const repo = repos[name];
      const isCurrent = name === config.currentRepo;
      const prefix = isCurrent ? chalk.green('* ') : '  ';
      console.log(`${prefix}${chalk.cyan(name)} ${chalk.gray(`(${repo.url})`)}`);
      if (isCurrent) {
        console.log(`    Local path: ${repo.path}`);
      }
    }
  });

// ============ Top-level shortcuts ============
program
  .command('add')
  .description('Add an entry (auto-detects cursor/copilot if unambiguous)')
  .argument('<name>', 'Rule/Instruction name in the rules repo')
  .argument('[alias]', 'Alias in the project')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-d, --target-dir <dir>', 'Custom target directory for this entry')
  .action(async (name, alias, options) => {
    try {
      const projectPath = process.cwd();
      const mode = await inferDefaultMode(projectPath);
      if (mode === 'none' || mode === 'ambiguous') requireExplicitMode(mode);

      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      const addOptions = {
        local: options.local,
        targetDir: options.targetDir
      };

      if (mode === 'cursor') {
        const adapter = getAdapter('cursor', 'rules');
        await handleAdd(adapter, { projectPath, repo: currentRepo, isLocal: options.local || false }, name, alias, addOptions);
      } else if (mode === 'copilot') {
        const adapter = getAdapter('copilot', 'instructions');
        await handleAdd(adapter, { projectPath, repo: currentRepo, isLocal: options.local || false }, name, alias, addOptions);
      } else if (mode === 'claude') {
        throw new Error('For Claude components, please use "ais claude skills/agents add" explicitly.');
      } else if (mode === 'trae') {
        throw new Error('For Trae components, please use "ais trae rules/skills add" explicitly.');
      } else if (mode === 'opencode') {
        throw new Error('For OpenCode components, please use "ais opencode agents/skills/commands/tools add" explicitly.');
      } else if (mode === 'agents-md') {
        throw new Error('For AGENTS.md files, please use "ais agents-md add" explicitly.');
      }
    } catch (error: any) {
      console.error(chalk.red('Error adding entry:'), error.message);
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove an entry (auto-detects cursor/copilot if unambiguous)')
  .argument('<alias>', 'Alias/name in the project to remove')
  .action(async (alias) => {
    try {
      const projectPath = process.cwd();
      const cfg = await getCombinedProjectConfig(projectPath);

      // Find which adapter contains this alias
      const found = findAdapterForAlias(cfg, alias);

      if (found) {
        await handleRemove(found.adapter, projectPath, alias);
      } else {
        // Alias not found in config, try to infer mode
        const mode = await inferDefaultMode(projectPath);
        if (mode === 'none' || mode === 'ambiguous') {
          requireExplicitMode(mode);
        }

        let adapter;
        if (mode === 'cursor') {
          adapter = getAdapter('cursor', 'rules');
        } else if (mode === 'copilot') {
          // Try to resolve the alias with suffix
          const resolved = resolveCopilotAliasFromConfig(alias, Object.keys(cfg.copilot?.instructions || {}));
          adapter = getAdapter('copilot', 'instructions');
          alias = resolved;
        } else if (mode === 'claude') {
          // Try all Claude adapters
          const claudeAdapters = adapterRegistry.getForTool('claude');
          for (const a of claudeAdapters) {
            await a.unlink(projectPath, alias);
            await a.removeDependency(projectPath, alias);
          }
          return;
        } else if (mode === 'trae') {
          const traeAdapters = adapterRegistry.getForTool('trae');
          for (const a of traeAdapters) {
            await a.unlink(projectPath, alias);
            await a.removeDependency(projectPath, alias);
          }
          return;
        } else {
          throw new Error(`Cannot determine which tool to use for alias "${alias}"`);
        }

        await handleRemove(adapter, projectPath, alias);
      }
    } catch (error: any) {
      console.error(chalk.red('Error removing entry:'), error.message);
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Install all entries from config (cursor + copilot + claude + trae)')
  .action(async () => {
    try {
      const projectPath = process.cwd();
      const mode = await inferDefaultMode(projectPath);

      if (mode === 'none') {
        console.log(chalk.yellow('No config found in ai-rules-sync*.json.'));
        return;
      }

      if (mode === 'cursor' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('cursor'), projectPath);
      }
      if (mode === 'copilot' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('copilot'), projectPath);
      }
      if (mode === 'claude' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('claude'), projectPath);
      }
      if (mode === 'trae' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('trae'), projectPath);
      }
      if (mode === 'opencode' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('opencode'), projectPath);
      }
      if (mode === 'codex' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('codex'), projectPath);
      }
      if (mode === 'gemini' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('gemini'), projectPath);
      }
      if (mode === 'agents-md' || mode === 'ambiguous') {
        await installEntriesForTool(adapterRegistry.getForTool('agents-md'), projectPath);
      }
    } catch (error: any) {
      console.error(chalk.red('Error installing entries:'), error.message);
      process.exit(1);
    }
  });

// Top-level add-all command
program
  .command('add-all')
  .description('Discover and install all configurations from rules repository')
  .option('--tools <tools>', 'Filter by tools (comma-separated): cursor,copilot,claude,trae,opencode,codex,gemini,agents-md')
  .option('--adapters <adapters>', 'Filter by adapters (comma-separated)')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory in format tool.subtype=path (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Parse source-dir overrides (no context, requires full tool.subtype=path format)
      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir);
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
          tools: options.tools?.split(','),
          adapters: options.adapters?.split(','),
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      // Print summary
      if (!options.quiet) {
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
      console.error(chalk.red('Error in add-all:'), error.message);
      process.exit(1);
    }
  });

// Top-level import command (auto-detect)
program
  .command('import <name>')
  .description('Import an existing file/directory to rules repository (auto-detects tool)')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-m, --message <message>', 'Custom git commit message')
  .option('-f, --force', 'Overwrite if entry already exists in repository')
  .option('-p, --push', 'Push to remote repository after commit')
  .action(async (name, options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Try to find the entry in project directories
      const allAdapters = adapterRegistry.all();
      let foundAdapter = null;

      for (const adapter of allAdapters) {
        const targetPath = path.join(projectPath, adapter.targetDir, name);
        if (await fs.pathExists(targetPath)) {
          foundAdapter = adapter;
          break;
        }
      }

      if (!foundAdapter) {
        throw new Error(`Entry "${name}" not found in any known location. Try: ais import cursor rules ${name}`);
      }

      console.log(chalk.gray(`Detected ${foundAdapter.tool} ${foundAdapter.subtype}: ${name}`));
      await handleImport(foundAdapter, { projectPath, repo: currentRepo, isLocal: options.local || false }, name, options);
    } catch (error: any) {
      console.error(chalk.red('Error importing entry:'), error.message);
      process.exit(1);
    }
  });

// ============ Cursor command group ============
const cursor = program
  .command('cursor')
  .description('Manage Cursor rules, commands, and skills in a project');

// cursor add (default to rules)
cursor
  .command('add <name> [alias]')
  .description('Sync Cursor rules to project (.cursor/rules/...)')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private rule)')
  .option('-d, --target-dir <dir>', 'Custom target directory for this entry')
  .action(async (name, alias, options) => {
    try {
      const repo = await getTargetRepo(program.opts());
      const adapter = getAdapter('cursor', 'rules');
      await handleAdd(adapter, { projectPath: process.cwd(), repo, isLocal: options.local || false }, name, alias, {
        local: options.local,
        targetDir: options.targetDir
      });
    } catch (error: any) {
      console.error(chalk.red('Error adding Cursor rule:'), error.message);
      process.exit(1);
    }
  });

// cursor remove (default to rules)
cursor
  .command('remove <alias>')
  .description('Remove a Cursor rule from project')
  .action(async (alias) => {
    try {
      const adapter = getAdapter('cursor', 'rules');
      await handleRemove(adapter, process.cwd(), alias);
    } catch (error: any) {
      console.error(chalk.red('Error removing Cursor rule:'), error.message);
      process.exit(1);
    }
  });

// cursor install
cursor
  .command('install')
  .description('Install all Cursor rules, commands, and skills from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('cursor'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Cursor entries:'), error.message);
      process.exit(1);
    }
  });

// cursor add-all
cursor
  .command('add-all')
  .description('Add all Cursor entries from repository')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Parse source-dir overrides with cursor as context tool
      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir, 'cursor');
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
          tools: ['cursor'],
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      if (!options.quiet) {
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
      console.error(chalk.red('Error in cursor add-all:'), error.message);
      process.exit(1);
    }
  });

// cursor import
cursor
  .command('import <name>')
  .description('Import Cursor rule/command/skill from project to repository (auto-detects subtype)')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-m, --message <message>', 'Custom git commit message')
  .option('-f, --force', 'Overwrite if entry already exists in repository')
  .option('-p, --push', 'Push to remote repository after commit')
  .action(async (name, options) => {
    try {
      const projectPath = process.cwd();
      const repo = await getTargetRepo(program.opts());
      const cursorAdapters = adapterRegistry.getForTool('cursor');
      let foundAdapter = null;

      for (const adapter of cursorAdapters) {
        const targetPath = path.join(projectPath, adapter.targetDir, name);
        if (await fs.pathExists(targetPath)) {
          foundAdapter = adapter;
          break;
        }
      }

      if (!foundAdapter) {
        throw new Error(`Entry "${name}" not found in .cursor/rules, .cursor/commands, .cursor/skills, or .cursor/agents.`);
      }

      console.log(chalk.gray(`Detected ${foundAdapter.subtype}: ${name}`));
      await handleImport(foundAdapter, { projectPath, repo, isLocal: options.local || false }, name, options);
    } catch (error: any) {
      console.error(chalk.red('Error importing Cursor entry:'), error.message);
      process.exit(1);
    }
  });

// cursor rules subgroup
const cursorRules = cursor.command('rules').description('Manage Cursor rules explicitly');
registerAdapterCommands({ adapter: getAdapter('cursor', 'rules'), parentCommand: cursorRules, programOpts: () => program.opts() });

// cursor commands subgroup
const cursorCommands = cursor.command('commands').description('Manage Cursor commands');
registerAdapterCommands({ adapter: getAdapter('cursor', 'commands'), parentCommand: cursorCommands, programOpts: () => program.opts() });

// cursor skills subgroup
const cursorSkills = cursor.command('skills').description('Manage Cursor skills');
registerAdapterCommands({ adapter: getAdapter('cursor', 'skills'), parentCommand: cursorSkills, programOpts: () => program.opts() });

// cursor agents subgroup
const cursorAgents = cursor.command('agents').description('Manage Cursor agents');
registerAdapterCommands({ adapter: getAdapter('cursor', 'agents'), parentCommand: cursorAgents, programOpts: () => program.opts() });

// ============ Copilot command group ============
const copilot = program.command('copilot').description('Manage GitHub Copilot configurations');

// copilot instructions subcommand
const copilotInstructions = copilot.command('instructions').description('Manage Copilot instructions');
registerAdapterCommands({
  parentCommand: copilotInstructions,
  adapter: copilotInstructionsAdapter,
  programOpts: () => program.opts()
});

// copilot skills subcommand
const copilotSkills = copilot.command('skills').description('Manage Copilot agent skills');
registerAdapterCommands({
  parentCommand: copilotSkills,
  adapter: copilotSkillsAdapter,
  programOpts: () => program.opts()
});

// copilot prompts subcommand
const copilotPrompts = copilot.command('prompts').description('Manage Copilot prompt files');
registerAdapterCommands({
  parentCommand: copilotPrompts,
  adapter: copilotPromptsAdapter,
  programOpts: () => program.opts()
});

// copilot agents subcommand
const copilotAgents = copilot.command('agents').description('Manage Copilot custom agents');
registerAdapterCommands({
  parentCommand: copilotAgents,
  adapter: copilotAgentsAdapter,
  programOpts: () => program.opts()
});

// copilot install - install all copilot entries
copilot
  .command('install')
  .description('Install all Copilot instructions, skills, prompts, and agents from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('copilot'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Copilot entries:'), error.message);
      process.exit(1);
    }
  });

// ============ Claude command group ============
const claude = program
  .command('claude')
  .description('Manage Claude skills and agents in a project');

// claude install
claude
  .command('install')
  .description('Install all Claude skills and agents from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('claude'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Claude entries:'), error.message);
      process.exit(1);
    }
  });

// claude add-all
claude
  .command('add-all')
  .description('Add all Claude entries from repository')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Parse source-dir overrides with claude as context tool
      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir, 'claude');
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
          tools: ['claude'],
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      if (!options.quiet) {
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
      console.error(chalk.red('Error in claude add-all:'), error.message);
      process.exit(1);
    }
  });

// claude skills subgroup
const claudeSkills = claude.command('skills').description('Manage Claude skills');
registerAdapterCommands({ adapter: getAdapter('claude', 'skills'), parentCommand: claudeSkills, programOpts: () => program.opts() });

// claude agents subgroup
const claudeAgents = claude.command('agents').description('Manage Claude agents');
registerAdapterCommands({ adapter: getAdapter('claude', 'agents'), parentCommand: claudeAgents, programOpts: () => program.opts() });

// claude rules subgroup
const claudeRules = claude.command('rules').description('Manage Claude rules (.claude/rules/)');
registerAdapterCommands({ adapter: getAdapter('claude', 'rules'), parentCommand: claudeRules, programOpts: () => program.opts() });

// ============ Trae command group ============
const trae = program
  .command('trae')
  .description('Manage Trae rules and skills in a project');

trae
  .command('install')
  .description('Install all Trae rules and skills from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('trae'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Trae entries:'), error.message);
      process.exit(1);
    }
  });

// trae add-all
trae
  .command('add-all')
  .description('Add all Trae entries from repository')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Parse source-dir overrides with trae as context tool
      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir, 'trae');
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
          tools: ['trae'],
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      if (!options.quiet) {
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
      console.error(chalk.red('Error in trae add-all:'), error.message);
      process.exit(1);
    }
  });

const traeRules = trae.command('rules').description('Manage Trae rules');
registerAdapterCommands({ adapter: getAdapter('trae', 'rules'), parentCommand: traeRules, programOpts: () => program.opts() });

const traeSkills = trae.command('skills').description('Manage Trae skills');
registerAdapterCommands({ adapter: getAdapter('trae', 'skills'), parentCommand: traeSkills, programOpts: () => program.opts() });

// ============ AGENTS.md command group ============
const agentsMd = program
  .command('agents-md')
  .description('Manage AGENTS.md files (agents.md standard)');

registerAdapterCommands({ adapter: getAdapter('agents-md', 'file'), parentCommand: agentsMd, programOpts: () => program.opts() });

// ============ OpenCode command group ============
const opencode = program
  .command('opencode')
  .description('Manage OpenCode agents, skills, commands, and tools in a project');

opencode
  .command('install')
  .description('Install all OpenCode agents, skills, commands, and tools from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('opencode'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing OpenCode entries:'), error.message);
      process.exit(1);
    }
  });

// opencode add-all
opencode
  .command('add-all')
  .description('Add all OpenCode entries from repository')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Parse source-dir overrides with opencode as context tool
      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir, 'opencode');
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
          tools: ['opencode'],
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      if (!options.quiet) {
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
      console.error(chalk.red('Error in opencode add-all:'), error.message);
      process.exit(1);
    }
  });

// opencode import
opencode
  .command('import <name>')
  .description('Import OpenCode agent/skill/command/tool from project to repository (auto-detects subtype)')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-m, --message <message>', 'Custom git commit message')
  .option('-f, --force', 'Overwrite if entry already exists in repository')
  .option('-p, --push', 'Push to remote repository after commit')
  .action(async (name, options) => {
    try {
      const projectPath = process.cwd();
      const repo = await getTargetRepo(program.opts());
      const opencodeAdapters = adapterRegistry.getForTool('opencode');
      let foundAdapter = null;

      for (const adapter of opencodeAdapters) {
        const targetPath = path.join(projectPath, adapter.targetDir, name);
        if (await fs.pathExists(targetPath)) {
          foundAdapter = adapter;
          break;
        }
      }

      if (!foundAdapter) {
        throw new Error(`Entry "${name}" not found in .opencode/agents, .opencode/skills, .opencode/commands, or .opencode/tools.`);
      }

      console.log(chalk.gray(`Detected ${foundAdapter.subtype}: ${name}`));
      await handleImport(foundAdapter, { projectPath, repo, isLocal: options.local || false }, name, options);
    } catch (error: any) {
      console.error(chalk.red('Error importing OpenCode entry:'), error.message);
      process.exit(1);
    }
  });

const opencodeAgents = opencode.command('agents').description('Manage OpenCode agents');
registerAdapterCommands({ adapter: getAdapter('opencode', 'agents'), parentCommand: opencodeAgents, programOpts: () => program.opts() });

const opencodeSkills = opencode.command('skills').description('Manage OpenCode skills');
registerAdapterCommands({ adapter: getAdapter('opencode', 'skills'), parentCommand: opencodeSkills, programOpts: () => program.opts() });

const opencodeCommands = opencode.command('commands').description('Manage OpenCode commands');
registerAdapterCommands({ adapter: getAdapter('opencode', 'commands'), parentCommand: opencodeCommands, programOpts: () => program.opts() });

const opencodeTools = opencode.command('tools').description('Manage OpenCode tools');
registerAdapterCommands({ adapter: getAdapter('opencode', 'tools'), parentCommand: opencodeTools, programOpts: () => program.opts() });

// ============ Codex command group ============
const codex = program
  .command('codex')
  .description('Manage Codex rules and skills in a project');

codex
  .command('install')
  .description('Install all Codex rules and skills from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('codex'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Codex entries:'), error.message);
      process.exit(1);
    }
  });

// codex add-all
codex
  .command('add-all')
  .description('Add all Codex entries from repository')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      // Parse source-dir overrides with codex as context tool
      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir, 'codex');
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
          tools: ['codex'],
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      if (!options.quiet) {
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
      console.error(chalk.red('Error in codex add-all:'), error.message);
      process.exit(1);
    }
  });

// codex import
codex
  .command('import <name>')
  .description('Import Codex rule/skill from project to repository (auto-detects subtype)')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-m, --message <message>', 'Custom git commit message')
  .option('-f, --force', 'Overwrite if entry already exists in repository')
  .option('-p, --push', 'Push to remote repository after commit')
  .action(async (name, options) => {
    try {
      const projectPath = process.cwd();
      const repo = await getTargetRepo(program.opts());
      const codexAdapters = adapterRegistry.getForTool('codex');
      let foundAdapter = null;

      for (const adapter of codexAdapters) {
        const targetPath = path.join(projectPath, adapter.targetDir, name);
        if (await fs.pathExists(targetPath)) {
          foundAdapter = adapter;
          break;
        }
      }

      if (!foundAdapter) {
        throw new Error(`Entry "${name}" not found in .codex/rules or .agents/skills.`);
      }

      console.log(chalk.gray(`Detected ${foundAdapter.subtype}: ${name}`));
      await handleImport(foundAdapter, { projectPath, repo, isLocal: options.local || false }, name, options);
    } catch (error: any) {
      console.error(chalk.red('Error importing Codex entry:'), error.message);
      process.exit(1);
    }
  });

const codexRules = codex.command('rules').description('Manage Codex rules');
registerAdapterCommands({ adapter: getAdapter('codex', 'rules'), parentCommand: codexRules, programOpts: () => program.opts() });

const codexSkills = codex.command('skills').description('Manage Codex skills');
registerAdapterCommands({ adapter: getAdapter('codex', 'skills'), parentCommand: codexSkills, programOpts: () => program.opts() });

// ============ Gemini CLI command group ============
const gemini = program
  .command('gemini')
  .description('Manage Gemini CLI commands, skills, and agents');

gemini
  .command('install')
  .description('Install all Gemini commands, skills, and agents from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('gemini'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Gemini entries:'), error.message);
      process.exit(1);
    }
  });

gemini
  .command('add-all')
  .description('Add all Gemini entries from repository')
  .option('--dry-run', 'Preview without making changes')
  .option('-f, --force', 'Overwrite existing entries')
  .option('-i, --interactive', 'Prompt for each entry')
  .option('-l, --local', 'Add to ai-rules-sync.local.json')
  .option('--skip-existing', 'Skip entries already in config')
  .option('--quiet', 'Minimal output')
  .option('-s, --source-dir <path>', 'Custom source directory (can be repeated)', collect)
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);

      let sourceDirOverrides;
      if (options.sourceDir && options.sourceDir.length > 0) {
        try {
          sourceDirOverrides = parseSourceDirParams(options.sourceDir, 'gemini');
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
          tools: ['gemini'],
          dryRun: options.dryRun,
          force: options.force,
          interactive: options.interactive,
          isLocal: options.local,
          skipExisting: options.skipExisting,
          quiet: options.quiet,
          sourceDirOverrides
        }
      );

      if (!options.quiet) {
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
      console.error(chalk.red('Error in gemini add-all:'), error.message);
      process.exit(1);
    }
  });

gemini
  .command('import <name>')
  .description('Import Gemini command/skill/agent from project to repository (auto-detects subtype)')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-m, --message <message>', 'Custom git commit message')
  .option('-f, --force', 'Overwrite if entry already exists in repository')
  .option('-p, --push', 'Push to remote repository after commit')
  .action(async (name, options) => {
    try {
      const projectPath = process.cwd();
      const repo = await getTargetRepo(program.opts());
      const geminiAdapters = adapterRegistry.getForTool('gemini');
      let foundAdapter = null;

      for (const adapter of geminiAdapters) {
        const targetPath = path.join(projectPath, adapter.targetDir, name);
        if (await fs.pathExists(targetPath)) {
          foundAdapter = adapter;
          break;
        }
      }

      if (!foundAdapter) {
        throw new Error(`Entry "${name}" not found in .gemini/commands, .gemini/skills, or .gemini/agents.`);
      }

      console.log(chalk.gray(`Detected ${foundAdapter.subtype}: ${name}`));
      await handleImport(foundAdapter, { projectPath, repo, isLocal: options.local || false }, name, options);
    } catch (error: any) {
      console.error(chalk.red('Error importing Gemini entry:'), error.message);
      process.exit(1);
    }
  });

const geminiCommands = gemini.command('commands').description('Manage Gemini commands');
registerAdapterCommands({ adapter: getAdapter('gemini', 'commands'), parentCommand: geminiCommands, programOpts: () => program.opts() });

const geminiSkills = gemini.command('skills').description('Manage Gemini skills');
registerAdapterCommands({ adapter: getAdapter('gemini', 'skills'), parentCommand: geminiSkills, programOpts: () => program.opts() });

const geminiAgents = gemini.command('agents').description('Manage Gemini agents');
registerAdapterCommands({ adapter: getAdapter('gemini', 'agents'), parentCommand: geminiAgents, programOpts: () => program.opts() });

// ============ Git command ============
program
  .command('git')
  .description('Run git commands in the rules repository')
  .argument('<args...>', 'Git command arguments')
  .action(async (args: string[]) => {
    try {
      const opts = program.opts();
      const currentRepo = await getTargetRepo(opts);
      await runGitCommand(args, currentRepo.path);
    } catch (error: any) {
      console.error(chalk.red('Error running git command:'), error.message);
      process.exit(1);
    }
  });

// ============ Internal _complete command ============
program
  .command('_complete')
  .argument('<type>', 'Type of completion: cursor, cursor-commands, cursor-skills, cursor-agents, copilot, claude-skills, claude-agents, claude-rules, trae-rules, trae-skills, opencode-agents, opencode-skills, opencode-commands, opencode-tools, codex-rules, codex-skills, gemini-commands, gemini-skills, gemini-agents, agents-md')
  .description('Internal command for shell completion')
  .action(async (type: string) => {
    try {
      const config = await getConfig();
      const currentRepo = config.currentRepo ? config.repos?.[config.currentRepo] : undefined;

      if (!currentRepo) {
        process.exit(0);
      }

      const repoDir = currentRepo.path;
      if (!await fs.pathExists(repoDir)) {
        process.exit(0);
      }

      const repoConfig = await getRepoSourceConfig(repoDir);
      let sourceDir: string;

      switch (type) {
        case 'cursor':
          sourceDir = getSourceDir(repoConfig, 'cursor', 'rules', '.cursor/rules');
          break;
        case 'cursor-commands':
          sourceDir = getSourceDir(repoConfig, 'cursor', 'commands', '.cursor/commands');
          break;
        case 'cursor-skills':
          sourceDir = getSourceDir(repoConfig, 'cursor', 'skills', '.cursor/skills');
          break;
        case 'cursor-agents':
          sourceDir = getSourceDir(repoConfig, 'cursor', 'agents', '.cursor/agents');
          break;
        case 'copilot':
          sourceDir = getSourceDir(repoConfig, 'copilot', 'instructions', '.github/instructions');
          break;
        case 'claude-skills':
          sourceDir = getSourceDir(repoConfig, 'claude', 'skills', '.claude/skills');
          break;
        case 'claude-agents':
          sourceDir = getSourceDir(repoConfig, 'claude', 'agents', '.claude/agents');
          break;
        case 'claude-rules':
          sourceDir = getSourceDir(repoConfig, 'claude', 'rules', '.claude/rules');
          break;
        case 'trae-rules':
          sourceDir = getSourceDir(repoConfig, 'trae', 'rules', '.trae/rules');
          break;
        case 'trae-skills':
          sourceDir = getSourceDir(repoConfig, 'trae', 'skills', '.trae/skills');
          break;
        case 'opencode-agents':
          sourceDir = getSourceDir(repoConfig, 'opencode', 'agents', '.opencode/agents');
          break;
        case 'opencode-skills':
          sourceDir = getSourceDir(repoConfig, 'opencode', 'skills', '.opencode/skills');
          break;
        case 'opencode-commands':
          sourceDir = getSourceDir(repoConfig, 'opencode', 'commands', '.opencode/commands');
          break;
        case 'opencode-tools':
          sourceDir = getSourceDir(repoConfig, 'opencode', 'tools', '.opencode/tools');
          break;
        case 'codex-rules':
          sourceDir = getSourceDir(repoConfig, 'codex', 'rules', '.codex/rules');
          break;
        case 'codex-skills':
          sourceDir = getSourceDir(repoConfig, 'codex', 'skills', '.agents/skills');
          break;
        case 'gemini-commands':
          sourceDir = getSourceDir(repoConfig, 'gemini', 'commands', '.gemini/commands');
          break;
        case 'gemini-skills':
          sourceDir = getSourceDir(repoConfig, 'gemini', 'skills', '.gemini/skills');
          break;
        case 'gemini-agents':
          sourceDir = getSourceDir(repoConfig, 'gemini', 'agents', '.gemini/agents');
          break;
        case 'agents-md':
          sourceDir = getSourceDir(repoConfig, 'agents-md', 'file', 'agents-md');
          break;
        default:
          process.exit(0);
      }

      const fullPath = path.join(repoDir, sourceDir);
      if (!await fs.pathExists(fullPath)) {
        process.exit(0);
      }

      const items = await fs.readdir(fullPath);
      for (const item of items) {
        if (!item.startsWith('.')) {
          console.log(item);
        }
      }
    } catch {
      process.exit(0);
    }
  });

// ============ Completion command group ============
const completionCmd = program
  .command('completion')
  .argument('[shell]', 'Shell type: bash, zsh, fish')
  .description('Output shell completion script')
  .action(async (shell?: string) => {
    if (!shell) {
      console.error('Please specify a shell type: bash, zsh, or fish');
      process.exit(1);
    }

    if (shell !== 'bash' && shell !== 'zsh' && shell !== 'fish') {
      console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
      process.exit(1);
    }

    console.log(getCompletionScript(shell));
  });

completionCmd
  .command('install')
  .description('Install shell completion to your shell config file')
  .option('-f, --force', 'Force reinstall even if already installed')
  .action(async (options) => {
    try {
      await forceInstallCompletion(options.force || false);
    } catch (error: any) {
      console.error(chalk.red('Error installing completion:'), error.message);
      process.exit(1);
    }
  });

// ============ Config command group ============
const configCmd = program
  .command('config')
  .description('Manage repository configuration');

// config repo <name> set-source
const configRepo = configCmd
  .command('repo')
  .description('Manage repository settings');

configRepo
  .command('set-source <repoName> <toolSubtype> <path>')
  .description('Set custom source directory for a repository (format: tool.subtype, e.g., cursor.rules)')
  .action(async (repoName: string, toolSubtype: string, sourcePath: string) => {
    try {
      await setRepoSourceDir(repoName, toolSubtype, sourcePath);
    } catch (error: any) {
      console.error(chalk.red('Error setting source directory:'), error.message);
      process.exit(1);
    }
  });

configRepo
  .command('clear-source <repoName> [toolSubtype]')
  .description('Clear source directory configuration (if toolSubtype omitted, clears all)')
  .action(async (repoName: string, toolSubtype?: string) => {
    try {
      await clearRepoSourceDir(repoName, toolSubtype);
    } catch (error: any) {
      console.error(chalk.red('Error clearing source directory:'), error.message);
      process.exit(1);
    }
  });

configRepo
  .command('show <repoName>')
  .description('Show repository configuration')
  .action(async (repoName: string) => {
    try {
      await showRepoConfig(repoName);
    } catch (error: any) {
      console.error(chalk.red('Error showing repository config:'), error.message);
      process.exit(1);
    }
  });

configRepo
  .command('list')
  .description('List all repositories')
  .action(async () => {
    try {
      await listRepos();
    } catch (error: any) {
      console.error(chalk.red('Error listing repositories:'), error.message);
      process.exit(1);
    }
  });

// ============ Run CLI ============
async function main() {
  await checkAndPromptCompletion();
  program.parse(process.argv);
}

main();
