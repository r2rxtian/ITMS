export interface DashboardLocation {
  id: number;
  code: string;
  name: string;
  currentUsage: number;
  maximumCapacity: number;
  utilizationPercentage: number;
  skuCount: number;
  unitCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface DashboardWarehouse {
  id?: number;
  code?: string;
  name: string;
  currentUsage: number;
  maximumCapacity: number;
  utilizationPercentage: number;
  locationCount: number;
  locations: DashboardLocation[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
