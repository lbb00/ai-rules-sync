import { Hono } from 'hono';
import { getAdapter, getToolAdapters } from '../../adapters/index.js';
import { handleAdd, handleRemove } from '../../commands/handlers.js';
import { installEntriesForTool } from '../../commands/install.js';
import { getCurrentRepo } from '../../config.js';

export const operationsRouter = new Hono();

operationsRouter.post('/add', async (c) => {
  const projectPath = c.get('projectPath' as never) as string;
  const { tool, subtype, name, alias } = await c.req.json<{
    tool: string;
    subtype: string;
    name: string;
    alias?: string;
  }>();

  const repo = await getCurrentRepo();
  if (!repo) {
    return c.json({ error: 'No repository configured' }, 400);
  }

  const adapter = getAdapter(tool, subtype);
  const ctx = { projectPath, repo, isLocal: false };

  try {
    const result = await handleAdd(adapter, ctx, name, alias);
    return c.json({ ok: true, result });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

operationsRouter.post('/remove', async (c) => {
  const projectPath = c.get('projectPath' as never) as string;
  const { tool, subtype, alias } = await c.req.json<{
    tool: string;
    subtype: string;
    alias: string;
  }>();

  const adapter = getAdapter(tool, subtype);

  try {
    const result = await handleRemove(adapter, projectPath, alias);
    return c.json({ ok: true, result });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

operationsRouter.post('/install', async (c) => {
  const projectPath = c.get('projectPath' as never) as string;
  const { tool } = await c.req.json<{ tool?: string }>();

  try {
    if (tool) {
      const adapters = getToolAdapters(tool);
      await installEntriesForTool(adapters, projectPath);
    } else {
      // Install all tools
      const { adapterRegistry } = await import('../../adapters/index.js');
      const adapters = adapterRegistry.all();
      await installEntriesForTool(adapters, projectPath);
    }
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});
