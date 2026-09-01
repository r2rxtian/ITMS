import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPool, sql } from '../config/database.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'System Administrator';
if (!email || !password || password.length < 12) throw new Error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters are required.');
const pool = await getPool();
const hash = await bcrypt.hash(password, 12);
await pool.request().input('email',sql.NVarChar(255),email).input('hash',sql.NVarChar(255),hash).input('name',sql.NVarChar(120),name).query(`
  DECLARE @roleId INT=(SELECT role_id FROM dbo.ims_roles WHERE role_name='ADMIN');
  IF @roleId IS NULL THROW 50001,'Run database initialization first.',1;
  IF EXISTS(SELECT 1 FROM dbo.ims_users WHERE email=@email) THROW 50002,'A user with that email already exists.',1;
  INSERT dbo.ims_users(role_id,email,password_hash,display_name) VALUES(@roleId,@email,@hash,@name);`);
console.log(`[database] administrator ${email} created`);
await pool.close();
