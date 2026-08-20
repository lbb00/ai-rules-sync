import type { Config, RepoConfig } from '../config.js'

export interface RepositoryPruneItem {
  name: string
  reason: 'missing' | 'temporary' | 'duplicate'
  action: 'remove-config-only'
}

export interface RepositoryPrunePlan {
  keep: string[]
  remove: RepositoryPruneItem[]
}

export function planRepositoryPrune(options: {
  currentRepo?: string
  repos: Record<string, RepoConfig>
  pathExists: (path: string) => boolean
}): RepositoryPrunePlan {
  const keep: string[] = []
  const remove: RepositoryPruneItem[] = []
  const seenUrls = new Set<string>()
  if (options.currentRepo && options.repos[options.currentRepo]) seenUrls.add(options.repos[options.currentRepo].url)

  for (const name of Object.keys(options.repos).sort()) {
    const repo = options.repos[name]
    if (name === options.currentRepo) {
      keep.push(name)
      continue
    }
    if (!options.pathExists(repo.path)) {
      remove.push({ name, reason: 'missing', action: 'remove-config-only' })
    } else if (/(?:^|[\\/])scratchpad(?:[\\/]|$)/.test(repo.path) || /(?:^|[\\/])ais-[^\\/]*test[^\\/]*(?:[\\/]|$)/.test(repo.path)) {
      remove.push({ name, reason: 'temporary', action: 'remove-config-only' })
    } else if (seenUrls.has(repo.url)) {
      remove.push({ name, reason: 'duplicate', action: 'remove-config-only' })
    } else {
      keep.push(name)
      seenUrls.add(repo.url)
    }
  }
  return { keep, remove }
}

export function removeRepositoryConfig(config: Config, name: string): Config {
  if (!config.repos[name]) throw new Error(`Repository "${name}" not found in configuration.`)
  const repos = { ...config.repos }
  delete repos[name]
  return {
    ...config,
    repos,
    ...(config.currentRepo === name ? { currentRepo: undefined } : {}),
  }
}
