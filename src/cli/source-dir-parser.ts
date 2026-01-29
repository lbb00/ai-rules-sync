/**
 * Parse -s/--source-dir CLI parameters into SourceDirConfig
 * Supports both simple format (for single adapter context) and dot notation format
 */

import { SourceDirConfig } from '../project-config.js';

/**
 * Parse a single source-dir parameter value
 * @param value - The parameter value (e.g., "custom/rules" or "cursor.rules=custom/rules")
 * @param contextTool - Optional tool from command context (e.g., "cursor" from "ais cursor rules add-all")
 * @param contextSubtype - Optional subtype from command context (e.g., "rules" from "ais cursor rules add-all")
 * @returns Parsed SourceDirConfig fragment
 */
export function parseSourceDirParam(
    value: string,
    contextTool?: string,
    contextSubtype?: string
): SourceDirConfig {
    const result: SourceDirConfig = {};

    // Check if it contains '=' (dot notation format)
    if (value.includes('=')) {
        const [key, path] = value.split('=', 2);
        if (!key || !path) {
            throw new Error(`Invalid source-dir format: "${value}". Expected: <tool>.<subtype>=<path> or <subtype>=<path>`);
        }

        // Check if key contains dot (full tool.subtype format)
        if (key.includes('.')) {
            const [tool, subtype] = key.split('.', 2);
            if (!tool || !subtype) {
                throw new Error(`Invalid source-dir key: "${key}". Expected: <tool>.<subtype>`);
            }
            setNestedPath(result, tool, subtype, path);
        } else {
            // Just subtype, need context tool
            const subtype = key;
            if (!contextTool) {
                throw new Error(`Cannot infer tool for "${value}". Use full format: <tool>.<subtype>=<path>`);
            }
            setNestedPath(result, contextTool, subtype, path);
        }
    } else {
        // Simple format: just a path, need both context tool and subtype
        const path = value;
        if (!contextTool || !contextSubtype) {
            throw new Error(`Cannot infer tool and subtype for "${value}". Use format: <tool>.<subtype>=<path>`);
        }
        setNestedPath(result, contextTool, contextSubtype, path);
    }

    return result;
}

/**
 * Parse multiple source-dir parameters and merge them
 * @param values - Array of source-dir parameter values
 * @param contextTool - Optional tool from command context
 * @param contextSubtype - Optional subtype from command context
 * @returns Merged SourceDirConfig
 */
export function parseSourceDirParams(
    values: string[],
    contextTool?: string,
    contextSubtype?: string
): SourceDirConfig {
    const result: SourceDirConfig = {};

    for (const value of values) {
        const parsed = parseSourceDirParam(value, contextTool, contextSubtype);
        mergeSourceDirConfig(result, parsed);
    }

    return result;
}

/**
 * Set a nested path in SourceDirConfig
 */
function setNestedPath(config: SourceDirConfig, tool: string, subtype: string, path: string): void {
    if (!config[tool as keyof SourceDirConfig]) {
        (config as any)[tool] = {};
    }
    (config as any)[tool][subtype] = path;
}

/**
 * Merge two SourceDirConfig objects (source into target)
 */
function mergeSourceDirConfig(target: SourceDirConfig, source: SourceDirConfig): void {
    for (const tool of Object.keys(source)) {
        if (!target[tool as keyof SourceDirConfig]) {
            (target as any)[tool] = {};
        }
        const toolConfig = (source as any)[tool];
        for (const subtype of Object.keys(toolConfig)) {
            (target as any)[tool][subtype] = toolConfig[subtype];
        }
    }
}
