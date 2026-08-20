import path from 'path'
import fs from 'fs-extra'
import { execa } from 'execa'
import type { RepoConfig } from '../config.js'

export interface SourceRecoverability {
  recoverable: boolean
  status: 'published' | 'local-path' | 'not-git' | 'dirty' | 'no-upstream' | 'ahead' | 'error'
  message: string
}

function isLocalUrl(url: string): boolean {
  return !url.includes('://') && !url.includes('git@') && path.isAbsolute(url)
}

export async function inspectSourceRecoverability(repo: RepoConfig, fetch = false): Promise<SourceRecoverability> {
  if (isLocalUrl(repo.url)) {
    return { recoverable: false, status: 'local-path', message: 'Source uses a local path and cannot be restored on another machine.' }
  }
  if (!await fs.pathExists(path.join(repo.path, '.git'))) {
    return { recoverable: false, status: 'not-git', message: 'Source cache is not a Git repository.' }
  }
  try {
    const dirty = (await execa('git', ['status', '--porcelain'], { cwd: repo.path })).stdout.trim()
    if (dirty) {
      return { recoverable: false, status: 'dirty', message: 'Source has uncommitted changes; the installed asset cannot be reproduced from the configured remote.' }
    }
    if (fetch) await execa('git', ['fetch', '--quiet'], { cwd: repo.path })
    let upstream: string
    try {
      upstream = (await execa('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { cwd: repo.path })).stdout.trim()
    } catch {
      return { recoverable: false, status: 'no-upstream', message: 'Source branch has no upstream; a fresh machine cannot restore this HEAD.' }
    }
    try {
      await execa('git', ['merge-base', '--is-ancestor', 'HEAD', upstream], { cwd: repo.path })
      return { recoverable: true, status: 'published', message: `Source HEAD is available from ${upstream}.` }
    } catch {
      return { recoverable: false, status: 'ahead', message: `Source HEAD is not available from ${upstream}; publish it before relying on cross-machine restore.` }
    }
  } catch (error: any) {
    return { recoverable: false, status: 'error', message: `Could not verify source remote: ${error.message}` }
  }
}
