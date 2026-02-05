import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

export interface VersionInfo {
  projectVersion: string;
  linkanyVersion: string;
}

/**
 * Get the current module directory (ESM compatible)
 */
function getCurrentModuleDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

/**
 * Read version information from package.json files
 * @returns Promise containing project and linkany versions
 */
export async function getVersionInfo(): Promise<VersionInfo> {
  const currentDir = getCurrentModuleDir();
  // From commands/ directory, go up two levels to reach project root
  const projectPkgPath = path.join(currentDir, '..', '..', 'package.json');
  const linkanyPkgPath = path.join(currentDir, '..', '..', 'node_modules', 'linkany', 'package.json');

  try {
    const projectPkg = await fs.readJson(projectPkgPath);
    const projectVersion = projectPkg.version || 'unknown';

    let linkanyVersion = 'unknown';
    if (await fs.pathExists(linkanyPkgPath)) {
      const linkanyPkg = await fs.readJson(linkanyPkgPath);
      linkanyVersion = linkanyPkg.version || 'unknown';
    }

    return { projectVersion, linkanyVersion };
  } catch (error) {
    return { projectVersion: 'unknown', linkanyVersion: 'unknown' };
  }
}

/**
 * Format version output with powered by message
 * @param versionInfo - Version information object
 * @returns Formatted version string
 */
export function formatVersionOutput(versionInfo: VersionInfo): string {
  return `ai-rules-sync ${versionInfo.projectVersion} (powered by linkany ${versionInfo.linkanyVersion})`;
}

/**
 * Get formatted version string (convenience function)
 * @returns Promise containing formatted version string
 */
export async function getFormattedVersion(): Promise<string> {
  const versionInfo = await getVersionInfo();
  return formatVersionOutput(versionInfo);
}
