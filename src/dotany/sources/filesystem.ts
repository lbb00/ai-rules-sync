import fs from 'fs-extra';
import path from 'path';
import { SourceResolver, ResolvedSource, ResolveConfig } from '../types.js';

/**
 * SourceResolver backed by a local directory (foundation for Stow-style management).
 * Unlike GitRepoSource, this has no git dependency.
 */
export class FileSystemSource implements SourceResolver {
    constructor(private sourceDir: string) {}

    async resolve(name: string, _config: ResolveConfig = {}): Promise<ResolvedSource> {
        const filePath = path.join(this.sourceDir, name);
        if (!await fs.pathExists(filePath)) {
            throw new Error(`"${name}" not found in ${this.sourceDir}`);
        }
        return { name, path: filePath };
    }

    async list(_config: ResolveConfig = {}): Promise<string[]> {
        if (!await fs.pathExists(this.sourceDir)) {
            return [];
        }
        return fs.readdir(this.sourceDir);
    }

    async destinationPath(name: string): Promise<string> {
        return path.join(this.sourceDir, name);
    }
}
