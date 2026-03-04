import { ManifestStore, ManifestEntry } from '../dotany/types.js';
import { getCombinedProjectConfig, addDependencyGeneric, removeDependencyGeneric } from '../project-config.js';
import type { RuleEntry } from '../project-config.js';

/**
 * ManifestStore implementation that reads/writes ai-rules-sync.json.
 * Migrated from project-config.ts dependency management logic.
 */
export class AiRulesSyncManifest implements ManifestStore {
    constructor(
        private projectPath: string,
        private configPath: [string, string],
        private isLocal: boolean = false
    ) {}

    async readAll(): Promise<Record<string, ManifestEntry>> {
        const config = await getCombinedProjectConfig(this.projectPath);
        const [topLevel, subLevel] = this.configPath;

        // agentsMd is flat (no subLevel nesting)
        const section: Record<string, RuleEntry> | undefined = topLevel === 'agentsMd'
            ? (config as any)[topLevel]
            : (config as any)[topLevel]?.[subLevel];

        if (!section) return {};

        const result: Record<string, ManifestEntry> = {};
        for (const [key, value] of Object.entries(section)) {
            if (typeof value === 'string') {
                result[key] = {
                    sourceName: key,
                    meta: { repoUrl: value },
                };
            } else if (value && typeof value === 'object') {
                const entry = value as { url: string; rule?: string; targetDir?: string };
                result[key] = {
                    sourceName: entry.rule || key,
                    meta: {
                        repoUrl: entry.url,
                        ...(entry.targetDir ? { targetDir: entry.targetDir } : {}),
                        ...(entry.rule && entry.rule !== key ? { alias: key } : {}),
                    },
                };
            }
        }
        return result;
    }

    async write(key: string, value: ManifestEntry): Promise<void> {
        const repoUrl = value.meta?.repoUrl as string;
        const originalName = value.sourceName;
        const alias = value.meta?.alias as string | undefined;
        const targetDir = value.meta?.targetDir as string | undefined;

        await addDependencyGeneric(
            this.projectPath,
            this.configPath,
            originalName,
            repoUrl,
            key !== originalName ? key : alias,
            this.isLocal,
            targetDir
        );
    }

    async delete(key: string): Promise<void> {
        await removeDependencyGeneric(this.projectPath, this.configPath, key);
    }
}
