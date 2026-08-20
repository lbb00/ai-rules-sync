import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import { describe, expect, it } from 'vitest'
import {
  getConfigDir,
  getConfigFilePath,
  getReposBaseDir,
  getUserConfigDefaultPath,
} from '../config.js'
import { inspectConfigCompatibility } from '../commands/config-compatibility.js'
import { buildEnvironmentInfo } from '../commands/environment.js'
import { resolveStatusRepository } from '../commands/status.js'
import { planRepositoryPrune } from '../commands/repository-maintenance.js'
import { groupSearchEntries } from '../commands/search.js'
import { resolveProfileTools } from '../commands/profiles.js'
import { formatGlobalInstallGuidance } from '../commands/install-guidance.js'
import { getCombinedProjectConfig } from '../project-config.js'
import { inspectSourceRecoverability } from '../commands/recoverability.js'

describe('AIS 1.0 global workflow hardening', () => {
  it('runs the test suite outside the real user config directory', () => {
    expect(process.env.AIS_CONFIG_HOME).toBeTruthy()
    expect(getConfigDir()).not.toBe(path.join(os.homedir(), '.config', 'ai-rules-sync'))
  })

  it('resolves config paths at call time with AIS taking priority over XDG', () => {
    const aisDir = getConfigDir({ AIS_CONFIG_HOME: '/tmp/ais-home', XDG_CONFIG_HOME: '/tmp/xdg' }, '/home/test')
    expect(aisDir).toBe(path.resolve('/tmp/ais-home'))
    expect(getConfigFilePath({ AIS_CONFIG_HOME: '/tmp/ais-home' }, '/home/test')).toBe('/tmp/ais-home/config.json')
    expect(getReposBaseDir({ AIS_CONFIG_HOME: '/tmp/ais-home' }, '/home/test')).toBe('/tmp/ais-home/repos')
    expect(getUserConfigDefaultPath({ AIS_CONFIG_HOME: '/tmp/ais-home' }, '/home/test')).toBe('/tmp/ais-home/user.json')

    expect(getConfigDir({ XDG_CONFIG_HOME: '/tmp/xdg' }, '/home/test')).toBe('/tmp/xdg/ai-rules-sync')
    expect(getConfigDir({}, '/home/test')).toBe('/home/test/.config/ai-rules-sync')
  })

  it('rejects a project config written by a newer schema instead of silently using it', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-future-config-'))
    try {
      await fs.writeJson(path.join(dir, 'ai-rules-sync.json'), { version: 2, pi: { skills: {} } })
      await expect(getCombinedProjectConfig(dir)).rejects.toThrow('config version 2')
    } finally {
      await fs.remove(dir)
    }
  })

  it('reports config requirements and unknown tool or subtype sections without dropping them', () => {
    const report = inspectConfigCompatibility(
      {
        version: 1,
        requiresAis: '>=1.1.0',
        pi: { skills: { shared: 'git@example/rules.git' }, future: { x: 'git@example/rules.git' } },
        futureTool: { skills: { x: 'git@example/rules.git' } },
      },
      new Map([
        ['pi', new Set(['skills'])],
      ]),
      '1.0.0',
    )

    expect(report.compatible).toBe(false)
    expect(report.unknownTools).toEqual(['futureTool'])
    expect(report.unknownSubtypes).toEqual([{ tool: 'pi', subtype: 'future' }])
    expect(report.messages.join('\n')).toContain('requires AIS >=1.1.0')
  })

  it('builds diagnostics from explicit runtime inputs', async () => {
    const info = await buildEnvironmentInfo({
      version: '1.0.0',
      executable: '/tmp/ais/dist/index.js',
      configDir: '/tmp/config',
      userConfigPath: '/tmp/config/user.json',
      currentRepo: { name: 'rules', url: 'git@example/rules.git', path: '/tmp/rules' },
      gitCommit: async () => 'abc1234',
    })

    expect(info).toMatchObject({
      version: '1.0.0',
      executable: '/tmp/ais/dist/index.js',
      configDir: '/tmp/config',
      userConfigPath: '/tmp/config/user.json',
      developmentBuild: true,
      gitCommit: 'abc1234',
      currentRepository: { name: 'rules' },
    })
  })

  it('resolves status --target without mutating repository configuration', () => {
    const repos = {
      active: { name: 'active', url: 'git@example/active.git', path: '/tmp/active' },
      selected: { name: 'selected', url: 'git@example/selected.git', path: '/tmp/selected' },
    }

    expect(resolveStatusRepository(repos, 'active', 'selected')).toMatchObject({ name: 'selected' })
    expect(resolveStatusRepository(repos, 'active', 'git@example/selected.git')).toMatchObject({ name: 'selected' })
    expect(() => resolveStatusRepository(repos, 'active', 'missing')).toThrow('not found')
  })

  it('plans stale repository cleanup without scheduling real repository deletion', () => {
    const result = planRepositoryPrune({
      currentRepo: 'active',
      repos: {
        active: { name: 'active', url: 'git@example/active.git', path: '/tmp/active' },
        missing: { name: 'missing', url: 'git@example/missing.git', path: '/does/not/exist' },
        scratch: { name: 'scratch', url: '/private/tmp/run/scratchpad/rules', path: '/private/tmp/run/scratchpad/rules' },
        duplicate: { name: 'duplicate', url: 'git@example/active.git', path: '/tmp/duplicate' },
      },
      pathExists: p => p !== '/does/not/exist',
    })

    expect(result.remove.map(item => item.name)).toEqual(['duplicate', 'missing', 'scratch'])
    expect(result.remove.every(item => item.action === 'remove-config-only')).toBe(true)
    expect(result.keep).toContain('active')
  })

  it('groups adapter search hits into one asset with compatible tools', () => {
    const grouped = groupSearchEntries([
      { adapter: 'pi-skills', tool: 'pi', subtype: 'skills', entryName: 'review', sourceName: 'review', sourcePath: '/rules/skills/review', isDirectory: true, configured: true },
      { adapter: 'codex-skills', tool: 'codex', subtype: 'skills', entryName: 'review', sourceName: 'review', sourcePath: '/rules/skills/review', isDirectory: true, configured: false },
    ])

    expect(grouped).toEqual([{
      subtype: 'skills',
      entryName: 'review',
      sourceName: 'review',
      sourcePath: '/rules/skills/review',
      isDirectory: true,
      compatibleTools: ['codex', 'pi'],
      configuredTools: ['pi'],
      adapters: ['codex-skills', 'pi-skills'],
    }])
  })

  it('does not merge same-named assets from different source paths', () => {
    const grouped = groupSearchEntries([
      { adapter: 'pi-skills', tool: 'pi', subtype: 'skills', entryName: 'review', sourceName: 'review', sourcePath: '/rules/pi/review', isDirectory: true, configured: false },
      { adapter: 'codex-skills', tool: 'codex', subtype: 'skills', entryName: 'review', sourceName: 'review', sourcePath: '/rules/codex/review', isDirectory: true, configured: false },
    ])
    expect(grouped).toHaveLength(2)
  })

  it('resolves named global tool profiles and rejects unknown profiles', () => {
    const profiles = { personal: { tools: ['claude', 'pi', 'codex', 'pi'] } }
    expect(resolveProfileTools(profiles, 'personal')).toEqual(['claude', 'pi', 'codex'])
    expect(() => resolveProfileTools(profiles, 'missing')).toThrow('Profile "missing" not found')
  })

  it('reports a Git source without an upstream as not recoverable on another machine', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ais-unpublished-source-'))
    try {
      await fs.writeFile(path.join(dir, 'entry.txt'), 'entry')
      const { execa } = await import('execa')
      await execa('git', ['init', '-q'], { cwd: dir })
      await execa('git', ['add', '.'], { cwd: dir })
      await execa('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'init'], { cwd: dir })
      const result = await inspectSourceRecoverability({ name: 'rules', url: 'git@example/rules.git', path: dir })
      expect(result).toMatchObject({ recoverable: false, status: 'no-upstream' })
    } finally {
      await fs.remove(dir)
    }
  })

  it('prints installed global target paths and restart guidance', () => {
    const output = formatGlobalInstallGuidance([
      { tool: 'claude', targetPath: '/home/test/.claude/skills/review', action: 'added' },
      { tool: 'pi', targetPath: '/home/test/.pi/skills/review', action: 'added' },
    ])
    expect(output).toContain('/home/test/.claude/skills/review')
    expect(output).toContain('/home/test/.pi/skills/review')
    expect(output).toContain('Restart active agent sessions')
  })
})
