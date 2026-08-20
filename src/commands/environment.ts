import fs from 'fs-extra'
import path from 'path'
import { execa } from 'execa'
import type { RepoConfig } from '../config.js'

export interface EnvironmentInfoInput {
  version: string
  executable: string
  configDir: string
  userConfigPath: string
  currentRepo?: RepoConfig
  gitCommit?: () => Promise<string | undefined>
}

export interface EnvironmentInfo {
  version: string
  executable: string
  configDir: string
  userConfigPath: string
  developmentBuild: boolean
  gitCommit?: string
  currentRepository?: Pick<RepoConfig, 'name' | 'url' | 'path'>
}

async function detectGitCommit(executable: string): Promise<string | undefined> {
  let dir = path.dirname(executable)
  while (dir !== path.dirname(dir)) {
    if (await fs.pathExists(path.join(dir, '.git'))) {
      try {
        return (await execa('git', ['rev-parse', '--short', 'HEAD'], { cwd: dir })).stdout.trim()
      } catch {
        return undefined
      }
    }
    dir = path.dirname(dir)
  }
  return undefined
}

export async function buildEnvironmentInfo(input: EnvironmentInfoInput): Promise<EnvironmentInfo> {
  const executable = path.resolve(input.executable)
  const gitCommit = await (input.gitCommit ?? (() => detectGitCommit(executable)))()
  const developmentBuild = !!gitCommit
  return {
    version: input.version,
    executable,
    configDir: input.configDir,
    userConfigPath: input.userConfigPath,
    developmentBuild,
    ...(gitCommit ? { gitCommit } : {}),
    ...(input.currentRepo ? {
      currentRepository: {
        name: input.currentRepo.name,
        url: input.currentRepo.url,
        path: input.currentRepo.path,
      },
    } : {}),
  }
}
