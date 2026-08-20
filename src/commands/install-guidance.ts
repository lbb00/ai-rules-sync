export interface GlobalInstallResult {
  tool: string
  targetPath: string
  action: string
}

export function formatGlobalInstallGuidance(results: GlobalInstallResult[]): string {
  const installed = results.filter(result => result.action === 'added')
  if (installed.length === 0) return ''
  const lines = ['Installed global assets:']
  for (const result of installed) lines.push(`  ${result.tool.padEnd(12)} ${result.targetPath}`)
  lines.push('', 'Restart active agent sessions to refresh skill discovery.')
  return lines.join('\n')
}
