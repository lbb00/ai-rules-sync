#!/usr/bin/env node
import { Command, Help } from 'commander';
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
import { adapterRegistry } from './adapters/index.js';
import { SyncAdapter } from './adapters/types.js';
import { registerToolGroup } from './cli/tool-group.js';
import { registerBroadcastGroups } from './cli/broadcast.js';
import { cliNameForTool } from './adapters/cli-groups.js';
import {
  getTargetRepo,
  resolveCommandAliasFromConfig
} from './commands/helpers.js';
import { handleImport } from './commands/handlers.js';
import { installEntriesForAdapter, installEntriesForTool, installAllUserEntries } from './commands/install.js';
import { discoverAllEntries, handleAddAll } from './commands/add-all.js';
import { parseSourceDirParams } from './cli/source-dir-parser.js';
import { parseCsvOption } from './cli/csv-option.js';
import { setRepoSourceDir, clearRepoSourceDir, showRepoConfig, listRepos, handleUserConfigShow, handleUserConfigSet, handleUserConfigReset } from './commands/config.js';
import { getFormattedVersion } from './commands/version.js';
import { checkRepositories, updateRepositories, initRulesRepository } from './commands/lifecycle.js';
import { runDoctor } from './commands/doctor.js';

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
  .command('doctor')
  .description('Verify configured entries have healthy symlinks (read-only)')
  .option('-u, --user', 'Also check user config entries')
  .option('--json', 'Output results as JSON')
  .action(async (cmdOptions: { user?: boolean; json?: boolean }) => {
    try {
      const globalConfig = await getConfig();
      const result = await runDoctor(adapterRegistry.all(), process.cwd(), globalConfig.repos || {}, { user: cmdOptions.user });

      if (cmdOptions.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.entries.length === 0) {
        console.log(chalk.yellow('No configured entries found.'));
      } else {
        const problems = result.entries.filter(e => e.status !== 'ok');
        if (problems.length === 0) {
          console.log(chalk.green(`All ${result.entries.length} entries are healthy.`));
        } else {
          console.log(chalk.bold(`${problems.length} of ${result.entries.length} entries need attention:\n`));
          for (const entry of problems) {
            const label =
              entry.status === 'missing' ? chalk.yellow('missing ') :
              entry.status === 'conflict' ? chalk.red('conflict') :
              chalk.yellow('stale   ');
            const scope = entry.scope === 'user' ? ' (user)' : '';
            console.log(`  ${label}  ${entry.tool}/${entry.subtype} ${entry.alias}${scope} -> ${entry.targetPath}`);
          }
          console.log(chalk.gray('\nmissing: run "ais install" (or "ais install -g" for user entries) to relink.'));
          console.log(chalk.gray('conflict: a real file/dir sits where a symlink should be — resolve manually before installing.'));
          console.log(chalk.gray('stale: the symlink points to something other than the current repo source, or the source repo isn\'t available to verify.'));
        }
      }

      if (result.counts.missing > 0 || result.counts.conflict > 0 || result.counts.stale > 0) {
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('Error running doctor:'), error.message);
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

// ============ Install command ============
// Explicit-only: no mode inference. Project scope installs every adapter's
// already-configured entries (each adapter prints its own "No X Y found"
// and moves on when it has nothing to do — see installEntriesForAdapter).
// -g/-u (aliases of each other, matching the <tool> install convention in
// cli/tool-group.ts) install from user.json instead, folding in what used
// to be the separate `ais user install` command (design §6.4).
program
  .command('install')
  .description('Install all entries from config (project scope by default)')
  .option('-g, --global', 'Install all user config entries (~/.config/ai-rules-sync/user.json)')
  .option('-u, --user', 'Alias for --global')
  .option('--json', 'Output results as JSON')
  .action(async (cmdOptions: { global?: boolean; user?: boolean; json?: boolean }) => {
    try {
      const isGlobal = !!(cmdOptions.global || cmdOptions.user);

      if (isGlobal) {
        if (cmdOptions.json) {
          await withSilencedConsole(() => installAllUserEntries(adapterRegistry.all()));
          const counts = collectToolCounts(await getUserProjectConfig());
          console.log(JSON.stringify({ scope: 'user', totalEntries: counts.total, perTool: counts.perTool }, null, 2));
        } else {
          await installAllUserEntries(adapterRegistry.all());
        }
        return;
      }

      const projectPath = process.cwd();
      if (cmdOptions.json) {
        await withSilencedConsole(() => installEntriesForTool(adapterRegistry.all(), projectPath));
        const counts = collectToolCounts(await getCombinedProjectConfig(projectPath));
        console.log(JSON.stringify({ scope: 'project', totalEntries: counts.total, perTool: counts.perTool }, null, 2));
      } else {
        await installEntriesForTool(adapterRegistry.all(), projectPath);
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

// ============ Tool command groups (registry-driven) ============
// Every adapter registered in adapterRegistry gets its full ais <tool>
// command set (subtype subgroups + install/add-all/import + hidden
// add/remove stubs) from registerToolGroup — see src/cli/tool-group.ts.
const allTools = Array.from(new Set(adapterRegistry.all().map(a => a.tool)));
for (const tool of allTools) {
  registerToolGroup(program, tool);
}

// ============ Broadcast command groups (registry-driven) ============
// ais <subtype> add/remove/list — cross-tool complement to the tool groups
// above. See src/cli/broadcast.ts and design doc §5.
registerBroadcastGroups(program);

// ============ Top-level --help: fold 30 tool groups into one index line ============
// Listed flat in Commander's default Commands: section, the tool groups
// registered above drown out the handful of commands most users actually
// need (design §6.5). configureHelp is per-command, not inherited by
// children — Command.createHelp() reads `this._helpConfiguration`, so this
// only reshapes `ais --help` itself; `ais <tool> --help` / `ais <subtype>
// --help` build their own default Help instance and are untouched.
const toolCliNames = new Set(allTools.map(cliNameForTool));
program.configureHelp({
  visibleCommands: (cmd) => new Help().visibleCommands(cmd).filter(c => !toolCliNames.has(c.name()))
});
program.addHelpText('after', () =>
  `\nTools: ${[...toolCliNames].sort().join(', ')} (ais <tool> --help for details)\n`
);

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

// ============ Run CLI ============
async function main() {
  await checkAndPromptCompletion();
  program.parse(process.argv);
}

main();
