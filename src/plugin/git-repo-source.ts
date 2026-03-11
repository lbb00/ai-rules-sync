import { SourceResolver, ResolvedSource, ResolveConfig, ManifestEntry, RepoResolverFn } from '../dotany/types.js';
import { GitSource } from '../dotany/sources/git.js';
import { getRepoSourceConfig, getSourceDir, getSourceFileOverride, getTargetFileOverride } from '../project-config.js';
import { RepoConfig } from '../config.js';

/**
 * Config subset needed for GitRepoSource (mirrors AdapterConfig fields used in source resolution)
 */
export interface GitRepoSourceConfig {
    tool: string;
    subtype: string;
    defaultSourceDir: string;
    resolveSource?: (repoDir: string, rootPath: string, name: string, options?: { sourceFileOverride?: string }) => Promise<{
        sourceName: string;
        sourcePath: string;
        suffix?: string;
    }>;
    resolveTargetName?: (name: string, alias?: string, sourceSuffix?: string) => string;
}

/**
 * SourceResolver that resolves files from a git repository.
 * Supports static RepoConfig, dynamic RepoResolverFn (multi-repo), or null (remove-only mode).
 */
export class GitRepoSource implements SourceResolver {
    constructor(
        private repoOrResolver: RepoConfig | RepoResolverFn | null,
        private config: GitRepoSourceConfig
    ) {}

    async resolve(name: string, resolveConfig: ResolveConfig = {}): Promise<ResolvedSource> {
        const repo = await this.getRepo(resolveConfig.repoUrl as string | undefined, name);
        return this.resolveFromRepo(repo, name);
    }

    /**
     * Resolve source using a manifest entry (supports multi-repo apply() flows).
     * Uses entry.meta.repoUrl to find the correct repository.
     */
    async resolveFromManifest(entry: ManifestEntry): Promise<ResolvedSource> {
        const repoUrl = entry.meta?.repoUrl as string | undefined;
        const repo = await this.getRepo(repoUrl, entry.sourceName);
        return this.resolveFromRepo(repo, entry.sourceName);
    }

    /**
     * Return the destination path in the repo for import() operations.
     */
    async destinationPath(name: string): Promise<string> {
        const repo = await this.getRepo(undefined, name);
        const repoConfig = await getRepoSourceConfig(repo.path);
        const sourceDir = getSourceDir(repoConfig, this.config.tool, this.config.subtype, this.config.defaultSourceDir);
        return new GitSource(repo.url, repo.path, sourceDir).destinationPath(name);
    }

    private async getRepo(repoUrl: string | undefined, name: string): Promise<RepoConfig> {
        if (typeof this.repoOrResolver === 'function') {
            if (!repoUrl) {
                throw new Error(`repoUrl is required when using a repo resolver (entry: "${name}")`);
            }
            return this.repoOrResolver(repoUrl, name);
        }
        if (!this.repoOrResolver) {
            throw new Error(`No repo configured for GitRepoSource (entry: "${name}")`);
        }
        return this.repoOrResolver;
    }

    private async resolveFromRepo(repo: RepoConfig, name: string): Promise<ResolvedSource> {
        const repoConfig = await getRepoSourceConfig(repo.path);
        const sourceDir = getSourceDir(repoConfig, this.config.tool, this.config.subtype, this.config.defaultSourceDir);
        const sourceFileOverride = getSourceFileOverride(repoConfig, this.config.tool, this.config.subtype);
        const targetFileOverride = getTargetFileOverride(repoConfig, this.config.tool, this.config.subtype);

        if (this.config.resolveSource) {
            // ai-rules-sync specific: suffix-aware resolution (hybrid/file mode)
            const resolved = await this.config.resolveSource(repo.path, sourceDir, name, { sourceFileOverride });
            const result: ResolvedSource = {
                name: resolved.sourceName,
                path: resolved.sourcePath,
                suffix: resolved.suffix,
            };
            if (targetFileOverride) {
                result.targetName = targetFileOverride;
            }
            return result;
        }

        // Generic path: delegate to GitSource
        // (repo is already cloned by the time we get here; ensureCloned() will run git pull)
        return new GitSource(repo.url, repo.path, sourceDir).resolve(name);
    }
}
