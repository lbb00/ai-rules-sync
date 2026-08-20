import type { ToolProfile } from '../config.js'

export function resolveProfileTools(profiles: Record<string, ToolProfile> | undefined, name: string): string[] {
  const profile = profiles?.[name]
  if (!profile) throw new Error(`Profile "${name}" not found.`)
  if (!Array.isArray(profile.tools) || profile.tools.some(tool => typeof tool !== 'string')) {
    throw new Error(`Profile "${name}" must contain a string tools array.`)
  }
  const seen = new Set<string>()
  return profile.tools.filter(tool => {
    if (seen.has(tool)) return false
    seen.add(tool)
    return true
  })
}

export function setToolProfile(
  profiles: Record<string, ToolProfile> | undefined,
  name: string,
  tools: string[],
): Record<string, ToolProfile> {
  const normalized = resolveProfileTools({ [name]: { tools } }, name)
  if (normalized.length === 0) throw new Error('A profile needs at least one tool.')
  return { ...(profiles ?? {}), [name]: { tools: normalized } }
}
