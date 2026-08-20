import os from 'os'
import path from 'path'
import type { RepoConfig } from '../config.js'

function isPathLike(value: string): boolean {
  return path.isAbsolute(value) || value.startsWith('.') || value.startsWith('~')
}

export function resolveStatusRepository(
  repos: Record<string, RepoConfig>,
  currentRepo: string | undefined,
  target?: string,
): RepoConfig | undefined {
  if (!target) return currentRepo ? repos[currentRepo] : undefined
  if (repos[target]) return repos[target]
  const expandedTarget = target.replace(/^~/, os.homedir())
  const match = Object.values(repos).find(repo => repo.url === target || (isPathLike(target) && path.resolve(repo.path) === path.resolve(expandedTarget)))
  if (match) return match
  throw new Error(`Repository "${target}" not found in configuration.`)
}
