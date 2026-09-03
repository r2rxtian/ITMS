import { getPool } from '../config/database.js';

export async function getWarehouseDashboard(warehouseId?: number, slotIds?: number[]) {
  const pool = await getPool();
  const req = pool.request();
  let mainQuery = `
    SELECT TOP 1 location_id AS id, location_code AS code, location_name AS name, maximum_capacity AS maximumCapacity
    FROM dbo.ims_warehouse_locations
    WHERE location_type = 'WAREHOUSE' AND status = 'ACTIVE'
  `;
  if (warehouseId && Number.isInteger(warehouseId) && warehouseId > 0) {
    req.input('targetWarehouseId', warehouseId);
    mainQuery += ` AND location_id = @targetWarehouseId`;
  }
  mainQuery += ` ORDER BY location_id`;

  const main = (await req.query(mainQuery)).recordset[0];

  if (!main) return {
    id: 0, code: 'MAIN', name: 'Main Warehouse', currentUsage: 0, maximumCapacity: 0,
    utilizationPercentage: 0, locationCount: 0, locations: []
  };

  const locReq = pool.request().input('mainId', main.id);
  let whereClause = `WHERE section.status = 'ACTIVE'`;

  if (slotIds && slotIds.length > 0) {
    const validIds = slotIds.filter(n => Number.isInteger(n) && n > 0);
    if (validIds.length > 0) {
      whereClause += ` AND section.location_id IN (${validIds.join(',')})`;
    } else {
      whereClause += ` AND section.parent_location_id = @mainId AND section.location_type = 'SECTION'`;
    }
  } else {
    whereClause += ` AND section.parent_location_id = @mainId AND section.location_type = 'SECTION'`;
  }

  const locations = (await locReq.query(`
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
    ${whereClause}
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
    id: main.id,
    code: main.code,
    name: main.name,
    currentUsage,
    maximumCapacity,
    utilizationPercentage: maximumCapacity ? Math.round(currentUsage / maximumCapacity * 1000) / 10 : 0,
    locationCount: locations.length,
    locations
  };
}
