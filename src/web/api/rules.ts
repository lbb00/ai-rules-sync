import { Hono } from 'hono';
import fs from 'fs-extra';
import path from 'path';
import { getCombinedProjectConfig, RuleEntry } from '../../project-config.js';
import { adapterRegistry } from '../../adapters/index.js';
import { getCurrentRepo } from '../../config.js';

export const rulesRouter = new Hono();

type LinkStatus = 'linked' | 'broken' | 'missing';

async function getLinkStatus(targetPath: string): Promise<LinkStatus> {
  try {
    await fs.lstat(targetPath);
    // lstat succeeded, it exists. Check if it's a valid symlink target.
    try {
      await fs.stat(targetPath);
      return 'linked';
    } catch {
      return 'broken';
    }
  } catch {
    return 'missing';
  }
}

rulesRouter.get('/', async (c) => {
  const projectPath = c.get('projectPath' as never) as string;
  const config = await getCombinedProjectConfig(projectPath);
  const adapters = adapterRegistry.all();
  const repo = await getCurrentRepo();
  const rules: Array<{
    tool: string;
    subtype: string;
    alias: string;
    sourceName: string;
    repoUrl: string;
    targetPath: string;
    sourceFilePath: string;
    status: LinkStatus;
  }> = [];

  for (const adapter of adapters) {
    const [topLevel, subLevel] = adapter.configPath;
    const entries: Record<string, RuleEntry> | undefined = (config as any)?.[topLevel]?.[subLevel];
    if (!entries) continue;

    for (const [alias, value] of Object.entries(entries)) {
      let repoUrl: string;
      let sourceName: string;
      if (typeof value === 'string') {
        repoUrl = value;
        sourceName = alias;
      } else {
        repoUrl = value.url;
        sourceName = value.rule || alias;
      }

      const targetDir = (typeof value === 'object' && value.targetDir) ? value.targetDir : adapter.targetDir;
      const targetPath = path.join(projectPath, targetDir, alias);
      const status = await getLinkStatus(targetPath);

      // Compute source file path in the configured repo
      let sourceFilePath = '';
      if (repo) {
        const resolvedSourceDir = (repo.sourceDir as any)?.[adapter.tool]?.[adapter.subtype] ?? adapter.defaultSourceDir;
        sourceFilePath = path.join(repo.path, resolvedSourceDir, sourceName);
      }

      rules.push({ tool: adapter.tool, subtype: adapter.subtype, alias, sourceName, repoUrl, targetPath, sourceFilePath, status });
    }
  }

  return c.json({ rules });
});

rulesRouter.get('/available', async (c) => {
  const repo = await getCurrentRepo();
  if (!repo) {
    return c.json({ error: 'No repository configured' }, 404);
  }

  const adapters = adapterRegistry.all();
  const available: Array<{ tool: string; subtype: string; name: string }> = [];

  for (const adapter of adapters) {
    const sourceDir = path.join(repo.path, adapter.defaultSourceDir);
    if (!await fs.pathExists(sourceDir)) continue;

    try {
      const entries = await fs.readdir(sourceDir);
      for (const entry of entries) {
        available.push({ tool: adapter.tool, subtype: adapter.subtype, name: entry });
      }
    } catch {
      // skip
    }
  }

  return c.json({ available, repoName: repo.name, repoUrl: repo.url });
});
