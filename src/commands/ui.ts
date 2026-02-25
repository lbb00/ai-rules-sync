import { startServer } from '../web/server.js';

export async function handleUi(options: { port: number }): Promise<void> {
  const projectPath = process.cwd();
  await startServer(projectPath, options.port);
}
