import type { Request, Response } from 'express';
import { getWarehouseDashboard } from '../repositories/dashboard.repository.js';

export async function warehouse(request: Request, response: Response) {
  const warehouseId = request.query.warehouseId ? Number(request.query.warehouseId) : undefined;
  const slotParam = request.query.slots ? String(request.query.slots) : undefined;
  const slotIds = slotParam ? slotParam.split(',').map(Number).filter(n => !isNaN(n) && n > 0) : undefined;
  response.json({
    success: true,
    message: 'Warehouse dashboard retrieved.',
    data: await getWarehouseDashboard(warehouseId, slotIds)
  });
}
