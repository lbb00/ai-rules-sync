export interface SerializedSearchEntry {
  adapter: string
  tool: string
  subtype: string
  entryName: string
  sourceName: string
  sourcePath: string
  isDirectory: boolean
  configured: boolean
}

export interface GroupedSearchEntry {
  subtype: string
  entryName: string
  sourceName: string
  sourcePath: string
  isDirectory: boolean
  compatibleTools: string[]
  configuredTools: string[]
  adapters: string[]
}

export function groupSearchEntries(entries: SerializedSearchEntry[]): GroupedSearchEntry[] {
  const groups = new Map<string, GroupedSearchEntry>()
  for (const entry of entries) {
    const key = [entry.subtype, entry.entryName, entry.sourceName, entry.sourcePath, entry.isDirectory ? 'dir' : 'file'].join('\0')
    const group = groups.get(key) ?? {
      subtype: entry.subtype,
      entryName: entry.entryName,
      sourceName: entry.sourceName,
      sourcePath: entry.sourcePath,
      isDirectory: entry.isDirectory,
      compatibleTools: [],
      configuredTools: [],
      adapters: [],
    }
    if (!group.compatibleTools.includes(entry.tool)) group.compatibleTools.push(entry.tool)
    if (entry.configured && !group.configuredTools.includes(entry.tool)) group.configuredTools.push(entry.tool)
    if (!group.adapters.includes(entry.adapter)) group.adapters.push(entry.adapter)
    groups.set(key, group)
  }
  return Array.from(groups.values())
    .map(group => ({
      ...group,
      compatibleTools: group.compatibleTools.sort(),
      configuredTools: group.configuredTools.sort(),
      adapters: group.adapters.sort(),
    }))
    .sort((a, b) => a.subtype.localeCompare(b.subtype) || a.entryName.localeCompare(b.entryName) || a.sourcePath.localeCompare(b.sourcePath))
}
