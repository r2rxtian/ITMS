import { getPool } from '../config/database.js';

export async function getWarehouseDashboard() {
  const pool = await getPool();
  const main = (await pool.request().query(`
    SELECT TOP 1 location_id AS id, location_name AS name, maximum_capacity AS maximumCapacity
    FROM dbo.ims_warehouse_locations
    WHERE location_type = 'WAREHOUSE' AND status = 'ACTIVE'
    ORDER BY location_id
  `)).recordset[0];

  if (!main) return {
    name: 'Main Warehouse', currentUsage: 0, maximumCapacity: 0,
    utilizationPercentage: 0, locationCount: 0, locations: []
  };

  const locations = (await pool.request().input('mainId', main.id).query(`
    SELECT
      section.location_id AS id,
      section.location_code AS code,
      section.location_name AS name,
      section.maximum_capacity AS maximumCapacity,
      COALESCE(usage.currentUsage, 0) AS currentUsage,
      COALESCE(usage.skuCount, 0) AS skuCount,
      COALESCE(usage.currentUsage, 0) AS unitCount,
      COALESCE(usage.lowStockCount, 0) AS lowStockCount,
      COALESCE(usage.outOfStockCount, 0) AS outOfStockCount
    FROM dbo.ims_warehouse_locations section
    OUTER APPLY (
      SELECT
        SUM(i.quantity) AS currentUsage,
        COUNT(DISTINCT i.item_id) AS skuCount,
        SUM(CASE WHEN i.quantity > 0 AND i.quantity <= i.reorder_level THEN 1 ELSE 0 END) AS lowStockCount,
        SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) AS outOfStockCount
      FROM dbo.ims_items i
      JOIN dbo.ims_warehouse_locations itemLocation ON itemLocation.location_id = i.location_id
      WHERE i.status = 'ACTIVE'
        AND (itemLocation.location_id = section.location_id OR itemLocation.parent_location_id = section.location_id)
    ) usage
    WHERE section.parent_location_id = @mainId
      AND section.location_type = 'SECTION'
      AND section.status = 'ACTIVE'
    ORDER BY section.location_code
  `)).recordset.map((location: any) => ({
    ...location,
    currentUsage: Number(location.currentUsage),
    maximumCapacity: Number(location.maximumCapacity),
    unitCount: Number(location.unitCount),
    utilizationPercentage: Number(location.maximumCapacity) > 0
      ? Math.round(Number(location.currentUsage) / Number(location.maximumCapacity) * 1000) / 10
      : 0
  }));

  const currentUsage = locations.reduce((sum: number, location: any) => sum + location.currentUsage, 0);
  const maximumCapacity = locations.reduce((sum: number, location: any) => sum + location.maximumCapacity, 0);
  return {
    name: main.name,
    currentUsage,
    maximumCapacity,
    utilizationPercentage: maximumCapacity ? Math.round(currentUsage / maximumCapacity * 1000) / 10 : 0,
    locationCount: locations.length,
    locations
  };
}
