import { ManifestStore, ManifestEntry } from '../dotany/types.js';
import { getUserProjectConfig } from '../config.js';
import { getConfigSectionWithFallback } from '../project-config.js';
import { parseManifestSection } from './ai-rules-sync-manifest.js';

/**
 * Read-only ManifestStore over user.json (~/.config/ai-rules-sync/user.json).
 * User-scope entries are written via addDependencyGeneric + adapter.link()
 * directly (see installUserEntriesForAdapter), not through this manifest —
 * write()/delete() are unused by that path and intentionally unsupported here.
 */
export class UserRulesSyncManifest implements ManifestStore {
    constructor(private configPath: string[]) {}

    async readAll(): Promise<Record<string, ManifestEntry>> {
        const config = await getUserProjectConfig();
        const [topLevel, subLevel] = this.configPath;
        const section = getConfigSectionWithFallback(config, topLevel, subLevel);
        return parseManifestSection(section);
    }

    async write(): Promise<void> {
        throw new Error('UserRulesSyncManifest is read-only — user-scope entries are written via addDependencyGeneric, not this manifest.');
    }

    async delete(): Promise<void> {
        throw new Error('UserRulesSyncManifest is read-only — user-scope entries are removed via removeDependencyGeneric, not this manifest.');
    }
}
