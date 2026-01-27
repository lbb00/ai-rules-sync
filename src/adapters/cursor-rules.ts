import { SyncAdapter } from './types.js';
import { createBaseAdapter, createMultiSuffixResolver, createSuffixAwareTargetResolver } from './base.js';

const SUFFIXES = ['.mdc', '.md'];

/**
 * Adapter for Cursor Rules (.cursor/rules/)
 * Mode: hybrid - links both directories and files (.mdc, .md)
 */
export const cursorRulesAdapter: SyncAdapter = createBaseAdapter({
    name: 'cursor-rules',
    tool: 'cursor',
    subtype: 'rules',
    configPath: ['cursor', 'rules'],
    defaultSourceDir: '.cursor/rules',
    targetDir: '.cursor/rules',
    mode: 'hybrid',
    hybridFileSuffixes: SUFFIXES,

    resolveSource: createMultiSuffixResolver(SUFFIXES, 'Rule'),
    resolveTargetName: createSuffixAwareTargetResolver(SUFFIXES)
});
