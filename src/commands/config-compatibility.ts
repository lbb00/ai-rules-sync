import type { ProjectConfig } from '../project-config.js'

export interface ConfigCompatibilityReport {
  compatible: boolean
  unknownTools: string[]
  unknownSubtypes: Array<{ tool: string; subtype: string }>
  messages: string[]
}

const METADATA_KEYS = new Set(['version', 'requiresAis', 'rootPath', 'sourceDir'])

function parseVersion(version: string): [number, number, number] | undefined {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined
}

function isAtLeast(actual: string, required: string): boolean {
  const a = parseVersion(actual)
  const r = parseVersion(required)
  if (!a || !r) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== r[i]) return a[i] > r[i]
  }
  return true
}

export function inspectConfigCompatibility(
  config: ProjectConfig,
  supported: Map<string, Set<string>>,
  currentVersion: string,
): ConfigCompatibilityReport {
  const unknownTools: string[] = []
  const unknownSubtypes: Array<{ tool: string; subtype: string }> = []
  const messages: string[] = []

  for (const [tool, value] of Object.entries(config)) {
    if (METADATA_KEYS.has(tool)) continue
    const subtypes = tool === '*'
      ? new Set(Array.from(supported.values()).flatMap(value => Array.from(value)))
      : supported.get(tool)
    if (!subtypes) {
      unknownTools.push(tool)
      continue
    }
    if (!value || typeof value !== 'object') continue
    for (const subtype of Object.keys(value)) {
      if (!subtypes.has(subtype)) unknownSubtypes.push({ tool, subtype })
    }
  }

  unknownTools.sort()
  unknownSubtypes.sort((a, b) => a.tool.localeCompare(b.tool) || a.subtype.localeCompare(b.subtype))

  const requires = typeof config.requiresAis === 'string' ? config.requiresAis : undefined
  let compatible = true
  if (requires) {
    const match = requires.match(/^>=\s*(\d+\.\d+\.\d+)/)
    if (!match || !isAtLeast(currentVersion, match[1])) {
      compatible = false
      messages.push(`This config requires AIS ${requires}; current version is ${currentVersion}.`)
    }
  }
  if (unknownTools.length > 0) {
    compatible = false
    messages.push(`Unsupported tools: ${unknownTools.join(', ')}.`)
  }
  if (unknownSubtypes.length > 0) {
    compatible = false
    messages.push(`Unsupported tool subtypes: ${unknownSubtypes.map(x => `${x.tool}.${x.subtype}`).join(', ')}.`)
  }

  return { compatible, unknownTools, unknownSubtypes, messages }
}

export function buildSupportedSections(adapters: Array<{ configPath: readonly string[] }>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const adapter of adapters) {
    const [tool, subtype] = adapter.configPath
    if (!tool || !subtype) continue
    const sections = result.get(tool) ?? new Set<string>()
    sections.add(subtype)
    result.set(tool, sections)
  }
  return result
}
