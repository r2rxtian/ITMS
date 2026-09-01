import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

dotenv.config({ path: resolve(process.cwd(), '..', '.env') });
dotenv.config();

const booleanString = z.enum(['true', 'false']).transform(value => value === 'true');
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(24),
  DB_SERVER: z.string().min(1),
  DB_INSTANCE: z.string().min(1).default('SQLEXPRESS'),
  DB_DATABASE: z.string().min(1),
  DB_DRIVER: z.string().min(1).default('ODBC Driver 17 for SQL Server'),
  DB_ENCRYPT: booleanString.default('false'),
  DB_TRUST_CERTIFICATE: booleanString.default('true')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
  throw new Error(`Invalid server environment configuration: ${missing}. Copy .env.example to .env and provide real values.`);
}

export const env = parsed.data;
