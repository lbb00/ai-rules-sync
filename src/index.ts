#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { getConfig, setConfig, getReposBaseDir, getCurrentRepo, getUserConfigPath, getUserProjectConfig, RepoConfig } from './config.js';
import { cloneOrUpdateRepo, getRemoteUrl, runGitCommand } from './git.js';
import { addIgnoreEntry, isLocalPath, resolveLocalPath } from './utils.js';
import { getCombinedProjectConfig, getConfigSource, getRepoSourceConfig, getSourceDir, ProjectConfig } from './project-config.js';
import { checkAndPromptCompletion, forceInstallCompletion } from './completion.js';
import { getCompletionScript, resolveCompletionAdapter } from './completion/scripts.js';
import { adapterRegistry, getAdapter, findAdapterForAlias } from './adapters/index.js';
import { SyncAdapter } from './adapters/types.js';
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
  getToolsForInstallMode,
  resolveSingleAdapterForMode,
  DefaultMode
} from './commands/helpers.js';
import { handleAdd, handleRemove, handleImport } from './commands/handlers.js';
import { installEntriesForAdapter, installEntriesForTool, installAllUserEntries } from './commands/install.js';
import { discoverAllEntries, handleAddAll } from './commands/add-all.js';
import { parseSourceDirParams } from './cli/source-dir-parser.js';
import { parseCsvOption } from './cli/csv-option.js';
import { setRepoSourceDir, clearRepoSourceDir, showRepoConfig, listRepos, handleUserConfigShow, handleUserConfigSet, handleUserConfigReset } from './commands/config.js';
import { getFormattedVersion } from './commands/version.js';
import { checkRepositories, updateRepositories, initRulesRepository } from './commands/lifecycle.js';

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

function getAdapterEntryCount(config: ProjectConfig, adapter: SyncAdapter): number {
  const [topLevel, subLevel] = adapter.configPath;

  const topConfig = (config as any)[topLevel];
  if (!topConfig || typeof topConfig !== 'object') {
    return 0;
  }

  const section = topConfig[subLevel];
  if (!section || typeof section !== 'object') {
    return 0;
  }

  return Object.keys(section).length;
}

function collectToolCounts(config: ProjectConfig): { perTool: Record<string, number>; total: number } {
  const perTool: Record<string, number> = {};
  let total = 0;

  for (const adapter of adapterRegistry.all()) {
    const count = getAdapterEntryCount(config, adapter);
    if (count === 0) {
      continue;
    }
    perTool[adapter.tool] = (perTool[adapter.tool] || 0) + count;
    total += count;
  }

  return { perTool, total };
}

function formatCheckStatus(status: string): string {
  switch (status) {
    case 'up-to-date':
      return chalk.green('up-to-date');
    case 'update-available':
      return chalk.yellow('update-available');
    case 'diverged':
      return chalk.yellow('diverged');
    case 'ahead':
      return chalk.blue('ahead');
    case 'no-upstream':
      return chalk.gray('no-upstream');
    case 'missing-local':
      return chalk.yellow('missing-local');
    case 'not-configured':
      return chalk.yellow('not-configured');
    default:
      return chalk.red(status);
  }
}

program
  .name('ais')
  .description('AI Rules Sync - Sync agent rules from git repository')
  .version('0.7.0', '-v, --version', 'Display version information')
  .option('-t, --target <repoName>', 'Specify target rule repository (name or URL)');

// ============ Use command ============
program
  .command('use')
  .description('Configure rules repository (URL or local path)')
  .argument('[urlOrName]', 'Git repository URL, local path, or configured repo name')
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
      } else if (isLocalPath(urlOrName)) {
        const resolvedPath = await resolveLocalPath(urlOrName, process.cwd());
        if (!resolvedPath) {
          console.error(chalk.red(`Error: Path "${urlOrName}" does not exist or is not a directory.`));
          process.exit(1);
        }
        const remoteUrl = await getRemoteUrl(resolvedPath);
        const isGit = await fs.pathExists(path.join(resolvedPath, '.git'));

        if (isGit && remoteUrl) {
          // Git repo with remote: symlink to repos/ and use remote URL for portable config
          let name = path.basename(resolvedPath) || 'local-repo';
          const symlinkPath = path.join(getReposBaseDir(), name);

          if (await fs.pathExists(symlinkPath)) {
            const stat = await fs.lstat(symlinkPath);
            if (stat.isSymbolicLink()) {
              const target = await fs.realpath(symlinkPath);
              if (path.resolve(target) === path.resolve(resolvedPath)) {
                const existingRepo = config.repos?.[name] ?? { name, url: remoteUrl, path: symlinkPath };
                const newRepos = { ...(config.repos || {}), [name]: existingRepo };
                await setConfig({ currentRepo: name, repos: newRepos });
                console.log(chalk.green(`Switched to repository: ${name} (${resolvedPath})`));
                await cloneOrUpdateRepo(existingRepo);
                return;
              }
            }
            console.error(chalk.red(`Error: Repository "${name}" already exists at ${symlinkPath}.`));
            console.error(chalk.yellow(`  Use "ais use ${name}" to switch, or remove it first.`));
            process.exit(1);
          }

          for (const repo of Object.values(config.repos || {})) {
            if (repo.url === remoteUrl) {
              console.error(chalk.red(`Error: Repository with remote "${remoteUrl}" is already configured.`));
              console.error(chalk.yellow(`  Use "ais use <name>" to switch.`));
              process.exit(1);
            }
          }

          await fs.ensureDir(getReposBaseDir());
          await fs.symlink(resolvedPath, symlinkPath);
          const newRepo: RepoConfig = { name, url: remoteUrl, path: symlinkPath };
          const newRepos = { ...(config.repos || {}), [name]: newRepo };
          await setConfig({ currentRepo: name, repos: newRepos });
          console.log(chalk.green(`Configured repository: ${name} (${remoteUrl})`));
          console.log(chalk.gray(`  Symlinked: ${symlinkPath} -> ${resolvedPath}`));
          await cloneOrUpdateRepo(newRepo);
          console.log(chalk.green('Repository ready.'));
        } else {
          // Non-git or no remote: use path directly (legacy behavior)
          let name = path.basename(resolvedPath) || 'local-repo';
          if (config.repos && config.repos[name] && config.repos[name].path !== resolvedPath) {
            name = `${name}-${Date.now()}`;
          }
          const url = remoteUrl || resolvedPath;
          const newRepo: RepoConfig = { name, url, path: resolvedPath };
          const newRepos = { ...(config.repos || {}), [name]: newRepo };
          await setConfig({ currentRepo: name, repos: newRepos });
          console.log(chalk.green(`Configured local repository: ${name} (${resolvedPath})`));
          await cloneOrUpdateRepo(newRepo);
          console.log(chalk.green('Repository ready.'));
        }
      } else {
        console.error(chalk.red(`Error: Repository "${urlOrName}" not found in configuration.`));
        console.log(chalk.yellow(`Use "ais use <url>" or "ais use <local-path>" to add a repository.`));
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
  .alias('ls')
  .description('List all cursor rules git repositories')
  .option('--json', 'Output repositories as JSON')
  .action(async (cmdOptions: { json?: boolean }) => {
    const config = await getConfig();
    const repos = config.repos || {};
    const names = Object.keys(repos);

    if (cmdOptions.json) {
      const repositories = names.map(name => ({
        name,
        url: repos[name].url,
        path: repos[name].path,
        isCurrent: name === config.currentRepo
      }));
      console.log(JSON.stringify({
        currentRepo: config.currentRepo || null,
        repositories
      }, null, 2));
      return;
    }

    if (names.length === 0) {
      console.log(chalk.yellow('No repositories configured. Use "ais use [url]" to configure.'));
      return;
    }

    console.log(chalk.bold('Configured repositories:'));
    for (const name of names) {
      const repo = repos[name];
      const isCurrent = name === config.currentRepo;
      const prefix = isCurrent ? chalk.green('* ') : '  ';
      const isLocal = !repo.url.includes('://') && !repo.url.includes('git@');
      const repoLabel = isLocal ? repo.path : repo.url;
      console.log(`${prefix}${chalk.cyan(name)} ${chalk.gray(`(${repoLabel})`)}`);
      if (isCurrent && !isLocal) {
        console.log(`    Local path: ${repo.path}`);
      }
    }
  });

program
  .command('status')
  .description('Show repository and configuration status')
  .option('-u, --user', 'Include user config status')
  .option('--json', 'Output status as JSON')
  .action(async (cmdOptions: { user?: boolean; json?: boolean }) => {
    try {
      const globalConfig = await getConfig();
      const currentRepo = globalConfig.currentRepo ? globalConfig.repos?.[globalConfig.currentRepo] : undefined;
      const repoExists = currentRepo ? await fs.pathExists(currentRepo.path) : false;

      const projectPath = process.cwd();
      const projectConfigSource = await getConfigSource(projectPath);
      const projectConfig = await getCombinedProjectConfig(projectPath);
      const projectMode = await inferDefaultMode(projectPath);
      const projectCounts = collectToolCounts(projectConfig);

      let userStatus:
        | {
            path: string;
            exists: boolean;
            totalEntries: number;
            perTool: Record<string, number>;
          }
        | undefined;
      if (cmdOptions.user) {
        const userConfigPath = await getUserConfigPath();
        const userConfigExists = await fs.pathExists(userConfigPath);
        const userConfig = await getUserProjectConfig();
        const userCounts = collectToolCounts(userConfig);
        userStatus = {
          path: userConfigPath,
          exists: userConfigExists,
          totalEntries: userCounts.total,
          perTool: userCounts.perTool
        };
      }

      const statusPayload = {
        repository: currentRepo
          ? {
              name: currentRepo.name,
              url: currentRepo.url,
              path: currentRepo.path,
              exists: repoExists
            }
          : null,
        project: {
          path: projectPath,
          configSource: projectConfigSource,
          inferredMode: projectMode,
          totalEntries: projectCounts.total,
          perTool: projectCounts.perTool
        },
        user: userStatus
      };

      if (cmdOptions.json) {
        console.log(JSON.stringify(statusPayload, null, 2));
        return;
      }

      console.log(chalk.bold('Repository:'));
      if (!currentRepo) {
        console.log(chalk.yellow('  No repository configured. Use "ais use <url>" first.'));
      } else {
        console.log(`  Name: ${chalk.cyan(currentRepo.name)}`);
        console.log(`  URL: ${chalk.gray(currentRepo.url)}`);
        console.log(`  Path: ${currentRepo.path}`);
        console.log(`  Available locally: ${repoExists ? chalk.green('yes') : chalk.red('no')}`);
      }

      console.log(chalk.bold('\nProject:'));
      console.log(`  Path: ${projectPath}`);
      console.log(`  Config source: ${projectConfigSource}`);
      console.log(`  Inferred mode: ${projectMode}`);
      console.log(`  Configured entries: ${projectCounts.total}`);
      if (projectCounts.total > 0) {
        for (const [tool, count] of Object.entries(projectCounts.perTool)) {
          console.log(`    - ${tool}: ${count}`);
        }
      }

      if (userStatus) {
        console.log(chalk.bold('\nUser config:'));
        console.log(`  Path: ${userStatus.path}`);
        console.log(`  Exists: ${userStatus.exists ? chalk.green('yes') : chalk.red('no')}`);
        console.log(`  Configured entries: ${userStatus.totalEntries}`);
        if (userStatus.totalEntries > 0) {
          for (const [tool, count] of Object.entries(userStatus.perTool)) {
            console.log(`    - ${tool}: ${count}`);
          }
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error getting status:'), error.message);
      process.exit(1);
    }
  });

program
  .command('search [query]')
  .description('Search entries available in the rules repository')
  .option('--tools <tools>', 'Filter by tools (comma-separated)')
  .option('--adapters <adapters>', 'Filter by adapter names (comma-separated)')
  .option('--configured', 'Show only entries already in project config')
  .option('--unconfigured', 'Show only entries not in project config')
  .option('--json', 'Output search results as JSON')
  .action(async (query: string | undefined, cmdOptions: { tools?: string; adapters?: string; configured?: boolean; unconfigured?: boolean; json?: boolean }) => {
    try {
      if (cmdOptions.configured && cmdOptions.unconfigured) {
        throw new Error('Cannot use both --configured and --unconfigured together.');
      }

      const opts = program.opts();
      const repo = await getTargetRepo(opts);
      const tools = parseCsvOption(cmdOptions.tools);
      const adapters = parseCsvOption(cmdOptions.adapters);
      const normalizedQuery = (query || '').trim().toLowerCase();

      let entries = await discoverAllEntries(process.cwd(), repo, adapterRegistry, {
        tools,
        adapters
      });

      if (normalizedQuery) {
        entries = entries.filter(entry => {
          const haystacks = [
            entry.entryName,
            entry.sourceName,
            entry.adapter.name,
            entry.adapter.tool,
            entry.adapter.subtype
          ];
          return haystacks.some(value => value.toLowerCase().includes(normalizedQuery));
        });
      }

      if (cmdOptions.configured) {
        entries = entries.filter(entry => entry.alreadyInConfig);
      }
      if (cmdOptions.unconfigured) {
        entries = entries.filter(entry => !entry.alreadyInConfig);
      }

      const serialized = entries.map(entry => ({
        adapter: entry.adapter.name,
        tool: entry.adapter.tool,
        subtype: entry.adapter.subtype,
        entryName: entry.entryName,
        sourceName: entry.sourceName,
        isDirectory: entry.isDirectory,
        configured: entry.alreadyInConfig
      }));

      if (cmdOptions.json) {
        console.log(JSON.stringify({
          repository: {
            name: repo.name,
            url: repo.url
          },
          query: query || null,
          total: serialized.length,
          entries: serialized
        }, null, 2));
        return;
      }

      if (serialized.length === 0) {
        console.log(chalk.yellow('No matching entries found.'));
        return;
      }

      const grouped = new Map<string, typeof serialized>();
      for (const item of serialized) {
        const key = item.adapter;
        const list = grouped.get(key) || [];
        list.push(item);
        grouped.set(key, list);
      }

      console.log(chalk.bold(`Found ${serialized.length} entries:`));
      for (const [adapterName, items] of grouped) {
        console.log(chalk.cyan(`\n${adapterName} (${items.length})`));
        for (const item of items) {
          const flags: string[] = [];
          if (item.configured) flags.push('configured');
          if (item.isDirectory) flags.push('dir');
          const suffix = flags.length > 0 ? ` ${chalk.gray(`[${flags.join(', ')}]`)}` : '';
          console.log(`  - ${item.entryName}${suffix}`);
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error searching entries:'), error.message);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check for repository updates used by current config')
  .option('-u, --user', 'Check repositories from user config')
  .option('--no-fetch', 'Skip git fetch before checking')
  .option('--json', 'Output results as JSON')
  .action(async (cmdOptions: { user?: boolean; fetch?: boolean; json?: boolean }) => {
    try {
      const opts = program.opts();
      const result = await checkRepositories({
        projectPath: process.cwd(),
        user: cmdOptions.user,
        fetch: cmdOptions.fetch,
        target: opts.target
      });

      if (cmdOptions.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.total === 0) {
        console.log(chalk.yellow('No repository references found in the selected config.'));
        return;
      }

      console.log(chalk.bold(`Repository check (${result.scope} scope):`));
      for (const entry of result.entries) {
        const name = entry.repoName || entry.repoUrl;
        const counts =
          entry.status === 'update-available' || entry.status === 'ahead' || entry.status === 'diverged'
            ? chalk.gray(` (ahead ${entry.ahead}, behind ${entry.behind})`)
            : '';
        const detail = entry.message ? chalk.gray(` - ${entry.message}`) : '';
        console.log(`  - ${chalk.cyan(name)}: ${formatCheckStatus(entry.status)}${counts}${detail}`);
      }

      if (result.updateAvailable > 0) {
        console.log(chalk.yellow(`\n${result.updateAvailable} repositories have updates available.`));
      } else {
        console.log(chalk.green('\nAll repositories are up-to-date.'));
      }
    } catch (error: any) {
      console.error(chalk.red('Error checking repositories:'), error.message);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update repositories used by current config and reinstall entries')
  .option('-u, --user', 'Update repositories from user config')
  .option('--dry-run', 'Preview updates without pulling repositories')
  .option('--json', 'Output results as JSON')
  .action(async (cmdOptions: { user?: boolean; dryRun?: boolean; json?: boolean }) => {
    try {
      const opts = program.opts();
      const result = await updateRepositories({
        projectPath: process.cwd(),
        user: cmdOptions.user,
        dryRun: cmdOptions.dryRun,
        target: opts.target
      });

      if (cmdOptions.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.total === 0) {
        console.log(chalk.yellow('No repository references found in the selected config.'));
        return;
      }

      console.log(chalk.bold(`${result.dryRun ? '[DRY RUN] ' : ''}Repository update (${result.scope} scope):`));
      for (const entry of result.entries) {
        const name = entry.repoName || entry.repoUrl;
        const detail = entry.message ? chalk.gray(` - ${entry.message}`) : '';
        const commitChange = entry.beforeCommit || entry.afterCommit
          ? chalk.gray(` (${entry.beforeCommit || '-'} -> ${entry.afterCommit || '-'})`)
          : '';
        const actionColor =
          entry.action === 'updated'
            ? chalk.green(entry.action)
            : entry.action === 'error'
              ? chalk.red(entry.action)
              : entry.action === 'would-update' || entry.action === 'would-clone'
                ? chalk.yellow(entry.action)
                : chalk.gray(entry.action);
        console.log(`  - ${chalk.cyan(name)}: ${actionColor}${commitChange}${detail}`);
      }

      console.log(chalk.bold('\nSummary:'));
      console.log(`  Updated: ${chalk.green(String(result.updated))}`);
      console.log(`  Unchanged: ${chalk.gray(String(result.unchanged))}`);
      console.log(`  Failed: ${result.failed > 0 ? chalk.red(String(result.failed)) : chalk.gray('0')}`);
      if (!result.dryRun) {
        console.log(`  Reinstalled entries: ${result.reinstalled ? chalk.green('yes') : chalk.yellow('no')}`);
      }

      if (result.failed > 0) {
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('Error updating repositories:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init [name]')
  .description('Initialize an ai-rules-sync repository template')
  .option('-f, --force', 'Overwrite existing ai-rules-sync.json')
  .option('--no-dirs', 'Do not create default source directories')
  .option('--only <tools...>', 'Only include specified tools (e.g. cursor copilot claude)')
  .option('--exclude <tools...>', 'Exclude specified tools')
  .option('--json', 'Output results as JSON')
  .action(async (name: string | undefined, cmdOptions: { force?: boolean; dirs?: boolean; only?: string[]; exclude?: string[]; json?: boolean }) => {
    try {
      const result = await initRulesRepository({
        cwd: process.cwd(),
        name,
        force: cmdOptions.force,
        createDirs: cmdOptions.dirs,
        only: cmdOptions.only,
        exclude: cmdOptions.exclude
      });

      if (cmdOptions.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.green(`Initialized repository template at ${result.projectPath}`));
      console.log(chalk.gray(`Config: ${result.configPath}`));
      if (result.createdDirectories.length > 0) {
        console.log(chalk.gray(`Created ${result.createdDirectories.length} source directories.`));
      } else {
        console.log(chalk.gray('No source directories created.'));
      }
    } catch (error: any) {
      console.error(chalk.red('Error initializing repository template:'), error.message);
      process.exit(1);
    }
  });

// ============ Top-level shortcuts ============
program
  .command('add')
  .description('Add an entry (auto-detects cursor/copilot when unambiguous)')
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

      const adapter = resolveSingleAdapterForMode(mode, 'add');
      await handleAdd(adapter, { projectPath, repo: currentRepo, isLocal: options.local || false }, name, alias, addOptions);
    } catch (error: any) {
      console.error(chalk.red('Error adding entry:'), error.message);
      process.exit(1);
    }
  });

program
  .command('remove')
  .alias('rm')
  .description('Remove an entry (auto-detects cursor/copilot if unambiguous)')
  .argument('<alias>', 'Alias/name in the project to remove')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (alias, cmdOptions: { dryRun?: boolean }) => {
    try {
      const projectPath = process.cwd();
      const cfg = await getCombinedProjectConfig(projectPath);

      // Find which adapter contains this alias
      const found = findAdapterForAlias(cfg, alias);

      if (found) {
        await handleRemove(found.adapter, projectPath, alias, false, { dryRun: cmdOptions.dryRun });
      } else {
        // Alias not found in config, try to infer mode
        const mode = await inferDefaultMode(projectPath);
        if (mode === 'none' || mode === 'ambiguous') {
          requireExplicitMode(mode);
        }

        if (mode === 'copilot') {
          // Try to resolve the alias with suffix
          alias = resolveCopilotAliasFromConfig(alias, Object.keys((cfg.copilot as Record<string, unknown>)?.instructions || {}));
        }

        const adapter = resolveSingleAdapterForMode(mode, 'remove');
        await handleRemove(adapter, projectPath, alias, false, { dryRun: cmdOptions.dryRun });
      }
    } catch (error: any) {
      console.error(chalk.red('Error removing entry:'), error.message);
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Install all entries from config, or --user for user config')
  .option('-u, --user', 'Install all user config entries (~/.config/ai-rules-sync/user.json)')
  .action(async (cmdOptions: { user?: boolean }) => {
    try {
      if (cmdOptions.user) {
        await installAllUserEntries(adapterRegistry.all());
        return;
      }

      const projectPath = process.cwd();
      const mode = await inferDefaultMode(projectPath);

      if (mode === 'none') {
        console.log(chalk.yellow('No config found in ai-rules-sync*.json.'));
        return;
      }

      for (const tool of getToolsForInstallMode(mode)) {
        await installEntriesForTool(adapterRegistry.getForTool(tool), projectPath);
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
  .option('--tools <tools>', 'Filter by tools (comma-separated): cursor,copilot,claude,trae,opencode,codex,gemini,warp,windsurf,cline,agents-md')
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
          tools: parseCsvOption(options.tools),
          adapters: parseCsvOption(options.adapters),
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
  .option('--dry-run', 'Preview changes without applying')
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
  .alias('rm')
  .description('Remove a Cursor rule from project')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (alias, options: { dryRun?: boolean }) => {
    try {
      const adapter = getAdapter('cursor', 'rules');
      await handleRemove(adapter, process.cwd(), alias, false, { dryRun: options.dryRun });
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
  .option('--dry-run', 'Preview changes without applying')
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
const copilotInstructions = copilot.command('instructions').description('Manage GitHub Copilot instructions');
registerAdapterCommands({
  parentCommand: copilotInstructions,
  adapter: copilotInstructionsAdapter,
  programOpts: () => program.opts()
});

// copilot prompts subcommand
const copilotPrompts = copilot.command('prompts').description('Manage GitHub Copilot prompt files');
registerAdapterCommands({
  parentCommand: copilotPrompts,
  adapter: copilotPromptsAdapter,
  programOpts: () => program.opts()
});

// copilot skills subcommand
const copilotSkills = copilot.command('skills').description('Manage GitHub Copilot agent skills');
registerAdapterCommands({
  parentCommand: copilotSkills,
  adapter: copilotSkillsAdapter,
  programOpts: () => program.opts()
});

// copilot agents subcommand
const copilotAgents = copilot.command('agents').description('Manage GitHub Copilot custom agents');
registerAdapterCommands({
  parentCommand: copilotAgents,
  adapter: copilotAgentsAdapter,
  programOpts: () => program.opts()
});

// copilot install - install all copilot entries
copilot
  .command('install')
  .description('Install all GitHub Copilot instructions, prompts, skills, and agents from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('copilot'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing GitHub Copilot entries:'), error.message);
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

// claude rules subgroup
const claudeRules = claude.command('rules').description('Manage Claude rules (.claude/rules/)');
registerAdapterCommands({ adapter: getAdapter('claude', 'rules'), parentCommand: claudeRules, programOpts: () => program.opts() });

// claude skills subgroup
const claudeSkills = claude.command('skills').description('Manage Claude skills');
registerAdapterCommands({ adapter: getAdapter('claude', 'skills'), parentCommand: claudeSkills, programOpts: () => program.opts() });

// claude agents subgroup
const claudeAgents = claude.command('agents').description('Manage Claude agents');
registerAdapterCommands({ adapter: getAdapter('claude', 'agents'), parentCommand: claudeAgents, programOpts: () => program.opts() });

// claude md subgroup (for CLAUDE.md files)
const claudeMd = claude.command('md').description('Manage Claude CLAUDE.md files (.claude/CLAUDE.md)');
registerAdapterCommands({ adapter: getAdapter('claude', 'md'), parentCommand: claudeMd, programOpts: () => program.opts() });

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

const traeAgentsCmd = trae.command('agents').description('Manage Trae agents');
registerAdapterCommands({ adapter: getAdapter('trae', 'agents'), parentCommand: traeAgentsCmd, programOpts: () => program.opts() });

const traeCommandsCmd = trae.command('commands').description('Manage Trae commands');
registerAdapterCommands({ adapter: getAdapter('trae', 'commands'), parentCommand: traeCommandsCmd, programOpts: () => program.opts() });

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
  .option('--dry-run', 'Preview changes without applying')
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

const opencodeCommands = opencode.command('commands').description('Manage OpenCode commands');
registerAdapterCommands({ adapter: getAdapter('opencode', 'commands'), parentCommand: opencodeCommands, programOpts: () => program.opts() });

const opencodeSkills = opencode.command('skills').description('Manage OpenCode skills');
registerAdapterCommands({ adapter: getAdapter('opencode', 'skills'), parentCommand: opencodeSkills, programOpts: () => program.opts() });

const opencodeAgents = opencode.command('agents').description('Manage OpenCode agents');
registerAdapterCommands({ adapter: getAdapter('opencode', 'agents'), parentCommand: opencodeAgents, programOpts: () => program.opts() });

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
  .option('--dry-run', 'Preview changes without applying')
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

// codex md subgroup (for AGENTS.md files)
const codexMd = codex.command('md').description('Manage Codex AGENTS.md files (.codex/AGENTS.md)');
registerAdapterCommands({ adapter: getAdapter('codex', 'md'), parentCommand: codexMd, programOpts: () => program.opts() });

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
  .option('--dry-run', 'Preview changes without applying')
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

// gemini md subgroup (for GEMINI.md files)
const geminiMd = gemini.command('md').description('Manage Gemini GEMINI.md files (.gemini/GEMINI.md)');
registerAdapterCommands({ adapter: getAdapter('gemini', 'md'), parentCommand: geminiMd, programOpts: () => program.opts() });

// ============ CodeBuddy command group ============
const codebuddy = program
  .command('codebuddy')
  .description('Manage CodeBuddy assets in a project');

codebuddy
  .command('install')
  .description('Install all CodeBuddy entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('codebuddy'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing CodeBuddy entries:'), error.message);
      process.exit(1);
    }
  });

const codebuddyRules = codebuddy.command('rules').description('Manage CodeBuddy rules (.codebuddy/rules/)');
registerAdapterCommands({ adapter: getAdapter('codebuddy', 'rules'), parentCommand: codebuddyRules, programOpts: () => program.opts() });

const codebuddySkills = codebuddy.command('skills').description('Manage CodeBuddy skills');
registerAdapterCommands({ adapter: getAdapter('codebuddy', 'skills'), parentCommand: codebuddySkills, programOpts: () => program.opts() });

const codebuddyCommands = codebuddy.command('commands').description('Manage CodeBuddy commands');
registerAdapterCommands({ adapter: getAdapter('codebuddy', 'commands'), parentCommand: codebuddyCommands, programOpts: () => program.opts() });

const codebuddyMd = codebuddy.command('md').description('Manage CodeBuddy CODEBUDDY.md files');
registerAdapterCommands({ adapter: getAdapter('codebuddy', 'md'), parentCommand: codebuddyMd, programOpts: () => program.opts() });

// ============ Pi command group ============
const pi = program
  .command('pi')
  .description('Manage Pi Coding Agent assets in a project');

pi
  .command('install')
  .description('Install all Pi entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('pi'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Pi entries:'), error.message);
      process.exit(1);
    }
  });

const piSkills = pi.command('skills').description('Manage Pi skills (.pi/skills/)');
registerAdapterCommands({ adapter: getAdapter('pi', 'skills'), parentCommand: piSkills, programOpts: () => program.opts() });

const piPrompts = pi.command('prompts').description('Manage Pi prompts (.pi/prompts/)');
registerAdapterCommands({ adapter: getAdapter('pi', 'prompts'), parentCommand: piPrompts, programOpts: () => program.opts() });

// ============ Antigravity CLI command group ============
const agy = program
  .command('agy')
  .description('Manage Antigravity CLI assets in a project');

agy
  .command('install')
  .description('Install all Antigravity CLI entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('antigravity-cli'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Antigravity CLI entries:'), error.message);
      process.exit(1);
    }
  });

const agySkills = agy.command('skills').description('Manage Antigravity CLI skills (.agents/skills/)');
registerAdapterCommands({ adapter: getAdapter('antigravity-cli', 'skills'), parentCommand: agySkills, programOpts: () => program.opts() });

const agyWorkflows = agy.command('workflows').description('Manage Antigravity CLI workflows (.agents/workflows/)');
registerAdapterCommands({ adapter: getAdapter('antigravity-cli', 'workflows'), parentCommand: agyWorkflows, programOpts: () => program.opts() });

// ============ WorkBuddy command group ============
const workbuddy = program
  .command('workbuddy')
  .description('Manage WorkBuddy assets in a project');

workbuddy
  .command('install')
  .description('Install all WorkBuddy entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('workbuddy'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing WorkBuddy entries:'), error.message);
      process.exit(1);
    }
  });

const workbuddySkills = workbuddy.command('skills').description('Manage WorkBuddy skills (.workbuddy/skills/)');
registerAdapterCommands({ adapter: getAdapter('workbuddy', 'skills'), parentCommand: workbuddySkills, programOpts: () => program.opts() });

// ============ DeepSeek command group ============
const deepseek = program
  .command('deepseek')
  .description('Manage DeepSeek Harness assets in a project');

deepseek
  .command('install')
  .description('Install all DeepSeek entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('deepseek'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing DeepSeek entries:'), error.message);
      process.exit(1);
    }
  });

const deepseekSkills = deepseek.command('skills').description('Manage DeepSeek skills (.agents/skills/)');
registerAdapterCommands({ adapter: getAdapter('deepseek', 'skills'), parentCommand: deepseekSkills, programOpts: () => program.opts() });

// ============ Factory Droid command group ============
const factorydroid = program
  .command('droid')
  .description('Manage Factory Droid assets in a project');

factorydroid
  .command('install')
  .description('Install all Factory Droid entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('factorydroid'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Factory Droid entries:'), error.message);
      process.exit(1);
    }
  });

const factorydroidSkills = factorydroid.command('skills').description('Manage Factory Droid skills (.factory/skills/)');
registerAdapterCommands({ adapter: getAdapter('factorydroid', 'skills'), parentCommand: factorydroidSkills, programOpts: () => program.opts() });

const factorydroidCommands = factorydroid.command('commands').description('Manage Factory Droid commands (.factory/commands/)');
registerAdapterCommands({ adapter: getAdapter('factorydroid', 'commands'), parentCommand: factorydroidCommands, programOpts: () => program.opts() });

const factorydroidAgents = factorydroid.command('agents').description('Manage Factory Droid droids (.factory/droids/)');
registerAdapterCommands({ adapter: getAdapter('factorydroid', 'agents'), parentCommand: factorydroidAgents, programOpts: () => program.opts() });

// ============ Kimi command group ============
const kimi = program
  .command('kimi')
  .description('Manage Kimi Code assets in a project');

kimi
  .command('install')
  .description('Install all Kimi Code entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('kimi'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Kimi Code entries:'), error.message);
      process.exit(1);
    }
  });

const kimiSkills = kimi.command('skills').description('Manage Kimi Code skills (.kimi-code/skills/)');
registerAdapterCommands({ adapter: getAdapter('kimi', 'skills'), parentCommand: kimiSkills, programOpts: () => program.opts() });

const kimiAgents = kimi.command('agents').description('Manage Kimi Code agents (.kimi-code/agents/)');
registerAdapterCommands({ adapter: getAdapter('kimi', 'agents'), parentCommand: kimiAgents, programOpts: () => program.opts() });

// ============ Kilo command group ============
const kilo = program
  .command('kilo')
  .description('Manage Kilo Code assets in a project');

kilo
  .command('install')
  .description('Install all Kilo Code entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('kilo'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Kilo Code entries:'), error.message);
      process.exit(1);
    }
  });

const kiloSkills = kilo.command('skills').description('Manage Kilo Code skills (.kilo/skills/)');
registerAdapterCommands({ adapter: getAdapter('kilo', 'skills'), parentCommand: kiloSkills, programOpts: () => program.opts() });

const kiloCommands = kilo.command('commands').description('Manage Kilo Code commands (.kilo/commands/)');
registerAdapterCommands({ adapter: getAdapter('kilo', 'commands'), parentCommand: kiloCommands, programOpts: () => program.opts() });

const kiloAgents = kilo.command('agents').description('Manage Kilo Code agents (.kilo/agents/)');
registerAdapterCommands({ adapter: getAdapter('kilo', 'agents'), parentCommand: kiloAgents, programOpts: () => program.opts() });

// ============ Hermes command group ============
const hermes = program
  .command('hermes')
  .description('Manage Hermes Agent assets in a project');

hermes
  .command('install')
  .description('Install all Hermes entries from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('hermes'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Hermes entries:'), error.message);
      process.exit(1);
    }
  });

const hermesSkills = hermes.command('skills').description('Manage Hermes skills (.hermes/skills/)');
registerAdapterCommands({ adapter: getAdapter('hermes', 'skills'), parentCommand: hermesSkills, programOpts: () => program.opts() });

// ============ Junie command group ============
const junie = program.command('junie').description('Manage JetBrains Junie assets');
junie.command('install').description('Install all Junie entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('junie'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
['skills','agents','commands','rules'].forEach(s => {
  const c = junie.command(s).description(`Manage Junie ${s}`);
  registerAdapterCommands({ adapter: getAdapter('junie', s), parentCommand: c, programOpts: () => program.opts() });
});

// ============ Kiro command group ============
const kiroCli = program.command('kiro').description('Manage Kiro assets');
kiroCli.command('install').description('Install all Kiro entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('kiro'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
['skills','agents','rules'].forEach(s => {
  const c = kiroCli.command(s).description(`Manage Kiro ${s}`);
  registerAdapterCommands({ adapter: getAdapter('kiro', s), parentCommand: c, programOpts: () => program.opts() });
});

// ============ Qwen command group ============
const qwen = program.command('qwen').description('Manage Qwen Code assets');
qwen.command('install').description('Install all Qwen entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('qwen'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
['skills','agents','commands','rules'].forEach(s => {
  const c = qwen.command(s).description(`Manage Qwen ${s}`);
  registerAdapterCommands({ adapter: getAdapter('qwen', s), parentCommand: c, programOpts: () => program.opts() });
});

// ============ Augment command group ============
const augment = program.command('augment').description('Manage Augment Code assets');
augment.command('install').description('Install all Augment entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('augment'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
['skills','agents','commands','rules'].forEach(s => {
  const c = augment.command(s).description(`Manage Augment ${s}`);
  registerAdapterCommands({ adapter: getAdapter('augment', s), parentCommand: c, programOpts: () => program.opts() });
});

// ============ DeepAgents command group ============
const deepagents = program.command('deepagents').description('Manage DeepAgents CLI assets');
deepagents.command('install').description('Install all DeepAgents entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('deepagents'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
['skills','agents'].forEach(s => {
  const c = deepagents.command(s).description(`Manage DeepAgents ${s}`);
  registerAdapterCommands({ adapter: getAdapter('deepagents', s), parentCommand: c, programOpts: () => program.opts() });
});

// ============ Continue command group ============
const continueCli = program.command('continue').description('Manage Continue assets');
continueCli.command('install').description('Install all Continue entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('continue'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
['skills','rules','prompts'].forEach(s => {
  const c = continueCli.command(s).description(`Manage Continue ${s}`);
  registerAdapterCommands({ adapter: getAdapter('continue', s), parentCommand: c, programOpts: () => program.opts() });
});

// ============ Aider command group ============
const aider = program.command('aider').description('Manage Aider assets');
aider.command('install').description('Install all Aider entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('aider'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
const aiderSkillsCmd = aider.command('skills').description('Manage Aider skills');
registerAdapterCommands({ adapter: getAdapter('aider', 'skills'), parentCommand: aiderSkillsCmd, programOpts: () => program.opts() });

// ============ Zed command group ============
const zed = program.command('zed').description('Manage Zed editor assets');
zed.command('install').description('Install all Zed entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('zed'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
const zedSkillsCmd = zed.command('skills').description('Manage Zed skills');
registerAdapterCommands({ adapter: getAdapter('zed', 'skills'), parentCommand: zedSkillsCmd, programOpts: () => program.opts() });

// ============ Goose command group ============
const goose = program.command('goose').description('Manage Goose (Block) assets');
goose.command('install').description('Install all Goose entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('goose'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
const gooseSkillsCmd = goose.command('skills').description('Manage Goose skills');
registerAdapterCommands({ adapter: getAdapter('goose', 'skills'), parentCommand: gooseSkillsCmd, programOpts: () => program.opts() });

// ============ Amp command group ============
const amp = program.command('amp').description('Manage Amp assets');
amp.command('install').description('Install all Amp entries').action(async () => {
  try { await installEntriesForTool(adapterRegistry.getForTool('amp'), process.cwd()); }
  catch (e: any) { console.error(chalk.red('Error:'), e.message); process.exit(1); }
});
const ampSkillsCmd = amp.command('skills').description('Manage Amp skills');
registerAdapterCommands({ adapter: getAdapter('amp', 'skills'), parentCommand: ampSkillsCmd, programOpts: () => program.opts() });

// ============ Warp command group ============
const warp = program
  .command('warp')
  .description('Manage Warp skills in a project');

warp
  .command('install')
  .description('Install all Warp skills from config')
  .action(async () => {
    try {
      await installEntriesForTool(adapterRegistry.getForTool('warp'), process.cwd());
    } catch (error: any) {
      console.error(chalk.red('Error installing Warp entries:'), error.message);
      process.exit(1);
    }
  });

warp
  .command('import <name>')
  .description('Import Warp skill from project to repository')
  .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
  .option('-m, --message <message>', 'Custom git commit message')
  .option('-f, --force', 'Overwrite if entry already exists in repository')
  .option('-p, --push', 'Push to remote repository after commit')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (name, options) => {
    try {
      const repo = await getTargetRepo(program.opts());
      await handleImport(getAdapter('warp', 'skills'), { projectPath: process.cwd(), repo, isLocal: options.local || false }, name, options);
    } catch (error: any) {
      console.error(chalk.red('Error importing Warp skill:'), error.message);
      process.exit(1);
    }
  });

const warpSkills = warp.command('skills').description('Manage Warp skills');
registerAdapterCommands({ adapter: getAdapter('warp', 'skills'), parentCommand: warpSkills, programOpts: () => program.opts() });

interface RulesAndSkillsToolGroupOptions {
  tool: 'windsurf' | 'cline';
  displayName: string;
  rulesPathHint: string;
  importSearchHint: string;
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

async function findImportAdapterForTool(
  tool: 'windsurf' | 'cline',
  projectPath: string,
  name: string
): Promise<SyncAdapter | null> {
  const adapters = adapterRegistry.getForTool(tool);
  for (const adapter of adapters) {
    const targetPath = path.join(projectPath, adapter.targetDir, name);
    if (await fs.pathExists(targetPath)) {
      return adapter;
    }
  }
  return null;
}

function registerRulesAndSkillsToolGroup(config: RulesAndSkillsToolGroupOptions): void {
  const { tool, displayName, rulesPathHint, importSearchHint } = config;
  const group = program
    .command(tool)
    .description(`Manage ${displayName} rules and skills in a project`);

  group
    .command('add <name> [alias]')
    .description(`Sync ${displayName} rules to project (${rulesPathHint}/...)`)
    .option('-l, --local', 'Add to ai-rules-sync.local.json (private rule)')
    .option('-d, --target-dir <dir>', 'Custom target directory for this entry')
    .action(async (name, alias, options) => {
      try {
        const repo = await getTargetRepo(program.opts());
        const adapter = getAdapter(tool, 'rules');
        await handleAdd(adapter, { projectPath: process.cwd(), repo, isLocal: options.local || false }, name, alias, {
          local: options.local,
          targetDir: options.targetDir
        });
      } catch (error: any) {
        console.error(chalk.red(`Error adding ${displayName} rule:`), error.message);
        process.exit(1);
      }
    });

  group
    .command('remove <alias>')
    .alias('rm')
    .description(`Remove a ${displayName} rule from project`)
    .option('--dry-run', 'Preview changes without applying')
    .action(async (alias, options: { dryRun?: boolean }) => {
      try {
        const adapter = getAdapter(tool, 'rules');
        await handleRemove(adapter, process.cwd(), alias, false, { dryRun: options.dryRun });
      } catch (error: any) {
        console.error(chalk.red(`Error removing ${displayName} rule:`), error.message);
        process.exit(1);
      }
    });

  group
    .command('install')
    .description(`Install all ${displayName} rules and skills from config`)
    .action(async () => {
      try {
        await installEntriesForTool(adapterRegistry.getForTool(tool), process.cwd());
      } catch (error: any) {
        console.error(chalk.red(`Error installing ${displayName} entries:`), error.message);
        process.exit(1);
      }
    });

  group
    .command('add-all')
    .description(`Add all ${displayName} entries from repository`)
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
        console.error(chalk.red(`Error in ${tool} add-all:`), error.message);
        process.exit(1);
      }
    });

  group
    .command('import <name>')
    .description(`Import ${displayName} rule/skill from project to repository (auto-detects subtype)`)
    .option('-l, --local', 'Add to ai-rules-sync.local.json (private)')
    .option('-m, --message <message>', 'Custom git commit message')
    .option('-f, --force', 'Overwrite if entry already exists in repository')
    .option('-p, --push', 'Push to remote repository after commit')
    .option('--dry-run', 'Preview changes without applying')
    .action(async (name, options) => {
      try {
        const projectPath = process.cwd();
        const repo = await getTargetRepo(program.opts());
        const foundAdapter = await findImportAdapterForTool(tool, projectPath, name);
        if (!foundAdapter) {
          throw new Error(`Entry "${name}" not found in ${importSearchHint}.`);
        }

        console.log(chalk.gray(`Detected ${foundAdapter.subtype}: ${name}`));
        await handleImport(foundAdapter, { projectPath, repo, isLocal: options.local || false }, name, options);
      } catch (error: any) {
        console.error(chalk.red(`Error importing ${displayName} entry:`), error.message);
        process.exit(1);
      }
    });

  const rules = group.command('rules').description(`Manage ${displayName} rules`);
  registerAdapterCommands({ adapter: getAdapter(tool, 'rules'), parentCommand: rules, programOpts: () => program.opts() });

  const skills = group.command('skills').description(`Manage ${displayName} skills`);
  registerAdapterCommands({ adapter: getAdapter(tool, 'skills'), parentCommand: skills, programOpts: () => program.opts() });
}

// ============ Windsurf / Cline command groups ============
registerRulesAndSkillsToolGroup({
  tool: 'windsurf',
  displayName: 'Windsurf',
  rulesPathHint: '.windsurf/rules',
  importSearchHint: '.windsurf/rules or .windsurf/skills'
});

registerRulesAndSkillsToolGroup({
  tool: 'cline',
  displayName: 'Cline',
  rulesPathHint: '.clinerules',
  importSearchHint: '.clinerules or .cline/skills'
});

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
  .argument('<type>', `Type of completion (tool-subtype identifier, e.g. cursor-rules, codex-skills): ${adapterRegistry.all().map(adapter => adapter.name).join(', ')}`)
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

      // Every completion type the generated bash/zsh/fish scripts can emit is
      // an adapter name (or a legacy alias from a previously installed
      // script) — resolveCompletionAdapter is the single source of truth
      // shared with the generator, so no adapter can silently fall through here.
      const adapter = resolveCompletionAdapter(type);
      if (!adapter) {
        process.exit(0);
      }

      const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
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
  .option('--json', 'Output configuration as JSON')
  .action(async (repoName: string, options: { json?: boolean }) => {
    try {
      await showRepoConfig(repoName, { json: options.json });
    } catch (error: any) {
      console.error(chalk.red('Error showing repository config:'), error.message);
      process.exit(1);
    }
  });

configRepo
  .command('list')
  .alias('ls')
  .description('List all repositories')
  .option('--json', 'Output repositories as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      await listRepos({ json: options.json });
    } catch (error: any) {
      console.error(chalk.red('Error listing repositories:'), error.message);
      process.exit(1);
    }
  });

// config user subgroup
const configUser = configCmd
  .command('user')
  .description('Manage user config path (~/.config/ai-rules-sync/user.json)');

configUser
  .command('show')
  .description('Show current user config path')
  .action(async () => {
    try {
      await handleUserConfigShow();
    } catch (error: any) {
      console.error(chalk.red('Error showing user config path:'), error.message);
      process.exit(1);
    }
  });

configUser
  .command('set <path>')
  .description('Set custom user config path (supports ~ for home dir)')
  .action(async (customPath: string) => {
    try {
      await handleUserConfigSet(customPath);
    } catch (error: any) {
      console.error(chalk.red('Error setting user config path:'), error.message);
      process.exit(1);
    }
  });

configUser
  .command('reset')
  .description('Reset user config path to default')
  .action(async () => {
    try {
      await handleUserConfigReset();
    } catch (error: any) {
      console.error(chalk.red('Error resetting user config path:'), error.message);
      process.exit(1);
    }
  });

// ============ User command group ============
const userCmd = program
  .command('user')
  .description('Manage user-level AI config files (~/.claude/CLAUDE.md, ~/.gemini/GEMINI.md, ~/.codex/AGENTS.md, etc.)');

userCmd
  .command('install')
  .description('Install all user config entries from user.json')
  .action(async () => {
    try {
      await installAllUserEntries(adapterRegistry.all());
    } catch (error: any) {
      console.error(chalk.red('Error installing user entries:'), error.message);
      process.exit(1);
    }
  });

// ============ Run CLI ============
async function main() {
  await checkAndPromptCompletion();
  program.parse(process.argv);
}

main();
