import sql from 'mssql/msnodesqlv8.js';
import { env } from './env.js';

const server = `${env.DB_SERVER}\\${env.DB_INSTANCE}`;
function connectionConfig(database: string): sql.config { return {
  connectionString: `Driver={${env.DB_DRIVER}};Server=${server};Database=${database};Trusted_Connection=yes;Encrypt=${env.DB_ENCRYPT ? 'yes' : 'no'};TrustServerCertificate=${env.DB_TRUST_CERTIFICATE ? 'yes' : 'no'};`,
  pool: { min: 0, max: 10, idleTimeoutMillis: 30_000 },
  options: { useUTC: true },
  connectionTimeout: 15_000,
  requestTimeout: 30_000
} as unknown as sql.config; }

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(connectionConfig(env.DB_DATABASE));
    pool.on('error', error => console.error('[database] connection pool error', error));
    poolPromise = pool.connect().catch(error => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

export async function testDatabaseConnection(): Promise<void> {
  const pool = await getPool();
  await pool.request().query('SELECT 1 AS connected');
}

export async function connectToDatabase(database: string): Promise<sql.ConnectionPool> {
  return new sql.ConnectionPool(connectionConfig(database)).connect();
}

export { sql };
