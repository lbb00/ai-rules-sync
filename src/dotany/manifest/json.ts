import fs from 'fs-extra';
import path from 'path';
import { ManifestStore, ManifestEntry } from '../types.js';

/**
 * Generic JSON-based ManifestStore.
 * Supports optional namespace for multi-tool manifests.
 *
 * File structure with namespace:    { [namespace]: { [alias]: ManifestEntry } }
 * File structure without namespace: { [alias]: ManifestEntry }
 */
export class JsonManifest implements ManifestStore {
    constructor(
        private filePath: string,
        private namespace?: string
    ) {}

    async readAll(): Promise<Record<string, ManifestEntry>> {
        if (!await fs.pathExists(this.filePath)) return {};
        const raw = await fs.readJson(this.filePath);
        const section = this.namespace ? raw[this.namespace] : raw;
        if (!section || typeof section !== 'object') return {};
        return section as Record<string, ManifestEntry>;
    }

    async write(key: string, value: ManifestEntry): Promise<void> {
        let raw: Record<string, unknown> = {};
        if (await fs.pathExists(this.filePath)) {
            raw = await fs.readJson(this.filePath);
        }
        if (this.namespace) {
            if (!raw[this.namespace] || typeof raw[this.namespace] !== 'object') {
                raw[this.namespace] = {};
            }
            (raw[this.namespace] as Record<string, unknown>)[key] = value;
        } else {
            raw[key] = value;
        }
        await fs.ensureDir(path.dirname(this.filePath));
        await fs.writeJson(this.filePath, raw, { spaces: 2 });
    }

    async delete(key: string): Promise<void> {
        if (!await fs.pathExists(this.filePath)) return;
        const raw = await fs.readJson(this.filePath);
        if (this.namespace) {
            if (raw[this.namespace] && typeof raw[this.namespace] === 'object') {
                delete (raw[this.namespace] as Record<string, unknown>)[key];
            }
        } else {
            delete raw[key];
        }
        await fs.writeJson(this.filePath, raw, { spaces: 2 });
    }
}
