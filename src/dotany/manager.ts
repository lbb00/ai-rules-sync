import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { add as linkanyAdd } from 'linkany';
import { DotfileCreateOptions, LinkResult, AddOptions, ApplyResult, ManifestEntry, StowResult, DiffResult, StatusEntry, StatusResult, ManagerImportOptions } from './types.js';

/**
 * Core dotfile manager: handles symlink creation and manifest reads/writes.
 * Works in two modes:
 *   - Stow mode: no manifest, directory is the source of truth
 *   - Manifest mode: manifest tracks all linked entries
 */
export class DotfileManager {
    constructor(private opts: DotfileCreateOptions) {}

    get targetRoot(): string {
        return this.opts.targetRoot ?? process.cwd();
    }

    get targetDir(): string {
        return this.opts.targetDir;
    }

    /**
     * Link a single file and optionally write to manifest (manifest mode).
     * Equivalent to `chezmoi add`.
     */
    async add(name: string, options: AddOptions = {}): Promise<LinkResult> {
        const { alias, targetDir, repoUrl } = options;

        // Resolve source
        const resolved = await this.opts.source.resolve(name, { repoUrl, targetDir });

        // Resolve target name (suffix-aware if resolver provided)
        const targetName = this.opts.resolveTargetName
            ? this.opts.resolveTargetName(name, alias, resolved.suffix)
            : (alias || resolved.name);

        // Determine target directory
        const targetDirPath = targetDir ? path.normalize(targetDir) : this.opts.targetDir;

        const absoluteRoot = path.resolve(this.targetRoot);
        const targetDirAbsolute = path.join(absoluteRoot, targetDirPath);
        const targetPath = path.join(targetDirAbsolute, targetName);

        // Ensure target directory exists
        await fs.ensureDir(targetDirAbsolute);

        // Create symlink
        const linkResult = await this.doLink(resolved.path, targetPath);
        if (linkResult === 'conflict') {
            console.log(chalk.yellow(`Warning: "${targetPath}" exists and is not a symlink. Skipping to avoid data loss.`));
            return { sourceName: resolved.name, targetName, linked: false, targetPath };
        }
        console.log(chalk.green(`Linked "${resolved.name}" to project as "${targetName}".`));

        // Write to manifest if one is provided
        if (this.opts.manifest) {
            const manifestEntry: ManifestEntry = {
                sourceName: name,
                meta: { repoUrl, targetDir, alias },
            };
            await this.opts.manifest.write(targetName, manifestEntry);
        }

        return { sourceName: resolved.name, targetName, linked: true, targetPath };
    }

    /**
     * Remove a symlink and optionally delete from manifest.
     * Equivalent to `chezmoi remove`.
     */
    async remove(alias: string): Promise<void> {
        const absoluteRoot = path.resolve(this.targetRoot);

        // Get target directory (from manifest entry if available)
        let targetDirPath = this.opts.targetDir;
        if (this.opts.manifest) {
            const entries = await this.opts.manifest.readAll();
            const entry = entries[alias];
            if (entry?.meta?.targetDir) {
                targetDirPath = path.normalize(entry.meta.targetDir as string);
            }
        }

        const targetDir = path.join(absoluteRoot, targetDirPath);
        let actualFileName = alias;
        let targetPath = path.join(targetDir, alias);

        if (!await fs.pathExists(targetPath)) {
            const found = await this.findWithCommonSuffix(targetDir, alias);
            if (found) {
                actualFileName = path.basename(found);
                targetPath = found;
            }
        }

        const removed = await this.doUnlink(targetPath);
        if (removed) {
            console.log(chalk.green(`Removed "${alias}" from project.`));
        } else {
            console.log(chalk.yellow(`Entry "${alias}" not found in project.`));
        }

        // Remove from manifest
        if (this.opts.manifest) {
            await this.opts.manifest.delete(alias);
        }
    }

    /**
     * Idempotently apply all manifest entries (chezmoi apply semantics).
     * Requires manifest and a source that supports resolveFromManifest().
     */
    async apply(): Promise<ApplyResult> {
        if (!this.opts.manifest) {
            throw new Error('apply() requires a manifest store');
        }

        const entries = await this.opts.manifest.readAll();
        const linked: LinkResult[] = [];
        const skipped: string[] = [];

        for (const [alias, entry] of Object.entries(entries)) {
            try {
                let result: LinkResult;
                if (this.opts.source.resolveFromManifest) {
                    // Use manifest-aware resolution (supports multi-repo)
                    const resolved = await this.opts.source.resolveFromManifest(entry);
                    const targetName = this.opts.resolveTargetName
                        ? this.opts.resolveTargetName(entry.sourceName, alias !== entry.sourceName ? alias : undefined, resolved.suffix)
                        : (alias !== entry.sourceName ? alias : resolved.name);
                    const targetDirPath = entry.meta?.targetDir
                        ? path.normalize(entry.meta.targetDir as string)
                        : this.opts.targetDir;
                    const absoluteRoot = path.resolve(this.targetRoot);
                    const targetDirAbsolute = path.join(absoluteRoot, targetDirPath);
                    const targetPath = path.join(targetDirAbsolute, targetName);

                    await fs.ensureDir(targetDirAbsolute);

                    const applyLinkResult = await this.doLink(resolved.path, targetPath);
                    if (applyLinkResult === 'conflict') {
                        linked.push({ sourceName: resolved.name, targetName, linked: false, targetPath });
                        continue;
                    }
                    console.log(chalk.green(`Linked "${resolved.name}" to project as "${targetName}".`));
                    result = { sourceName: resolved.name, targetName, linked: true, targetPath };
                } else {
                    // Fall back to add() with manifest entry data
                    result = await this.add(entry.sourceName, {
                        alias: alias !== entry.sourceName ? alias : undefined,
                        targetDir: entry.meta?.targetDir as string | undefined,
                        repoUrl: entry.meta?.repoUrl as string | undefined,
                    });
                }
                linked.push(result);
            } catch (e) {
                console.log(chalk.yellow(`Skipped "${alias}": ${(e as Error).message}`));
                skipped.push(alias);
            }
        }

        return { linked, skipped };
    }

    /**
     * Stow all files from source into the target directory (stow-style, no manifest).
     * Requires source to implement list().
     */
    async stow(): Promise<StowResult> {
        if (!this.opts.source.list) {
            throw new Error('stow() requires source to implement list()');
        }
        const names = await this.opts.source.list({});
        const results: StowResult = [];
        for (const name of names) {
            const result = await this.add(name);
            results.push(result);
        }
        return results;
    }

    /**
     * Remove all stowed symlinks.
     * If manifest is present, uses manifest entries. Otherwise uses source.list().
     */
    async unstow(): Promise<void> {
        const absoluteRoot = path.resolve(this.targetRoot);
        if (this.opts.manifest) {
            const entries = await this.opts.manifest.readAll();
            for (const alias of Object.keys(entries)) {
                await this.remove(alias);
            }
        } else if (this.opts.source.list) {
            const names = await this.opts.source.list({});
            for (const name of names) {
                const targetPath = path.join(absoluteRoot, this.opts.targetDir, name);
                await this.doUnlink(targetPath);
            }
        } else {
            throw new Error('unstow() requires either manifest or source.list()');
        }
    }

    /**
     * Re-stow: unstow then stow.
     */
    async restow(): Promise<StowResult> {
        await this.unstow();
        return this.stow();
    }

    /**
     * Preview what apply() would do without executing.
     * Requires manifest.
     */
    async diff(): Promise<DiffResult> {
        if (!this.opts.manifest) {
            throw new Error('diff() requires a manifest store');
        }
        const entries = await this.opts.manifest.readAll();
        const absoluteRoot = path.resolve(this.targetRoot);
        const toCreate: string[] = [];
        const toUpdate: string[] = [];
        const toDelete: string[] = [];

        for (const [alias, entry] of Object.entries(entries)) {
            const targetDirPath = entry.meta?.targetDir
                ? path.normalize(entry.meta.targetDir as string)
                : this.opts.targetDir;
            const targetPath = path.join(absoluteRoot, targetDirPath, alias);

            const lstats = await fs.lstat(targetPath).catch(() => null);
            if (!lstats) {
                toCreate.push(alias);
                continue;
            }
            if (!lstats.isSymbolicLink()) {
                toUpdate.push(alias); // conflict
                continue;
            }
            // Check if pointing to the expected source
            try {
                let expectedSource: string;
                if (this.opts.source.resolveFromManifest) {
                    const resolved = await this.opts.source.resolveFromManifest(entry);
                    expectedSource = resolved.path;
                } else {
                    const resolved = await this.opts.source.resolve(entry.sourceName, {
                        repoUrl: entry.meta?.repoUrl as string | undefined,
                        targetDir: entry.meta?.targetDir as string | undefined,
                    });
                    expectedSource = resolved.path;
                }
                const currentTarget = await fs.readlink(targetPath);
                if (currentTarget !== expectedSource) {
                    toUpdate.push(alias);
                }
            } catch {
                toUpdate.push(alias);
            }
        }

        return { toCreate, toUpdate, toDelete };
    }

    /**
     * Return symlink status for each manifest entry.
     * Requires manifest.
     */
    async status(): Promise<StatusResult> {
        if (!this.opts.manifest) {
            throw new Error('status() requires a manifest store');
        }
        const entries = await this.opts.manifest.readAll();
        const absoluteRoot = path.resolve(this.targetRoot);
        const statusEntries: StatusEntry[] = [];

        for (const [alias, entry] of Object.entries(entries)) {
            const targetDirPath = entry.meta?.targetDir
                ? path.normalize(entry.meta.targetDir as string)
                : this.opts.targetDir;
            const targetPath = path.join(absoluteRoot, targetDirPath, alias);

            const lstats = await fs.lstat(targetPath).catch(() => null);
            let status: 'linked' | 'missing' | 'conflict';
            if (!lstats) {
                status = 'missing';
            } else if (lstats.isSymbolicLink()) {
                status = 'linked';
            } else {
                status = 'conflict';
            }

            statusEntries.push({
                alias,
                sourceName: entry.sourceName,
                targetPath,
                status,
            });
        }

        return { entries: statusEntries };
    }

    /**
     * Import a file into the source and replace it with a symlink.
     * Pure filesystem operation — no git logic.
     * Requires source to implement destinationPath().
     */
    async import(targetFilePath: string, name: string, options: ManagerImportOptions = {}): Promise<LinkResult> {
        const { force = false, alias, repoUrl } = options;

        // Validate: file must exist and not be a symlink
        if (!await fs.pathExists(targetFilePath)) {
            throw new Error(`File "${targetFilePath}" does not exist.`);
        }
        const stats = await fs.lstat(targetFilePath);
        if (stats.isSymbolicLink()) {
            throw new Error(`"${targetFilePath}" is already a symlink (already managed).`);
        }

        if (!this.opts.source.destinationPath) {
            throw new Error('import() requires source to implement destinationPath()');
        }
        const sourcePath = await this.opts.source.destinationPath(name);

        // Handle existing destination
        if (await fs.pathExists(sourcePath)) {
            if (!force) {
                throw new Error(`"${name}" already exists at ${sourcePath}. Use force: true to overwrite.`);
            }
            await fs.remove(sourcePath);
        }

        // Ensure destination directory exists
        await fs.ensureDir(path.dirname(sourcePath));

        // Copy to source location
        await fs.copy(targetFilePath, sourcePath);
        console.log(chalk.green(`Copied "${name}" to source.`));

        // Remove original
        await fs.remove(targetFilePath);

        // Create symlink
        await this.doLink(sourcePath, targetFilePath);
        console.log(chalk.green(`Linked "${name}" back to "${targetFilePath}".`));

        const targetName = alias || path.basename(targetFilePath);

        // Write to manifest if one is provided
        if (this.opts.manifest) {
            const manifestEntry: ManifestEntry = {
                sourceName: name,
                meta: { alias, repoUrl },
            };
            await this.opts.manifest.write(targetName, manifestEntry);
        }

        return { sourceName: name, targetName, linked: true, targetPath: targetFilePath };
    }

    /**
     * Read all manifest entries.
     */
    async readManifest(): Promise<Record<string, ManifestEntry>> {
        if (!this.opts.manifest) return {};
        return this.opts.manifest.readAll();
    }

    /**
     * Create source → target symlink via linkany in-memory mode (atomic operation).
     * Returns 'linked' (created/updated) | 'noop' (already correct) | 'conflict' (real file in the way).
     */
    private async doLink(source: string, target: string): Promise<'linked' | 'noop' | 'conflict'> {
        if (await fs.pathExists(target)) {
            const st = await fs.lstat(target);
            if (!st.isSymbolicLink()) return 'conflict';
            const current = await fs.readlink(target);
            if (current !== source) {
                // linkany rejects migrating an existing symlink; unlink first
                await fs.unlink(target);
            }
            // current === source: linkany will detect isSymlinkTo → noop
        }
        const { result } = await linkanyAdd(
            { version: 1 as const, installs: [] },
            { source, target, atomic: true }
        );
        if (!result.ok) throw new Error(result.errors.join('; ') || 'Failed to link');
        const actuallyLinked = result.changes.some(c => c.action === 'symlink' || c.action === 'move');
        return actuallyLinked ? 'linked' : 'noop';
    }

    /**
     * Safely remove target symlink (only symlinks, never real files).
     * Returns true if removed.
     */
    private async doUnlink(target: string): Promise<boolean> {
        if (await fs.pathExists(target)) {
            const st = await fs.lstat(target);
            if (st.isSymbolicLink()) { await fs.unlink(target); return true; }
        }
        return false;
    }

    private async findWithCommonSuffix(targetDir: string, alias: string): Promise<string | undefined> {
        const suffixes = ['.md', '.instructions.md', '.mdc'];
        for (const suffix of suffixes) {
            if (!alias.endsWith(suffix)) {
                const candidate = path.join(targetDir, `${alias}${suffix}`);
                if (await fs.pathExists(candidate)) return candidate;
            }
        }
        return undefined;
    }

}
