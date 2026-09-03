import { apiRequest } from './api';
import type { DashboardWarehouse } from '../types/dashboard';

export const dashboardApi = {
  getWarehouse: (warehouseId?: number, slotIds?: number[]) => {
    const params = new URLSearchParams();
    if (warehouseId && warehouseId > 0) params.set('warehouseId', String(warehouseId));
    if (slotIds && slotIds.length > 0) params.set('slots', slotIds.join(','));
    const qs = params.toString();
    return apiRequest<DashboardWarehouse>(`/dashboard/warehouse${qs ? `?${qs}` : ''}`);
  }
};
