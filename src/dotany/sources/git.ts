import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { SourceResolver, ResolveConfig, ResolvedSource } from '../types.js';

/**
 * SourceResolver backed by a git repository.
 * Automatically handles clone/pull; callers only need to specify where to cache the clone.
 */
export class GitSource implements SourceResolver {
    private cloned = false;

    constructor(
        private repoUrl: string,          // git remote URL, e.g. https://github.com/user/repo.git
        private cloneDir: string,         // local directory to clone into (caller decides location)
        private sourceSubDir: string = '' // sub-directory inside the repo; defaults to repo root
    ) {}

    /** Ensure the repo is cloned/pulled. Idempotent. */
    private async ensureCloned(): Promise<void> {
        if (this.cloned) return;
        if (await fs.pathExists(path.join(this.cloneDir, '.git'))) {
            await execa('git', ['pull'], { cwd: this.cloneDir });
        } else {
            await execa('git', ['clone', this.repoUrl, this.cloneDir]);
        }
        this.cloned = true;
    }

    async resolve(name: string, _config: ResolveConfig = {}): Promise<ResolvedSource> {
        await this.ensureCloned();
        const filePath = path.join(this.cloneDir, this.sourceSubDir, name);
        if (!await fs.pathExists(filePath)) {
            const location = this.sourceSubDir ? this.sourceSubDir : '/';
            throw new Error(`"${name}" not found in ${this.repoUrl} (${location})`);
        }
        return { name, path: filePath };
    }

    async list(_config: ResolveConfig = {}): Promise<string[]> {
        await this.ensureCloned();
        const dir = path.join(this.cloneDir, this.sourceSubDir);
        if (!await fs.pathExists(dir)) return [];
        return fs.readdir(dir);
    }

    async destinationPath(name: string): Promise<string> {
        return path.join(this.cloneDir, this.sourceSubDir, name);
    }
}
