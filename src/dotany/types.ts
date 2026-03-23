/**
 * Core interfaces for the dotfile abstraction library.
 * This module provides a generic, pluggable foundation for dotfile management.
 */

/** Config passed to SourceResolver.resolve() */
export interface ResolveConfig {
    repoUrl?: string;
    targetDir?: string;
    [key: string]: unknown;
}

/** Pluggable source resolver interface */
export interface SourceResolver {
    resolve(name: string, config: ResolveConfig): Promise<ResolvedSource>;
    resolveFromManifest?(entry: ManifestEntry): Promise<ResolvedSource>;
    list?(config: ResolveConfig): Promise<string[]>;
    destinationPath?(name: string): Promise<string>;
}

export interface ResolvedSource {
    /** Final filename (may include suffix) */
    name: string;
    /** Absolute path to the source */
    path: string;
    /** Detected suffix, if any */
    suffix?: string;
    /** Override target filename (e.g. when sourceFile maps AGENTS.md -> CLAUDE.md) */
    targetName?: string;
}

/** Pluggable manifest persistence interface */
export interface ManifestStore {
    readAll(): Promise<Record<string, ManifestEntry>>;
    write(key: string, value: ManifestEntry): Promise<void>;
    delete(key: string): Promise<void>;
}

export interface ManifestEntry {
    sourceName: string;
    /** Plugin-specific metadata (e.g. repoUrl, targetDir) */
    meta?: Record<string, unknown>;
}

/** Result of a link operation */
export interface LinkResult {
    sourceName: string;
    targetName: string;
    linked: boolean;
    /** Absolute path to the symlink; callers can use this to compute ignore entries */
    targetPath: string;
}

/** Options for add() */
export interface AddOptions {
    alias?: string;
    targetDir?: string;
    repoUrl?: string;
}

export interface ApplyResult {
    linked: LinkResult[];
    skipped: string[];
}

/** Result of a stow operation (batch link) */
export type StowResult = LinkResult[];

/** diff() returns: differences between manifest and filesystem */
export interface DiffResult {
    toCreate: string[];   // in manifest but symlink missing
    toUpdate: string[];   // symlink exists but points to different source
    toDelete: string[];   // symlink exists but not in manifest (orphans)
}

/** status() returns: per-entry symlink status */
export interface StatusEntry {
    alias: string;
    sourceName: string;
    targetPath: string;
    status: 'linked' | 'missing' | 'conflict'; // conflict = exists but not a symlink
}
export interface StatusResult { entries: StatusEntry[]; }

/** Options for import() */
export interface ManagerImportOptions {
    alias?: string;
    force?: boolean;
    repoUrl?: string;
}

/**
 * Dynamic repo resolver function for multi-repo support.
 * Returns Promise<any> to avoid coupling with app-specific RepoConfig type.
 */
export type RepoResolverFn = (repoUrl: string, entryName: string) => Promise<any>;

/** DotfileManager creation options */
export interface DotfileCreateOptions {
    name: string;
    source: SourceResolver;
    /** Target directory relative to targetRoot */
    targetDir: string;
    /** Defaults to process.cwd() */
    targetRoot?: string;
    mode?: 'file' | 'directory' | 'hybrid';
    /** If not provided, operates in stow mode (no manifest) */
    manifest?: ManifestStore;
    /** Optional target name resolver (handles suffix-aware renaming) */
    resolveTargetName?: (name: string, alias?: string, sourceSuffix?: string) => string;
}
