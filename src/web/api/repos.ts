import { Hono } from 'hono';
import fs from 'fs-extra';
import path from 'path';
import { getConfig, setConfig } from '../../config.js';
import { adapterRegistry } from '../../adapters/index.js';
import { getRepoSourceConfig, getSourceDir } from '../../project-config.js';

export const reposRouter = new Hono();

reposRouter.get('/', async (c) => {
  const config = await getConfig();
  const repos = Object.values(config.repos || {}).map((repo) => ({
    name: repo.name,
    url: repo.url,
    path: repo.path,
    current: repo.name === config.currentRepo,
  }));
  return c.json({ repos, currentRepo: config.currentRepo });
});

reposRouter.get('/rules', async (c) => {
  const config = await getConfig();
  const adapters = adapterRegistry.all();
  const result = await Promise.all(
    Object.values(config.repos || {}).map(async (repo) => {
      const repoSourceConfig = await getRepoSourceConfig(repo.path);
      const adapterCounts: Array<{ tool: string; subtype: string; count: number; sourceDir: string }> = [];
      for (const adapter of adapters) {
        const resolvedDir = getSourceDir(repoSourceConfig, adapter.tool, adapter.subtype, adapter.defaultSourceDir);
        const sourceDir = path.join(repo.path, resolvedDir);
        if (!await fs.pathExists(sourceDir)) continue;
        try {
          const entries = await fs.readdir(sourceDir);
          const count = entries.length;
          if (count > 0) {
            adapterCounts.push({ tool: adapter.tool, subtype: adapter.subtype, count, sourceDir: resolvedDir });
          }
        } catch {
          // skip unreadable dirs
        }
      }
      return {
        name: repo.name,
        url: repo.url,
        path: repo.path,
        current: repo.name === config.currentRepo,
        adapters: adapterCounts,
      };
    })
  );
  return c.json({ repos: result });
});

reposRouter.post('/use', async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  const config = await getConfig();
  if (!config.repos[name]) {
    return c.json({ error: `Repository "${name}" not found` }, 404);
  }
  await setConfig({ currentRepo: name });
  return c.json({ ok: true, currentRepo: name });
});
