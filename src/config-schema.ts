export const CURRENT_CONFIG_VERSION = 1

export function assertSupportedConfigVersion(value: unknown, source: string): void {
  if (!value || typeof value !== 'object') return
  const version = (value as Record<string, unknown>).version
  if (version !== undefined && (typeof version !== 'number' || !Number.isInteger(version) || version < 1)) {
    throw new Error(`${source} has invalid config version ${JSON.stringify(version)}.`)
  }
  if (typeof version === 'number' && version > CURRENT_CONFIG_VERSION) {
    throw new Error(`${source} uses config version ${version}; this AIS supports up to version ${CURRENT_CONFIG_VERSION}.`)
  }
}
