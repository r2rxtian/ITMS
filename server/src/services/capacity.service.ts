import type { Transaction } from 'mssql';
import { sql } from '../config/database.js';
import { ApiError } from '../utils/api-error.js';

export async function assertLocationCapacity(transaction: Transaction, locationId: number, incomingQuantity: number, warehouseId?: number): Promise<void> {
  const result = await transaction.request().input('locationId',sql.Int,locationId).query(`
    WITH ancestors AS (
      SELECT location_id,parent_location_id,location_code,location_name,maximum_capacity,status,location_type
      FROM dbo.ims_warehouse_locations WITH(UPDLOCK,HOLDLOCK) WHERE location_id=@locationId
      UNION ALL
      SELECT parent.location_id,parent.parent_location_id,parent.location_code,parent.location_name,parent.maximum_capacity,parent.status,parent.location_type
      FROM dbo.ims_warehouse_locations parent WITH(UPDLOCK,HOLDLOCK)
      JOIN ancestors child ON child.parent_location_id=parent.location_id
    )
    SELECT ancestor.location_id AS id,ancestor.location_code AS code,ancestor.location_name AS name,
      ancestor.location_type AS locationType,ancestor.parent_location_id AS parentLocationId,
      ancestor.maximum_capacity AS maximumCapacity,ancestor.status,
      COALESCE(SUM(CASE WHEN item.status='ACTIVE' THEN item.quantity ELSE 0 END),0) AS currentUsage
    FROM ancestors ancestor
    LEFT JOIN dbo.ims_warehouse_locations itemLocation ON
      itemLocation.location_id=ancestor.location_id OR itemLocation.parent_location_id=ancestor.location_id OR
      itemLocation.parent_location_id IN(SELECT location_id FROM dbo.ims_warehouse_locations WHERE parent_location_id=ancestor.location_id)
    LEFT JOIN dbo.ims_items item WITH(UPDLOCK,HOLDLOCK) ON item.location_id=itemLocation.location_id
    GROUP BY ancestor.location_id,ancestor.location_code,ancestor.location_name,ancestor.location_type,ancestor.parent_location_id,ancestor.maximum_capacity,ancestor.status
    OPTION (MAXRECURSION 20)
  `);
  if (!result.recordset.length) throw new ApiError(409,'Selected warehouse location is invalid or inactive.');
  const target = result.recordset.find((r: any) => r.id === locationId);
  if (!target || target.status !== 'ACTIVE') throw new ApiError(409,'Selected warehouse location is invalid or inactive.');
  if (target.locationType === 'WAREHOUSE') {
    throw new ApiError(400,'Items cannot be placed directly at facility root. Please select a specific shelf, slot, or zone.');
  }
  if (warehouseId !== undefined && warehouseId !== null) {
    const matchesWarehouse = result.recordset.some((r: any) => r.id === warehouseId);
    if (!matchesWarehouse) {
      const rootWarehouse = result.recordset.find((r: any) => r.locationType === 'WAREHOUSE' || r.parentLocationId === null);
      throw new ApiError(400,`Location "${target.name}" (${target.code}) does not belong to the selected warehouse${rootWarehouse ? ` (belongs to ${rootWarehouse.name})` : ''}.`);
    }
  }
  for (const location of result.recordset) {
    if (location.status!=='ACTIVE') throw new ApiError(409,`${location.name} is not active.`);
    const available=Number(location.maximumCapacity)-Number(location.currentUsage);
    if (incomingQuantity>available) throw new ApiError(409,`${location.code} only has ${Math.max(0,available)} units of capacity remaining.`);
  }
}
