import { app } from './app.js';
import { env } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';

async function start(): Promise<void> {
  try {
    await testDatabaseConnection();
    console.log('[database] Microsoft SQL Server connection established');
  } catch (error) {
    console.error('[database] startup connection failed; API will return safe errors until configuration is corrected', error);
  }
  app.listen(env.PORT, () => console.log(`[server] listening on http://localhost:${env.PORT}`));
}

void start();
