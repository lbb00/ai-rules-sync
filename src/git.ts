import path from 'path';
import os from 'os';
import { execa } from 'execa';
import fs from 'fs-extra';
import { RepoConfig } from './config.js';

/**
 * Check if a repo config refers to a local path (not a remote URL).
 */
export function isLocalRepo(repo: RepoConfig): boolean {
  const u = repo.url;
  return !u.includes('://') && !u.includes('git@') && (path.isAbsolute(u) || u.startsWith('~'));
}

/**
 * Strip credentials from URL for portable storage (e.g. https://token@host -> https://host).
 */
export function stripUrlCredentials(url: string): string {
  try {
    if (url.includes('@') && (url.startsWith('http://') || url.startsWith('https://'))) {
      const match = url.match(/^(https?:\/\/)([^@]+@)?(.+)$/);
      if (match) return match[1] + match[3];
    }
    if (url.startsWith('git@')) return url;
    return url;
  } catch {
    return url;
  }
}

/**
 * Get the remote origin URL from a git repository, if any.
 * Returns URL with credentials stripped for portable config storage.
 */
export async function getRemoteUrl(repoPath: string): Promise<string | undefined> {
  try {
    const result = await execa('git', ['remote', 'get-url', 'origin'], { cwd: repoPath });
    const url = result.stdout.trim() || undefined;
    return url ? stripUrlCredentials(url) : undefined;
  } catch {
    return undefined;
  }
}

export async function cloneOrUpdateRepo(repo: RepoConfig) {
  const repoDir = repo.path;
  const repoUrl = repo.url;

  // Local path repo: path already exists, no clone needed
  if (isLocalRepo(repo)) {
    if (!(await fs.pathExists(repoDir))) {
      throw new Error(`Local repository path does not exist: ${repoDir}`);
    }
    const isGit = await fs.pathExists(`${repoDir}/.git`);
    if (isGit) {
      try {
        await execa('git', ['rev-parse', '--abbrev-ref', '@{u}'], { cwd: repoDir });
        console.log(`Updating rules repository (${repo.name})...`);
        await execa('git', ['pull'], { cwd: repoDir, stdio: 'inherit' });
      } catch {
        // No upstream configured, skip pull
      }
    }
    return;
  }

  if (await fs.pathExists(repoDir)) {
    const isGit = await fs.pathExists(`${repoDir}/.git`);
    if (isGit) {
      try {
        await execa('git', ['rev-parse', '--abbrev-ref', '@{u}'], { cwd: repoDir });
        console.log(`Updating cursor rules repository (${repo.name})...`);
        await execa('git', ['pull'], { cwd: repoDir, stdio: 'inherit' });
      } catch {
        // No upstream or pull failed (e.g. local symlink to unpublished repo)
      }
    } else {
      await fs.remove(repoDir);
      await clone(repoUrl, repoDir);
    }
  } else {
    await clone(repoUrl, repoDir);
  }
}

async function clone(url: string, dir: string) {
  console.log(`Cloning ${url}...`);
  await fs.ensureDir(dir);
  await execa('git', ['clone', url, '.'], { cwd: dir, stdio: 'inherit' });
}

export async function runGitCommand(args: string[], repoPath: string) {
  if (!await fs.pathExists(repoPath)) {
    throw new Error('Cursor rules repository not found at ' + repoPath);
  }

  await execa('git', args, { cwd: repoPath, stdio: 'inherit' });
}
