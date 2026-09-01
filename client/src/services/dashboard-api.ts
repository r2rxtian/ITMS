import { apiRequest } from './api';
import type { DashboardWarehouse } from '../types/dashboard';

export const dashboardApi = {
  getWarehouse: () => apiRequest<DashboardWarehouse>('/dashboard/warehouse')
};
