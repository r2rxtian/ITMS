import type { Transaction } from 'mssql';
import { getPool, sql } from '../config/database.js';

export interface AuditEntry { userId?: number; action: string; entityType: string; entityId?: string | number; description: string; ipAddress?: string }

export async function writeAudit(entry: AuditEntry, transaction?: Transaction): Promise<void> {
  const request = transaction ? transaction.request() : (await getPool()).request();
  await request
    .input('userId', sql.Int, entry.userId ?? null).input('action', sql.NVarChar(60), entry.action)
    .input('entityType', sql.NVarChar(60), entry.entityType).input('entityId', sql.NVarChar(80), entry.entityId?.toString() ?? null)
    .input('description', sql.NVarChar(1000), entry.description).input('ipAddress', sql.NVarChar(64), entry.ipAddress ?? null)
    .query(`INSERT dbo.ims_audit_logs(user_id,action,entity_type,entity_id,description,ip_address)
            VALUES(@userId,@action,@entityType,@entityId,@description,@ipAddress)`);
}
