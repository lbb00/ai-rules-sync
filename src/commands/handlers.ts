/**
 * Generic command handlers that work with any adapter
 */

import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import { RepoConfig } from '../config.js';
import { SyncAdapter } from '../adapters/types.js';
import { linkEntry, unlinkEntry, importEntry, ImportOptions } from '../sync-engine.js';
import { addIgnoreEntry } from '../utils.js';
import { addGlobalDependency, removeGlobalDependency } from '../project-config.js';

/**
 * Context for command execution
 */
export interface CommandContext {
  projectPath: string;
  repo: RepoConfig;
  isLocal: boolean;
  /** When true, uses global config (global.json) instead of project config */
  global?: boolean;
  /** When true, skip gitignore management (used for global mode) */
  skipIgnore?: boolean;
}

/**
 * Options for add command
 */
export interface AddOptions {
  local?: boolean;
  targetDir?: string;
  /** When true, uses global config (global.json) instead of project config */
  global?: boolean;
}

/**
 * Result of an add operation
 */
export interface AddResult {
  sourceName: string;
  targetName: string;
  linked: boolean;
  migrated: boolean;
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

  const result = await adapter.link({
    projectPath: ctx.projectPath,
    name,
    repo: ctx.repo,
    alias,
    isLocal: ctx.isLocal,
    targetDir: options?.targetDir,
    skipIgnore: ctx.skipIgnore
  });

  // Use the provided alias if given, otherwise use targetName if different from sourceName
  const depAlias = alias || (result.targetName === result.sourceName ? undefined : result.targetName);

  let migrated = false;
  if (ctx.global) {
    // Global mode: write to global.json
    await addGlobalDependency(
      adapter.configPath,
      result.sourceName,
      ctx.repo.url,
      depAlias,
      options?.targetDir
    );
    console.log(chalk.green(`Updated global config dependency.`));
  } else {
    // Project mode: write to project's ai-rules-sync.json
    const migration = await adapter.addDependency(
      ctx.projectPath,
      result.sourceName,
      ctx.repo.url,
      depAlias,
      ctx.isLocal,
      options?.targetDir
    );
    migrated = migration.migrated;

    const configFileName = ctx.isLocal ? 'ai-rules-sync.local.json' : 'ai-rules-sync.json';
    console.log(chalk.green(`Updated ${configFileName} dependency.`));

    if (migrated) {
      console.log(chalk.yellow('Detected legacy "cursor-rules*.json". Migrated to "ai-rules-sync*.json". Consider deleting the legacy files to avoid ambiguity.'));
    }

    if (ctx.isLocal) {
      const gitignorePath = path.join(ctx.projectPath, '.gitignore');
      const added = await addIgnoreEntry(gitignorePath, 'ai-rules-sync.local.json', '# Local AI Rules Sync Config');
      if (added) {
        console.log(chalk.green(`Added "ai-rules-sync.local.json" to .gitignore.`));
      }
    }
  }

  return {
    sourceName: result.sourceName,
    targetName: result.targetName,
    linked: result.linked,
    migrated
  };
}

/**
 * Result of a remove operation
 */
export interface RemoveResult {
  removedFrom: string[];
  migrated: boolean;
}

/**
 * Generic remove command handler - works with any adapter
 */
export async function handleRemove(
  adapter: SyncAdapter,
  projectPath: string,
  alias: string,
  isGlobal: boolean = false
): Promise<RemoveResult> {
  await adapter.unlink(projectPath, alias);

  if (isGlobal) {
    const { removedFrom } = await removeGlobalDependency(adapter.configPath, alias);

    if (removedFrom.length > 0) {
      console.log(chalk.green(`Removed "${alias}" from global config: ${removedFrom.join(', ')}`));
    } else {
      console.log(chalk.yellow(`"${alias}" was not found in global config.`));
    }

    return { removedFrom, migrated: false };
  }

  const { removedFrom, migrated } = await adapter.removeDependency(projectPath, alias);

  if (removedFrom.length > 0) {
    console.log(chalk.green(`Removed "${alias}" from configuration: ${removedFrom.join(', ')}`));
  } else {
    console.log(chalk.yellow(`"${alias}" was not found in any configuration file.`));
  }

  if (migrated) {
    console.log(chalk.yellow('Detected legacy "cursor-rules*.json". Migrated to "ai-rules-sync*.json". Consider deleting the legacy files to avoid ambiguity.'));
  }

  return { removedFrom, migrated };
}

/**
 * Options for import command
 */
export interface ImportCommandOptions {
  local?: boolean;
  message?: string;
  force?: boolean;
  push?: boolean;
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
