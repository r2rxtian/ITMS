import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { connectToDatabase, getPool, sql } from '../config/database.js';
import { env } from '../config/env.js';

const scripts = ['database/schema/001_initial_schema.sql', 'database/seeds/001_reference_data.sql', 'database/seeds/002_development_users.sql'];
if (!/^[A-Za-z0-9 _-]+$/.test(env.DB_DATABASE)) throw new Error('DB_DATABASE contains unsupported characters.');
const master = await connectToDatabase('master');
const exists = (await master.request().input('database', sql.NVarChar(128), env.DB_DATABASE).query('SELECT DB_ID(@database) AS id')).recordset[0]?.id;
if (!exists) {
  await master.request().query(`CREATE DATABASE [${env.DB_DATABASE.replaceAll(']', ']]')}]`);
  console.log(`[database] created ${env.DB_DATABASE}`);
}
await master.close();
const pool = await getPool();
for (const file of scripts) {
  const absolute = resolve(process.cwd(), '..', file);
  const sql = await readFile(absolute, 'utf8');
  for (const batch of sql.split(/^\s*GO\s*$/gim).filter(Boolean)) await pool.request().batch(batch);
  console.log(`[database] applied ${file}`);
}
await pool.close();
