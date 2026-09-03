import { getPool, sql } from '../config/database.js';

export interface ObjectiveRecord {
  id: number;
  warehouseId: number;
  year: number;
  weekNumber: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  targetDate: string | null;
  createdBy: number;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FloorLogRecord {
  id: number;
  warehouseId: number;
  locationId: number | null;
  locationName: string | null;
  locationCode: string | null;
  logType: string;
  severity: string;
  content: string;
  loggedBy: number;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

export interface PlanSummary {
  totalObjectives: number;
  completedObjectives: number;
  inProgressObjectives: number;
  pendingObjectives: number;
  completionRate: number;
  totalFloorLogs: number;
  highPriorityCount: number;
  topPriorityTitle: string | null;
}

export async function listObjectives(warehouseId: number, year: number, weekNumber: number): Promise<ObjectiveRecord[]> {
  const pool = await getPool();
  const result = await pool.request()
    .input('warehouseId', sql.Int, warehouseId)
    .input('year', sql.Int, year)
    .input('weekNumber', sql.Int, weekNumber)
    .query(`
      SELECT 
        o.objective_id AS id,
        o.warehouse_id AS warehouseId,
        o.year,
        o.week_number AS weekNumber,
        o.title,
        o.description,
        o.category,
        o.priority,
        o.status,
        CONVERT(NVARCHAR(10), o.target_date, 120) AS targetDate,
        o.created_by AS createdBy,
        u.display_name AS creatorName,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt
      FROM dbo.ims_operational_objectives o
      INNER JOIN dbo.ims_users u ON o.created_by = u.user_id
      WHERE o.warehouse_id = @warehouseId AND o.year = @year AND o.week_number = @weekNumber
      ORDER BY 
        CASE o.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'NORMAL' THEN 3 
          ELSE 4 
        END,
        o.target_date ASC,
        o.objective_id ASC
    `);
  return result.recordset;
}

export async function createObjective(data: {
  warehouseId: number;
  year: number;
  weekNumber: number;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  targetDate?: string;
}, userId: number): Promise<ObjectiveRecord> {
  const pool = await getPool();
  const result = await pool.request()
    .input('warehouseId', sql.Int, data.warehouseId)
    .input('year', sql.Int, data.year)
    .input('weekNumber', sql.Int, data.weekNumber)
    .input('title', sql.NVarChar(200), data.title)
    .input('description', sql.NVarChar(1000), data.description || null)
    .input('category', sql.NVarChar(50), data.category || 'GENERAL')
    .input('priority', sql.NVarChar(20), data.priority || 'NORMAL')
    .input('targetDate', sql.Date, data.targetDate ? new Date(data.targetDate) : null)
    .input('userId', sql.Int, userId)
    .query(`
      INSERT INTO dbo.ims_operational_objectives
        (warehouse_id, year, week_number, title, description, category, priority, status, target_date, created_by)
      OUTPUT inserted.objective_id AS id
      VALUES
        (@warehouseId, @year, @weekNumber, @title, @description, @category, @priority, 'PENDING', @targetDate, @userId)
    `);
  const insertedId = result.recordset[0].id;
  const list = await listObjectives(data.warehouseId, data.year, data.weekNumber);
  return list.find(o => o.id === insertedId)!;
}

export async function updateObjective(id: number, data: {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  targetDate?: string;
}): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, id)
    .input('title', sql.NVarChar(200), data.title)
    .input('description', sql.NVarChar(1000), data.description || null)
    .input('category', sql.NVarChar(50), data.category)
    .input('priority', sql.NVarChar(20), data.priority)
    .input('status', sql.NVarChar(20), data.status)
    .input('targetDate', sql.Date, data.targetDate ? new Date(data.targetDate) : null)
    .query(`
      UPDATE dbo.ims_operational_objectives
      SET 
        title = COALESCE(@title, title),
        description = @description,
        category = COALESCE(@category, category),
        priority = COALESCE(@priority, priority),
        status = COALESCE(@status, status),
        target_date = @targetDate,
        updated_at = SYSUTCDATETIME()
      WHERE objective_id = @id
    `);
}

export async function updateObjectiveStatus(id: number, status: string): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, id)
    .input('status', sql.NVarChar(20), status)
    .query(`
      UPDATE dbo.ims_operational_objectives
      SET status = @status, updated_at = SYSUTCDATETIME()
      WHERE objective_id = @id
    `);
}

export async function deleteObjective(id: number): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, id)
    .query(`DELETE FROM dbo.ims_operational_objectives WHERE objective_id = @id`);
}

export async function listFloorLogs(warehouseId: number, limit = 50): Promise<FloorLogRecord[]> {
  const pool = await getPool();
  const result = await pool.request()
    .input('warehouseId', sql.Int, warehouseId)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT TOP (@limit)
        l.log_id AS id,
        l.warehouse_id AS warehouseId,
        l.location_id AS locationId,
        loc.location_name AS locationName,
        loc.location_code AS locationCode,
        l.log_type AS logType,
        l.severity,
        l.content,
        l.logged_by AS loggedBy,
        u.display_name AS authorName,
        r.role_name AS authorRole,
        l.created_at AS createdAt
      FROM dbo.ims_floor_logs l
      INNER JOIN dbo.ims_users u ON l.logged_by = u.user_id
      INNER JOIN dbo.ims_roles r ON u.role_id = r.role_id
      LEFT JOIN dbo.ims_warehouse_locations loc ON l.location_id = loc.location_id
      WHERE l.warehouse_id = @warehouseId
      ORDER BY l.created_at DESC, l.log_id DESC
    `);
  return result.recordset;
}

export async function createFloorLog(data: {
  warehouseId: number;
  locationId?: number;
  logType: string;
  severity?: string;
  content: string;
}, userId: number): Promise<FloorLogRecord> {
  const pool = await getPool();
  const result = await pool.request()
    .input('warehouseId', sql.Int, data.warehouseId)
    .input('locationId', sql.Int, data.locationId || null)
    .input('logType', sql.NVarChar(50), data.logType || 'HANDOVER')
    .input('severity', sql.NVarChar(20), data.severity || 'INFO')
    .input('content', sql.NVarChar(2000), data.content)
    .input('userId', sql.Int, userId)
    .query(`
      INSERT INTO dbo.ims_floor_logs
        (warehouse_id, location_id, log_type, severity, content, logged_by)
      OUTPUT inserted.log_id AS id
      VALUES
        (@warehouseId, @locationId, @logType, @severity, @content, @userId)
    `);
  const insertedId = result.recordset[0].id;
  const list = await listFloorLogs(data.warehouseId, 10);
  return list.find(l => l.id === insertedId)!;
}

export async function deleteFloorLog(id: number): Promise<void> {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, id)
    .query(`DELETE FROM dbo.ims_floor_logs WHERE log_id = @id`);
}

export async function getPlanSummary(warehouseId: number, year: number, weekNumber: number): Promise<PlanSummary> {
  const pool = await getPool();
  const objRes = await pool.request()
    .input('warehouseId', sql.Int, warehouseId)
    .input('year', sql.Int, year)
    .input('weekNumber', sql.Int, weekNumber)
    .query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN priority IN ('CRITICAL', 'HIGH') AND status <> 'COMPLETED' THEN 1 ELSE 0 END) AS highPriority
      FROM dbo.ims_operational_objectives
      WHERE warehouse_id = @warehouseId AND year = @year AND week_number = @weekNumber
    `);

  const topPriorityRes = await pool.request()
    .input('warehouseId', sql.Int, warehouseId)
    .input('year', sql.Int, year)
    .input('weekNumber', sql.Int, weekNumber)
    .query(`
      SELECT TOP 1 title
      FROM dbo.ims_operational_objectives
      WHERE warehouse_id = @warehouseId AND year = @year AND week_number = @weekNumber AND status <> 'COMPLETED'
      ORDER BY 
        CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
        target_date ASC
    `);

  const logRes = await pool.request()
    .input('warehouseId', sql.Int, warehouseId)
    .query(`
      SELECT COUNT(*) AS totalLogs
      FROM dbo.ims_floor_logs
      WHERE warehouse_id = @warehouseId
    `);

  const row = objRes.recordset[0];
  const total = Number(row.total || 0);
  const completed = Number(row.completed || 0);
  const inProgress = Number(row.inProgress || 0);
  const pending = Number(row.pending || 0);
  const highPriority = Number(row.highPriority || 0);
  const totalLogs = Number(logRes.recordset[0]?.totalLogs || 0);
  const topPriorityTitle = topPriorityRes.recordset[0]?.title || null;

  return {
    totalObjectives: total,
    completedObjectives: completed,
    inProgressObjectives: inProgress,
    pendingObjectives: pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalFloorLogs: totalLogs,
    highPriorityCount: highPriority,
    topPriorityTitle
  };
}
