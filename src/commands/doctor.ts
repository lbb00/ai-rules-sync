/**
 * `ais doctor` — verify configured entries actually resolve to healthy
 * symlinks, without mutating anything (no repo cloning, no relinking).
 * Reuses DotfileManager.status()/diff(), which already existed in the
 * dotany layer but had no CLI command wired to them.
 */

import os from 'os';
import { SyncAdapter } from '../adapters/types.js';
import { RepoConfig } from '../config.js';
import type { RepoResolverFn } from '../dotany/types.js';

export type DoctorEntryStatus = 'ok' | 'missing' | 'conflict' | 'stale';

export interface DoctorEntryResult {
    tool: string;
    subtype: string;
    scope: 'project' | 'user';
    alias: string;
    targetPath: string;
    status: DoctorEntryStatus;
}

export interface DoctorResult {
    entries: DoctorEntryResult[];
    counts: Record<DoctorEntryStatus, number>;
}

/**
 * Looks up an already-configured repo by URL — never clones or mutates
 * config. doctor is read-only: an entry whose repo isn't available locally
 * is reported as 'stale' rather than triggering a network fetch.
 */
function readOnlyRepoResolver(repos: Record<string, RepoConfig>): RepoResolverFn {
    return async (repoUrl: string, entryName: string) => {
        for (const repo of Object.values(repos)) {
            if (repo.url === repoUrl) return repo;
        }
        throw new Error(`Repository for "${entryName}" (${repoUrl}) is not configured locally.`);
    };
}

async function checkAdapter(
    adapter: SyncAdapter,
    projectPath: string,
    resolver: RepoResolverFn,
    scope: 'project' | 'user'
): Promise<DoctorEntryResult[]> {
    const manager = adapter.forProject(projectPath, resolver, false, scope === 'user');
    const statusResult = await manager.status();
    if (statusResult.entries.length === 0) return [];

    const diffResult = await manager.diff();
    const staleAliases = new Set(diffResult.toUpdate);

    return statusResult.entries.map(entry => {
        let status: DoctorEntryStatus;
        if (entry.status === 'missing') status = 'missing';
        else if (entry.status === 'conflict') status = 'conflict';
        else if (staleAliases.has(entry.alias)) status = 'stale';
        else status = 'ok';

        return {
            tool: adapter.tool,
            subtype: adapter.subtype,
            scope,
            alias: entry.alias,
            targetPath: entry.targetPath,
            status
        };
    });
}

export async function runDoctor(
    adapters: SyncAdapter[],
    projectPath: string,
    repos: Record<string, RepoConfig>,
    options: { user?: boolean } = {}
): Promise<DoctorResult> {
    const resolver = readOnlyRepoResolver(repos);

    const entries: DoctorEntryResult[] = [];
    for (const adapter of adapters) {
        entries.push(...(await checkAdapter(adapter, projectPath, resolver, 'project')));
    }
    if (options.user) {
        for (const adapter of adapters) {
            entries.push(...(await checkAdapter(adapter, os.homedir(), resolver, 'user')));
        }
    }

    const counts: Record<DoctorEntryStatus, number> = { ok: 0, missing: 0, conflict: 0, stale: 0 };
    for (const entry of entries) counts[entry.status]++;

    return { entries, counts };
}
