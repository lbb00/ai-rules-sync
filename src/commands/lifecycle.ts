import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { adapterRegistry } from '../adapters/index.js';
import { RepoConfig, getConfig, setConfig, getReposBaseDir, getUserProjectConfig } from '../config.js';
import { cloneOrUpdateRepo } from '../git.js';
import { ProjectConfig, RuleEntry, SourceDirConfig, getCombinedProjectConfig } from '../project-config.js';
import { installAllUserEntries, installEntriesForAdapter } from './install.js';

type CheckStatus =
  | 'up-to-date'
  | 'update-available'
  | 'ahead'
  | 'diverged'
  | 'no-upstream'
  | 'missing-local'
  | 'not-configured'
  | 'error';

export interface RepoCheckEntry {
  repoUrl: string;
  repoName?: string;
  localPath?: string;
  status: CheckStatus;
  ahead: number;
  behind: number;
  currentCommit?: string;
  upstreamRef?: string;
  message?: string;
}

export interface CheckResult {
  scope: 'project' | 'user';
  total: number;
  updateAvailable: number;
  entries: RepoCheckEntry[];
}

export interface CheckOptions {
  projectPath: string;
  user?: boolean;
  fetch?: boolean;
  target?: string;
}

export type UpdateAction = 'updated' | 'unchanged' | 'would-update' | 'would-clone' | 'error';

export interface UpdateEntry {
  repoUrl: string;
  repoName: string;
  localPath: string;
  action: UpdateAction;
  beforeCommit?: string;
  afterCommit?: string;
  message?: string;
}

export interface UpdateResult {
  scope: 'project' | 'user';
  dryRun: boolean;
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  reinstalled: boolean;
  entries: UpdateEntry[];
}

export interface InitOptions {
  cwd: string;
  name?: string;
  force?: boolean;
  createDirs?: boolean;
  only?: string[];
  exclude?: string[];
}

export interface InitResult {
  projectPath: string;
  configPath: string;
  createdDirectories: string[];
}

function isUrlLike(target: string): boolean {
  return target.includes('://') || target.includes('git@') || target.endsWith('.git');
}

function getConfigSection(config: ProjectConfig, configPath: [string, string]): Record<string, RuleEntry> {
  const [topLevel, subLevel] = configPath;
  if (topLevel === 'agentsMd') {
    return ((config as any).agentsMd || {}) as Record<string, RuleEntry>;
  }
  return (((config as any)[topLevel] || {})[subLevel] || {}) as Record<string, RuleEntry>;
}

function collectRepoUrls(config: ProjectConfig): string[] {
  const repoUrls = new Set<string>();

  for (const adapter of adapterRegistry.all()) {
    const section = getConfigSection(config, adapter.configPath);
    for (const value of Object.values(section)) {
      if (typeof value === 'string') {
        repoUrls.add(value);
        continue;
      }
      if (value && typeof value === 'object' && typeof value.url === 'string') {
        repoUrls.add(value.url);
      }
    }
  }

  return Array.from(repoUrls);
}

function filterRepoUrls(repoUrls: string[], repos: Record<string, RepoConfig>, target?: string): string[] {
  if (!target) return repoUrls;

  const matchByName = repos[target];
  if (matchByName) {
    return repoUrls.filter(url => url === matchByName.url);
  }

  if (isUrlLike(target)) {
    return repoUrls.filter(url => url === target);
  }

  throw new Error(`Repository "${target}" not found in configuration.`);
}

function findRepoByUrl(repos: Record<string, RepoConfig>, repoUrl: string): RepoConfig | undefined {
  for (const repo of Object.values(repos)) {
    if (repo.url === repoUrl) {
      return repo;
    }
  }
  return undefined;
}

async function ensureRepoByUrl(repos: Record<string, RepoConfig>, repoUrl: string): Promise<RepoConfig> {
  const existing = findRepoByUrl(repos, repoUrl);
  if (existing) return existing;

  let name = path.basename(repoUrl, '.git');
  if (!name) {
    name = `repo-${Date.now()}`;
  }

  if (repos[name] && repos[name].url !== repoUrl) {
    name = `${name}-${Date.now()}`;
  }

  const repoConfig: RepoConfig = {
    name,
    url: repoUrl,
    path: path.join(getReposBaseDir(), name)
  };

  const newRepos = { ...repos, [name]: repoConfig };
  await setConfig({ repos: newRepos });
  repos[name] = repoConfig;
  return repoConfig;
}

async function runGit(repoPath: string, args: string[]): Promise<string> {
  const result = await execa('git', args, { cwd: repoPath });
  return result.stdout.trim();
}

async function safeRunGit(repoPath: string, args: string[]): Promise<string | undefined> {
  try {
    return await runGit(repoPath, args);
  } catch {
    return undefined;
  }
}

async function inspectRepo(repoUrl: string, repo: RepoConfig, shouldFetch: boolean): Promise<RepoCheckEntry> {
  const gitPath = path.join(repo.path, '.git');
  const hasRepoDir = await fs.pathExists(repo.path);
  const hasGitDir = hasRepoDir && await fs.pathExists(gitPath);

  if (!hasRepoDir || !hasGitDir) {
    return {
      repoUrl,
      repoName: repo.name,
      localPath: repo.path,
      status: 'missing-local',
      ahead: 0,
      behind: 0,
      message: 'Repository is not cloned locally.'
    };
  }

  if (shouldFetch) {
    try {
      await runGit(repo.path, ['fetch', '--quiet']);
    } catch (error: any) {
      return {
        repoUrl,
        repoName: repo.name,
        localPath: repo.path,
        status: 'error',
        ahead: 0,
        behind: 0,
        message: `git fetch failed: ${error.message}`
      };
    }
  }

  const currentCommit = await safeRunGit(repo.path, ['rev-parse', '--short', 'HEAD']);
  const upstreamRef = await safeRunGit(repo.path, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);

  if (!upstreamRef) {
    return {
      repoUrl,
      repoName: repo.name,
      localPath: repo.path,
      status: 'no-upstream',
      ahead: 0,
      behind: 0,
      currentCommit,
      message: 'No upstream branch configured.'
    };
  }

  const counts = await safeRunGit(repo.path, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
  if (!counts) {
    return {
      repoUrl,
      repoName: repo.name,
      localPath: repo.path,
      status: 'error',
      ahead: 0,
      behind: 0,
      currentCommit,
      upstreamRef,
      message: 'Failed to compare local and upstream commits.'
    };
  }

  const [aheadRaw, behindRaw] = counts.split(/\s+/);
  const ahead = Number.parseInt(aheadRaw || '0', 10);
  const behind = Number.parseInt(behindRaw || '0', 10);

  let status: CheckStatus = 'up-to-date';
  if (ahead > 0 && behind > 0) {
    status = 'diverged';
  } else if (behind > 0) {
    status = 'update-available';
  } else if (ahead > 0) {
    status = 'ahead';
  }

  return {
    repoUrl,
    repoName: repo.name,
    localPath: repo.path,
    status,
    ahead,
    behind,
    currentCommit,
    upstreamRef
  };
}

async function getScopeRepoUrls(options: CheckOptions): Promise<{ scope: 'project' | 'user'; repoUrls: string[]; repos: Record<string, RepoConfig> }> {
  const scope = options.user ? 'user' : 'project';
  const projectConfig = options.user
    ? await getUserProjectConfig()
    : await getCombinedProjectConfig(options.projectPath);
  const config = await getConfig();
  const repos = config.repos || {};

  const repoUrls = filterRepoUrls(collectRepoUrls(projectConfig), repos, options.target);
  return { scope, repoUrls, repos };
}

async function reinstallScopeEntries(scope: 'project' | 'user', projectPath: string): Promise<void> {
  if (scope === 'user') {
    await installAllUserEntries(adapterRegistry.all());
    return;
  }

  const config = await getCombinedProjectConfig(projectPath);
  for (const adapter of adapterRegistry.all()) {
    const section = getConfigSection(config, adapter.configPath);
    if (Object.keys(section).length === 0) {
      continue;
    }
    await installEntriesForAdapter(adapter, projectPath);
  }
}

export async function checkRepositories(options: CheckOptions): Promise<CheckResult> {
  const { scope, repoUrls, repos } = await getScopeRepoUrls(options);
  const entries: RepoCheckEntry[] = [];
  const shouldFetch = options.fetch !== false;

  for (const repoUrl of repoUrls) {
    const repo = findRepoByUrl(repos, repoUrl);
    if (!repo) {
      entries.push({
        repoUrl,
        status: 'not-configured',
        ahead: 0,
        behind: 0,
        message: 'Repository URL exists in config but is not configured locally.'
      });
      continue;
    }

    const inspected = await inspectRepo(repoUrl, repo, shouldFetch);
    entries.push(inspected);
  }

  const updateAvailable = entries.filter(entry => entry.status === 'update-available' || entry.status === 'diverged').length;
  return {
    scope,
    total: entries.length,
    updateAvailable,
    entries
  };
}

function shortHead(repoPath: string): Promise<string | undefined> {
  return safeRunGit(repoPath, ['rev-parse', '--short', 'HEAD']);
}

function shouldConsiderUpdate(checkEntry?: RepoCheckEntry): boolean {
  if (!checkEntry) return true;
  return checkEntry.status === 'update-available' || checkEntry.status === 'diverged' || checkEntry.status === 'missing-local' || checkEntry.status === 'not-configured';
}

export async function updateRepositories(options: CheckOptions & { dryRun?: boolean }): Promise<UpdateResult> {
  const dryRun = options.dryRun === true;
  const checked = await checkRepositories({ ...options, fetch: true });
  const config = await getConfig();
  const repos = config.repos || {};
  const checkByUrl = new Map<string, RepoCheckEntry>(checked.entries.map(entry => [entry.repoUrl, entry]));

  const entries: UpdateEntry[] = [];
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const entry of checked.entries) {
    const checkEntry = checkByUrl.get(entry.repoUrl);
    if (checkEntry?.status === 'error') {
      failed++;
      entries.push({
        repoUrl: entry.repoUrl,
        repoName: entry.repoName || '(unknown)',
        localPath: entry.localPath || '',
        action: 'error',
        message: entry.message || 'Failed to inspect repository state.'
      });
      continue;
    }

    const isCandidate = shouldConsiderUpdate(checkEntry);
    if (!isCandidate) {
      entries.push({
        repoUrl: entry.repoUrl,
        repoName: entry.repoName || '(unknown)',
        localPath: entry.localPath || '',
        action: 'unchanged',
        beforeCommit: entry.currentCommit
      });
      unchanged++;
      continue;
    }

    const existingRepo = findRepoByUrl(repos, entry.repoUrl);
    if (!existingRepo && dryRun) {
      entries.push({
        repoUrl: entry.repoUrl,
        repoName: '(new)',
        localPath: path.join(getReposBaseDir(), path.basename(entry.repoUrl, '.git') || 'repo'),
        action: 'would-clone',
        message: 'Repository would be configured and cloned.'
      });
      continue;
    }

    try {
      const repo = existingRepo || await ensureRepoByUrl(repos, entry.repoUrl);
      const beforeCommit = await shortHead(repo.path);

      if (dryRun) {
        entries.push({
          repoUrl: repo.url,
          repoName: repo.name,
          localPath: repo.path,
          action: 'would-update',
          beforeCommit
        });
        continue;
      }

      await cloneOrUpdateRepo(repo);
      const afterCommit = await shortHead(repo.path);

      if (!beforeCommit || beforeCommit !== afterCommit) {
        updated++;
        entries.push({
          repoUrl: repo.url,
          repoName: repo.name,
          localPath: repo.path,
          action: 'updated',
          beforeCommit,
          afterCommit
        });
      } else {
        unchanged++;
        entries.push({
          repoUrl: repo.url,
          repoName: repo.name,
          localPath: repo.path,
          action: 'unchanged',
          beforeCommit,
          afterCommit
        });
      }
    } catch (error: any) {
      failed++;
      entries.push({
        repoUrl: entry.repoUrl,
        repoName: existingRepo?.name || '(unknown)',
        localPath: existingRepo?.path || '',
        action: 'error',
        message: error.message
      });
    }
  }

  let reinstalled = false;
  if (!dryRun && failed === 0 && checked.total > 0) {
    await reinstallScopeEntries(checked.scope, options.projectPath);
    reinstalled = true;
  }

  return {
    scope: checked.scope,
    dryRun,
    total: checked.total,
    updated,
    unchanged,
    failed,
    reinstalled,
    entries
  };
}

function getFilteredAdapters(only?: string[], exclude?: string[]) {
  let adapters = adapterRegistry.all();
  if (only && only.length > 0) {
    const set = new Set(only.map(t => t.toLowerCase()));
    adapters = adapters.filter(a => set.has(a.tool));
  } else if (exclude && exclude.length > 0) {
    const set = new Set(exclude.map(t => t.toLowerCase()));
    adapters = adapters.filter(a => !set.has(a.tool));
  }
  return adapters;
}

function buildTemplateSourceDirConfig(adapters: ReturnType<typeof adapterRegistry.all>): SourceDirConfig {
  const sourceDir: SourceDirConfig = {};

  for (const adapter of adapters) {
    const toolSection = sourceDir[adapter.tool] || {};
    if (!toolSection[adapter.subtype]) {
      toolSection[adapter.subtype] = adapter.defaultSourceDir;
    }
    sourceDir[adapter.tool] = toolSection;
  }

  return sourceDir;
}

export async function initRulesRepository(options: InitOptions): Promise<InitResult> {
  const projectPath = options.name
    ? path.resolve(options.cwd, options.name)
    : path.resolve(options.cwd);

  await fs.ensureDir(projectPath);

  const configPath = path.join(projectPath, 'ai-rules-sync.json');
  const configExists = await fs.pathExists(configPath);
  if (configExists && !options.force) {
    throw new Error(`"${configPath}" already exists. Use --force to overwrite.`);
  }

  const adapters = getFilteredAdapters(options.only, options.exclude);
  const sourceDir = buildTemplateSourceDirConfig(adapters);
  await fs.writeJson(configPath, { sourceDir }, { spaces: 2 });

  const createdDirectories: string[] = [];
  if (options.createDirs !== false) {
    const dirs = new Set<string>();
    for (const adapter of adapters) {
      if (!adapter.defaultSourceDir || adapter.defaultSourceDir === '.') {
        continue;
      }
      dirs.add(adapter.defaultSourceDir);
    }

    for (const relativeDir of Array.from(dirs).sort()) {
      const fullDir = path.join(projectPath, relativeDir);
      await fs.ensureDir(fullDir);
      createdDirectories.push(fullDir);
    }
  }

  return {
    projectPath,
    configPath,
    createdDirectories
  };
}
