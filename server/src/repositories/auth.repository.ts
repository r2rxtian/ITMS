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
