import fs from 'fs-extra';
import path from 'path';
import { SyncAdapter, ResolvedSource } from './types.js';
import { createBaseAdapter } from './base.js';

const SUFFIX_PROMPT_MD = '.prompt.md';
const SUFFIX_MD = '.md';

/**
 * Adapter for Copilot Prompt files (.github/prompts/)
 * Mode: file - links individual prompt files (.prompt.md or .md)
 */
export const copilotPromptsAdapter: SyncAdapter = createBaseAdapter({
    name: 'copilot-prompts',
    tool: 'copilot',
    subtype: 'prompts',
    configPath: ['copilot', 'prompts'],
    defaultSourceDir: '.github/prompts',
    targetDir: '.github/prompts',
    mode: 'file',
    fileSuffixes: [SUFFIX_PROMPT_MD, SUFFIX_MD],

    async resolveSource(repoDir: string, rootPath: string, name: string): Promise<ResolvedSource> {
        // If name already has a known suffix, use as-is
        if (name.endsWith(SUFFIX_PROMPT_MD)) {
            const sourcePath = path.join(repoDir, rootPath, name);
            if (!await fs.pathExists(sourcePath)) {
                throw new Error(`Prompt "${name}" not found in repository.`);
            }
            return {
                sourceName: name,
                sourcePath,
                suffix: SUFFIX_PROMPT_MD
            };
        }

        if (name.endsWith(SUFFIX_MD)) {
            const sourcePath = path.join(repoDir, rootPath, name);
            if (!await fs.pathExists(sourcePath)) {
                throw new Error(`Prompt "${name}" not found in repository.`);
            }
            return {
                sourceName: name,
                sourcePath,
                suffix: SUFFIX_MD
            };
        }

        // No suffix provided - try to resolve
        const candA = `${name}${SUFFIX_PROMPT_MD}`;
        const candB = `${name}${SUFFIX_MD}`;
        const pathA = path.join(repoDir, rootPath, candA);
        const pathB = path.join(repoDir, rootPath, candB);
        const existsA = await fs.pathExists(pathA);
        const existsB = await fs.pathExists(pathB);

        if (existsA && existsB) {
            throw new Error(`Both "${candA}" and "${candB}" exist in repository. Please specify the suffix explicitly.`);
        }

        if (existsA) {
            return {
                sourceName: candA,
                sourcePath: pathA,
                suffix: SUFFIX_PROMPT_MD
            };
        }

        if (existsB) {
            return {
                sourceName: candB,
                sourcePath: pathB,
                suffix: SUFFIX_MD
            };
        }

        throw new Error(`Prompt "${name}" not found in repository.`);
    },

    resolveTargetName(name: string, alias?: string, sourceSuffix?: string): string {
        const base = alias || name;

        // If base already has a known suffix, use as-is
        if (base.endsWith(SUFFIX_PROMPT_MD) || base.endsWith(SUFFIX_MD)) {
            return base;
        }

        // Add the source suffix if available
        if (sourceSuffix) {
            return `${base}${sourceSuffix}`;
        }

        return base;
    }
});
