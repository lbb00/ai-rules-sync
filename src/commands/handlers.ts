/**
 * Generic command handlers that work with any adapter
 */

import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import { RepoConfig, getUserConfigPath, getUserProjectConfig } from '../config.js';
import { SyncAdapter } from '../adapters/types.js';
import { importEntry, ImportOptions } from '../sync-engine.js';
import { addIgnoreEntry, removeIgnoreEntry } from '../utils.js';
import { addUserDependency, removeUserDependency, getCombinedProjectConfig, getRepoSourceConfig, getSourceDir, getTargetDir, getEntryConfig, WILDCARD_TOOL, type ProjectConfig } from '../project-config.js';

/**
 * Context for command execution
 */
export interface CommandContext {
  projectPath: string;
  repo: RepoConfig;
  isLocal: boolean;
  /** When true, uses user config (user.json) instead of project config */
  user?: boolean;
  /** When true, skip gitignore management (used for user mode) */
  skipIgnore?: boolean;
}

/**
 * Options for add command
 */
export interface AddOptions {
  local?: boolean;
  targetDir?: string;
  /** When true, uses user config (user.json) instead of project config */
  user?: boolean;
}

/**
 * Result of an add operation
 */
export interface AddResult {
  sourceName: string;
  targetName: string;
  linked: boolean;
}

/**
 * Generic add command handler - works with any adapter
 */
export async function handleAdd(
  adapter: SyncAdapter,
  ctx: CommandContext,
  name: string,
  alias?: string,
  options?: AddOptions
): Promise<AddResult> {
  console.log(chalk.gray(`Using repository: ${chalk.cyan(ctx.repo.name)} (${ctx.repo.url})`));

  // Pre-check for conflict if using targetDir without alias
  // This is a best-effort check using the input name, but may not catch all cases
  // due to suffix resolution happening during link
  if (options?.targetDir && !alias) {
    const { getCombinedProjectConfig, getEntryConfig } = await import('../project-config.js');
    const projectConfig = await getCombinedProjectConfig(ctx.projectPath);

    // Check with the input name first
    let existingEntry = getEntryConfig(projectConfig, adapter.tool, adapter.subtype, name);
    let foundKey = name;

    // Also check common suffix variations for file-based adapters
    const suffixes = adapter.fileSuffixes || adapter.hybridFileSuffixes;
    if (!existingEntry && suffixes) {
      for (const suffix of suffixes) {
        const nameWithSuffix = name.endsWith(suffix) ? name : `${name}${suffix}`;
        existingEntry = getEntryConfig(projectConfig, adapter.tool, adapter.subtype, nameWithSuffix);
        if (existingEntry) {
          foundKey = nameWithSuffix;
          break;
        }
      }
    }

    if (existingEntry) {
      const existingTargetDir = typeof existingEntry === 'object' ? existingEntry.targetDir : undefined;
      if (existingTargetDir !== options.targetDir) {
        throw new Error(
          `Entry "${foundKey}" already exists in configuration (target: ${existingTargetDir || adapter.targetDir}).\n` +
          `To add the same rule to a different location, use an alias:\n` +
          `  ais ${adapter.tool} add ${name} <alias> -d ${options.targetDir}`
        );
      }
    }
  }

  if (ctx.user) {
    // User mode: link only (no manifest for user mode via forProject)
    const result = await adapter.link({
      projectPath: ctx.projectPath,
      name,
      repo: ctx.repo,
      alias,
      isLocal: ctx.isLocal,
      targetDir: options?.targetDir,
      skipIgnore: ctx.skipIgnore
    });
    const depAlias = alias || (result.targetName === result.sourceName ? undefined : result.targetName);
    await addUserDependency(
      adapter.configPath,
      result.sourceName,
      ctx.repo.url,
      depAlias,
      options?.targetDir
    );
    console.log(chalk.green(`Updated user config dependency.`));
    return {
      sourceName: result.sourceName,
      targetName: result.targetName,
      linked: result.linked
    };
  }

  // Project mode: use forProject().add() to do symlink + manifest in one step
  const manager = adapter.forProject(ctx.projectPath, ctx.repo, ctx.isLocal);
  const result = await manager.add(name, {
    alias,
    targetDir: options?.targetDir,
    repoUrl: ctx.repo.url,
  });

  // Ignore file management (ai-rules-sync specific, not dotfile layer responsibility)
  if (result.linked) {
    const relEntry = path.relative(path.resolve(ctx.projectPath), result.targetPath);
    if (ctx.isLocal) {
      const gitInfoExclude = path.join(ctx.projectPath, '.git', 'info', 'exclude');
      if (await fs.pathExists(path.dirname(gitInfoExclude))) {
        await fs.ensureFile(gitInfoExclude);
        if (await addIgnoreEntry(gitInfoExclude, relEntry, '# AI Rules Sync')) {
          console.log(chalk.green(`Added "${relEntry}" to .git/info/exclude.`));
        } else {
          console.log(chalk.gray(`"${relEntry}" already in .git/info/exclude.`));
        }
      } else {
        console.log(chalk.yellow(`Warning: Could not find .git/info/exclude. Skipping automatic ignore for private entry.`));
        console.log(chalk.yellow(`Please manually add "${relEntry}" to your private ignore file.`));
      }
    } else {
      const gitignorePath = path.join(ctx.projectPath, '.gitignore');
      if (await addIgnoreEntry(gitignorePath, relEntry, '# AI Rules Sync')) {
        console.log(chalk.green(`Added "${relEntry}" to .gitignore.`));
      } else {
        console.log(chalk.gray(`"${relEntry}" already in .gitignore.`));
      }
    }
  }

  const configFileName = ctx.isLocal ? 'ai-rules-sync.local.json' : 'ai-rules-sync.json';
  console.log(chalk.green(`Updated ${configFileName} dependency.`));

  if (ctx.isLocal) {
    const gitignorePath = path.join(ctx.projectPath, '.gitignore');
    const added = await addIgnoreEntry(gitignorePath, 'ai-rules-sync.local.json', '# Local AI Rules Sync Config');
    if (added) {
      console.log(chalk.green(`Added "ai-rules-sync.local.json" to .gitignore.`));
    }
  }

  return {
    sourceName: result.sourceName,
    targetName: result.targetName,
    linked: result.linked
  };
}

/**
 * Result of a remove operation
 */
export interface RemoveResult {
  removedFrom: string[];
}

export interface RemoveCommandOptions {
  dryRun?: boolean;
}

export interface ImportPreviewResult {
  sourcePath: string;
  sourceExists: boolean;
  sourceIsSymlink: boolean;
  destinationPath: string;
  destinationExists: boolean;
  configFileName: string;
  commitMessage: string;
}

async function getConfigHitsForAlias(
  adapter: SyncAdapter,
  projectPath: string,
  alias: string,
  isUser: boolean
): Promise<string[]> {
  const [topLevel, subLevel] = adapter.configPath;
  const hits: string[] = [];

  if (isUser) {
    const userConfig = await getUserProjectConfig();
    const userPath = await getUserConfigPath();
    if (getEntryConfig(userConfig as ProjectConfig, topLevel, subLevel, alias)) {
      hits.push(path.basename(userPath));
    }
    return hits;
  }

  const mainPath = path.join(projectPath, 'ai-rules-sync.json');
  const localPath = path.join(projectPath, 'ai-rules-sync.local.json');

  if (await fs.pathExists(mainPath)) {
    const mainConfig = await fs.readJson(mainPath);
    const inTool = mainConfig?.[topLevel]?.[subLevel]?.[alias];
    const inWild = topLevel !== WILDCARD_TOOL && mainConfig?.[WILDCARD_TOOL]?.[subLevel]?.[alias];
    if (inTool !== undefined || inWild !== undefined) {
      hits.push('ai-rules-sync.json');
    }
  }

  if (await fs.pathExists(localPath)) {
    const localConfig = await fs.readJson(localPath);
    const inTool = localConfig?.[topLevel]?.[subLevel]?.[alias];
    const inWild = topLevel !== WILDCARD_TOOL && localConfig?.[WILDCARD_TOOL]?.[subLevel]?.[alias];
    if (inTool !== undefined || inWild !== undefined) {
      hits.push('ai-rules-sync.local.json');
    }
  }

  return hits;
}

async function resolveRemoveTargetPath(
  adapter: SyncAdapter,
  projectPath: string,
  alias: string,
  isUser: boolean
): Promise<{ targetPath: string; exists: boolean; isSymlink: boolean }> {
  let targetDirPath: string;
  if (isUser) {
    targetDirPath = adapter.userTargetDir || adapter.targetDir;
  } else {
    const config = await getCombinedProjectConfig(projectPath);
    targetDirPath = getTargetDir(config, adapter.tool, adapter.subtype, alias, adapter.targetDir);
  }

  const targetDir = path.join(path.resolve(projectPath), targetDirPath);
  const candidates = [path.join(targetDir, alias)];

  const suffixes = adapter.fileSuffixes || adapter.hybridFileSuffixes;
  if (suffixes && suffixes.length > 0) {
    for (const suffix of suffixes) {
      if (!alias.endsWith(suffix)) {
        candidates.push(path.join(targetDir, `${alias}${suffix}`));
      }
    }
  }

  for (const candidate of candidates) {
    const stats = await fs.lstat(candidate).catch(() => null);
    if (stats) {
      return {
        targetPath: candidate,
        exists: true,
        isSymlink: stats.isSymbolicLink()
      };
    }
  }

  return {
    targetPath: candidates[0],
    exists: false,
    isSymlink: false
  };
}

/**
 * Generic remove command handler - works with any adapter
 */
export async function handleRemove(
  adapter: SyncAdapter,
  projectPath: string,
  alias: string,
  isUser: boolean = false,
  options?: RemoveCommandOptions
): Promise<RemoveResult> {
  if (options?.dryRun) {
    const hits = await getConfigHitsForAlias(adapter, projectPath, alias, isUser);
    const target = await resolveRemoveTargetPath(adapter, projectPath, alias, isUser);
    console.log(chalk.bold(`[DRY RUN] Remove ${adapter.tool} ${adapter.subtype} "${alias}"`));
    if (hits.length > 0) {
      console.log(chalk.gray(`  Config entries: ${hits.join(', ')}`));
    } else {
      console.log(chalk.gray('  Config entries: none'));
    }

    if (target.exists) {
      const kind = target.isSymlink ? 'symlink' : 'file/directory';
      console.log(chalk.gray(`  Filesystem: remove ${target.targetPath} (${kind})`));
    } else {
      console.log(chalk.gray(`  Filesystem: no matching path found (checked around ${target.targetPath})`));
    }

    return {
      removedFrom: hits
    };
  }

  if (isUser) {
    await adapter.unlink(projectPath, alias);
    const { removedFrom } = await removeUserDependency(adapter.configPath, alias);

    if (removedFrom.length > 0) {
      console.log(chalk.green(`Removed "${alias}" from user config: ${removedFrom.join(', ')}`));
    } else {
      console.log(chalk.yellow(`"${alias}" was not found in user config.`));
    }

    return { removedFrom };
  }

  // Project mode: use forProject().remove() to do symlink deletion + manifest update in one step
  const removedFrom = await getConfigHitsForAlias(adapter, projectPath, alias, false);
  const target = await resolveRemoveTargetPath(adapter, projectPath, alias, false);
  const projectRoot = path.resolve(projectPath);
  const targetDirAbsolute = path.dirname(target.targetPath);
  const ignoreEntries = new Set<string>();

  const addIgnoreCandidate = (baseName: string): void => {
    const relativePath = path.relative(projectRoot, path.join(targetDirAbsolute, baseName));
    if (relativePath && relativePath !== '.') {
      ignoreEntries.add(relativePath);
    }
  };

  addIgnoreCandidate(alias);
  if (target.exists) {
    addIgnoreCandidate(path.basename(target.targetPath));
  }

  const suffixes = adapter.fileSuffixes || adapter.hybridFileSuffixes;
  if (suffixes && suffixes.length > 0) {
    for (const suffix of suffixes) {
      if (!alias.endsWith(suffix)) {
        addIgnoreCandidate(`${alias}${suffix}`);
      }
    }
  }

  await adapter.forProject(projectPath, null, false).remove(alias);

  // Ignore cleanup — try both gitignore and git/info/exclude since we don't know
  // which was used when the entry was originally added
  const gitignorePath = path.join(projectPath, '.gitignore');
  const gitInfoExclude = path.join(projectPath, '.git', 'info', 'exclude');
  for (const entry of ignoreEntries) {
    if (await removeIgnoreEntry(gitignorePath, entry)) {
      console.log(chalk.green(`Removed "${entry}" from .gitignore.`));
    }
    if (await removeIgnoreEntry(gitInfoExclude, entry)) {
      console.log(chalk.green(`Removed "${entry}" from .git/info/exclude.`));
    }
  }

  return { removedFrom };
}

/**
 * Options for import command
 */
export interface ImportCommandOptions {
  local?: boolean;
  message?: string;
  force?: boolean;
  push?: boolean;
  dryRun?: boolean;
}

export async function previewImport(
  adapter: SyncAdapter,
  ctx: CommandContext,
  name: string,
  options: ImportCommandOptions
): Promise<ImportPreviewResult> {
  const absoluteProjectPath = path.resolve(ctx.projectPath);
  const projectConfig = await getCombinedProjectConfig(ctx.projectPath);
  const targetDirPath = getTargetDir(
    projectConfig,
    adapter.tool,
    adapter.subtype,
    name,
    adapter.targetDir
  );

  const sourcePath = path.join(absoluteProjectPath, targetDirPath, name);
  let sourceExists = false;
  let sourceIsSymlink = false;

  if (await fs.pathExists(sourcePath)) {
    sourceExists = true;
    const stats = await fs.lstat(sourcePath);
    sourceIsSymlink = stats.isSymbolicLink();
  }

  const repoConfig = await getRepoSourceConfig(ctx.repo.path);
  const sourceDir = getSourceDir(repoConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
  const destinationPath = path.join(ctx.repo.path, sourceDir, name);
  const destinationExists = await fs.pathExists(destinationPath);

  return {
    sourcePath,
    sourceExists,
    sourceIsSymlink,
    destinationPath,
    destinationExists,
    configFileName: ctx.isLocal ? 'ai-rules-sync.local.json' : 'ai-rules-sync.json',
    commitMessage: options.message || `Import ${adapter.tool} ${adapter.subtype}: ${name}`
  };
}

/**
 * Generic import command handler - works with any adapter
 */
export async function handleImport(
  adapter: SyncAdapter,
  ctx: CommandContext,
  name: string,
  options: ImportCommandOptions
): Promise<void> {
  console.log(chalk.gray(`Using repository: ${chalk.cyan(ctx.repo.name)} (${ctx.repo.url})`));

  if (options.dryRun) {
    const preview = await previewImport(adapter, ctx, name, options);
    console.log(chalk.bold(`[DRY RUN] Import ${adapter.tool} ${adapter.subtype} "${name}"`));
    if (!preview.sourceExists) {
      throw new Error(`Entry "${name}" not found in project at ${preview.sourcePath}`);
    }
    if (preview.sourceIsSymlink) {
      throw new Error(`Entry "${name}" is already a symlink (already managed by ai-rules-sync)`);
    }

    console.log(chalk.gray(`  Copy: ${preview.sourcePath} -> ${preview.destinationPath}`));
    if (preview.destinationExists && !options.force) {
      throw new Error(`Entry "${name}" already exists in rules repository at ${preview.destinationPath}. Use --force to overwrite.`);
    }
    if (preview.destinationExists && options.force) {
      console.log(chalk.gray('  Destination exists and would be overwritten (--force).'));
    }
    console.log(chalk.gray(`  Git commit message: ${preview.commitMessage}`));
    if (options.push) {
      console.log(chalk.gray('  Git push: enabled'));
    }
    console.log(chalk.gray(`  Config update: ${preview.configFileName}`));
    return;
  }

  const importOpts: ImportOptions = {
    projectPath: ctx.projectPath,
    name,
    repo: ctx.repo,
    isLocal: ctx.isLocal,
    commitMessage: options.message,
    force: options.force,
    push: options.push
  };

  const result = await importEntry(adapter, importOpts);

  // Ignore file management for the imported entry
  const relEntry = `${adapter.targetDir}/${result.targetName}`;
  if (ctx.isLocal) {
    const gitInfoExclude = path.join(ctx.projectPath, '.git', 'info', 'exclude');
    if (await fs.pathExists(path.dirname(gitInfoExclude))) {
      await fs.ensureFile(gitInfoExclude);
      if (await addIgnoreEntry(gitInfoExclude, relEntry, '# AI Rules Sync')) {
        console.log(chalk.green(`Added "${relEntry}" to .git/info/exclude.`));
      }
    }
  } else {
    const gitignorePath = path.join(ctx.projectPath, '.gitignore');
    if (await addIgnoreEntry(gitignorePath, relEntry, '# AI Rules Sync')) {
      console.log(chalk.green(`Added "${relEntry}" to .gitignore.`));
    }
  }

  // Add to config
  await adapter.addDependency(ctx.projectPath, name, ctx.repo.url, undefined, ctx.isLocal);
  const configFileName = ctx.isLocal ? 'ai-rules-sync.local.json' : 'ai-rules-sync.json';
  console.log(chalk.green(`Updated ${configFileName} dependency.`));

  if (ctx.isLocal) {
    const gitignorePath = path.join(ctx.projectPath, '.gitignore');
    const added = await addIgnoreEntry(gitignorePath, 'ai-rules-sync.local.json', '# Local AI Rules Sync Config');
    if (added) {
      console.log(chalk.green(`Added "ai-rules-sync.local.json" to .gitignore.`));
    }
  }

  console.log(chalk.bold.green(`\n✓ Successfully imported "${name}"!`));
}
