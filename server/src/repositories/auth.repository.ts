import { getPool, sql } from '../config/database.js';

export interface UserRecord { user_id: number; email: string; password_hash: string; display_name: string; role_name: 'ADMIN' | 'STAFF' | 'VIEWER' }

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const pool = await getPool();
  const result = await pool.request().input('email', sql.NVarChar(255), email).query<UserRecord>(`
    SELECT u.user_id,u.email,u.password_hash,u.display_name,r.role_name
    FROM dbo.ims_users u JOIN dbo.ims_roles r ON r.role_id=u.role_id
    WHERE u.email=@email AND u.is_active=1`);
  return result.recordset[0];
}

export async function findUserById(userId: number): Promise<UserRecord | undefined> {
  const pool = await getPool();
  const result = await pool.request().input('userId', sql.Int, userId).query<UserRecord>(`
    SELECT u.user_id,u.email,u.password_hash,u.display_name,r.role_name
    FROM dbo.ims_users u JOIN dbo.ims_roles r ON r.role_id=u.role_id
    WHERE u.user_id=@userId AND u.is_active=1`);
  return result.recordset[0];
}

export async function updateUserPassword(userId: number, passwordHash: string): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('userId', sql.Int, userId)
    .input('passwordHash', sql.NVarChar(255), passwordHash)
    .query(`UPDATE dbo.ims_users SET password_hash=@passwordHash, updated_at=SYSUTCDATETIME() WHERE user_id=@userId;`);
}
