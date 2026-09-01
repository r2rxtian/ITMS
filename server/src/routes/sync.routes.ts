import { Router } from 'express';
import { getPool } from '../config/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

export const syncRouter = Router();
syncRouter.use(requireAuth);
syncRouter.get('/version', asyncHandler(async (_request, response) => {
  const pool = await getPool();
  const row = (await pool.request().query(`
    SELECT CONCAT(
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(updated_at),126) FROM dbo.ims_items),''),'|',
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(updated_at),126) FROM dbo.ims_categories),''),'|',
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(updated_at),126) FROM dbo.ims_warehouse_locations),''),'|',
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(created_at),126) FROM dbo.ims_stock_transactions),''),'|',
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(created_at),126) FROM dbo.ims_item_movements),''),'|',
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(created_at),126) FROM dbo.ims_alerts),''),'|',
      COALESCE((SELECT CONVERT(NVARCHAR(30),MAX(resolved_at),126) FROM dbo.ims_alerts),'')
    ) AS version
  `)).recordset[0];
  response.json({ success: true, message: 'Data version retrieved.', data: { version: row.version } });
}));
