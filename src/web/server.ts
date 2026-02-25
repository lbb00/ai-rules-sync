import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'url';
import path from 'path';
import { reposRouter } from './api/repos.js';
import { rulesRouter } from './api/rules.js';
import { operationsRouter } from './api/operations.js';

// Resolve static file directory relative to this compiled file (dist/web/server.js)
// Static assets are in the same directory: dist/web/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(projectPath: string): Hono {
  const app = new Hono();

  // Inject projectPath into context for all API routes
  app.use('/api/*', async (c, next) => {
    (c as any).set('projectPath', projectPath);
    await next();
  });

  app.route('/api/repos', reposRouter);
  app.route('/api/rules', rulesRouter);
  app.route('/api/operations', operationsRouter);

  // Serve static files from the same directory as this file (dist/web/)
  // Use absolute path so it works regardless of cwd
  const staticRoot = __dirname;

  app.use('/assets/*', serveStatic({ root: staticRoot }));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', async (c) => {
    const { createReadStream } = await import('fs');
    const { stat } = await import('fs/promises');
    const indexPath = path.join(staticRoot, 'index.html');
    try {
      await stat(indexPath);
      const stream = createReadStream(indexPath);
      return new Response(stream as any, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch {
      return c.text('Dashboard not found. Run pnpm build first.', 404);
    }
  });

  return app;
}

export async function startServer(projectPath: string, port: number): Promise<void> {
  const app = createApp(projectPath);

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`\nAI Rules Sync Dashboard running at http://localhost:${info.port}`);
    console.log(`Project: ${projectPath}`);
    console.log('Press Ctrl+C to stop.\n');
  });

  // Keep process alive
  await new Promise<void>(() => {});
}
