import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPool, sql } from '../config/database.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) throw new Error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters are required.');
const pool = await getPool();
const hash = await bcrypt.hash(password, 12);
const result = await pool.request().input('email',sql.NVarChar(255),email).input('hash',sql.NVarChar(255),hash).query(`UPDATE dbo.ims_users SET password_hash=@hash,is_active=1,updated_at=SYSUTCDATETIME() OUTPUT inserted.email WHERE email=@email;`);
if (!result.recordset[0]) throw new Error(`Administrator ${email} does not exist. Run user:create-admin first.`);
console.log(`[database] administrator password reset for ${email}`);
await pool.close();
