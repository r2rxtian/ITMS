import { getPool, sql } from '../config/database.js';

export async function listLocations() {
  const pool = await getPool();
  return (await pool.request().query(`
    SELECT l.location_id AS id,l.location_code AS code,l.location_name AS name,
      l.parent_location_id AS parentLocationId,p.location_name AS parentName,
      l.location_type AS locationType,l.maximum_capacity AS maximumCapacity,l.description,
      COALESCE(SUM(CASE WHEN i.status='ACTIVE' THEN i.quantity ELSE 0 END),0) AS currentUsage,
      COUNT(DISTINCT CASE WHEN i.status='ACTIVE' THEN i.item_id END) AS skuCount,l.status
    FROM dbo.ims_warehouse_locations l
    LEFT JOIN dbo.ims_warehouse_locations p ON p.location_id=l.parent_location_id
    LEFT JOIN dbo.ims_items i ON i.location_id=l.location_id
    WHERE l.status='ACTIVE'
    GROUP BY l.location_id,l.location_code,l.location_name,l.parent_location_id,
      p.location_name,l.location_type,l.maximum_capacity,l.description,l.status
    ORDER BY l.location_code
  `)).recordset;
}

export async function createLocation(input: any) {
  const pool = await getPool();
  return (await pool.request()
    .input('code',sql.NVarChar(40),input.code.toUpperCase())
    .input('name',sql.NVarChar(120),input.name)
    .input('parentId',sql.Int,input.parentLocationId??null)
    .input('capacity',sql.Decimal(18,2),input.maximumCapacity)
    .input('type',sql.NVarChar(30),input.locationType)
    .input('description',sql.NVarChar(500),input.description??null)
    .query(`INSERT dbo.ims_warehouse_locations(parent_location_id,location_code,location_name,location_type,maximum_capacity,description)
      OUTPUT inserted.location_id AS id,inserted.location_code AS code,inserted.location_name AS name
      VALUES(@parentId,@code,@name,@type,@capacity,@description)`)).recordset[0];
}

export async function updateLocation(id: number, input: any) {
  const pool = await getPool();
  return (await pool.request().input('id',sql.Int,id)
    .input('name',sql.NVarChar(120),input.name??null)
    .input('capacity',sql.Decimal(18,2),input.maximumCapacity??null)
    .input('description',sql.NVarChar(500),input.description??null)
    .query(`DECLARE @currentUsage DECIMAL(18,2)=(
        SELECT COALESCE(SUM(item.quantity),0) FROM dbo.ims_items item
        JOIN dbo.ims_warehouse_locations itemLocation ON itemLocation.location_id=item.location_id
        LEFT JOIN dbo.ims_warehouse_locations itemParent ON itemParent.location_id=itemLocation.parent_location_id
        WHERE item.status='ACTIVE' AND (itemLocation.location_id=@id OR itemLocation.parent_location_id=@id OR itemParent.parent_location_id=@id)
      );
      IF @capacity IS NOT NULL AND @capacity<@currentUsage
        SELECT CAST(1 AS BIT) AS blocked,@currentUsage AS currentUsage;
      ELSE UPDATE dbo.ims_warehouse_locations
        SET location_name=COALESCE(@name,location_name),maximum_capacity=COALESCE(@capacity,maximum_capacity),
          description=COALESCE(@description,description),updated_at=SYSUTCDATETIME()
        OUTPUT inserted.location_id AS id,inserted.location_code AS code,inserted.location_name AS name,CAST(0 AS BIT) AS blocked
        WHERE location_id=@id`)).recordset[0];
}

export async function archiveLocation(id: number) {
  const pool = await getPool();
  return (await pool.request().input('id',sql.Int,id).query(`
    DECLARE @locations TABLE(id INT PRIMARY KEY);
    WITH descendants AS (
      SELECT location_id FROM dbo.ims_warehouse_locations WHERE location_id=@id
      UNION ALL
      SELECT child.location_id FROM dbo.ims_warehouse_locations child
      JOIN descendants parent ON child.parent_location_id=parent.location_id
    ) INSERT @locations SELECT location_id FROM descendants;
    IF NOT EXISTS(SELECT 1 FROM @locations)
      SELECT CAST(0 AS BIT) AS archived, CAST(0 AS BIT) AS blocked;
    ELSE IF EXISTS(SELECT 1 FROM dbo.ims_items item JOIN @locations location ON location.id=item.location_id WHERE item.status='ACTIVE')
      SELECT CAST(0 AS BIT) AS archived, CAST(1 AS BIT) AS blocked;
    ELSE BEGIN
      UPDATE dbo.ims_warehouse_locations SET status='INACTIVE',updated_at=SYSUTCDATETIME()
      WHERE location_id IN(SELECT id FROM @locations);
      SELECT CAST(1 AS BIT) AS archived, CAST(0 AS BIT) AS blocked;
    END
  `)).recordset[0];
}

export async function getLocationDetails(id: number) {
  const pool = await getPool();
  const location = (await pool.request().input('id',sql.Int,id).query(`
    SELECT l.location_id AS id,l.location_code AS code,l.location_name AS name,
      l.maximum_capacity AS maximumCapacity,l.status,
      COALESCE(usage.currentUsage,0) AS currentUsage,
      COALESCE(usage.skuCount,0) AS skuCount,
      COALESCE(usage.lowStockCount,0) AS lowStockCount,
      COALESCE(usage.outOfStockCount,0) AS outOfStockCount
    FROM dbo.ims_warehouse_locations l
    OUTER APPLY (
      SELECT SUM(i.quantity) AS currentUsage,COUNT(DISTINCT i.item_id) AS skuCount,
        SUM(CASE WHEN i.quantity>0 AND i.quantity<=i.reorder_level THEN 1 ELSE 0 END) AS lowStockCount,
        SUM(CASE WHEN i.quantity=0 THEN 1 ELSE 0 END) AS outOfStockCount
      FROM dbo.ims_items i
      JOIN dbo.ims_warehouse_locations itemLocation ON itemLocation.location_id=i.location_id
      WHERE i.status='ACTIVE'
        AND (itemLocation.location_id=l.location_id OR itemLocation.parent_location_id=l.location_id)
    ) usage
    WHERE l.location_id=@id
  `)).recordset[0];
  if (!location) return undefined;

  const sublocations = (await pool.request().input('id',sql.Int,id).query(`
    SELECT child.location_id AS id,child.location_code AS code,child.location_name AS name,
      child.maximum_capacity AS maximumCapacity,COALESCE(SUM(i.quantity),0) AS currentUsage
    FROM dbo.ims_warehouse_locations child
    LEFT JOIN dbo.ims_items i ON i.location_id=child.location_id AND i.status='ACTIVE'
    WHERE child.parent_location_id=@id
    GROUP BY child.location_id,child.location_code,child.location_name,child.maximum_capacity
    ORDER BY child.location_code
  `)).recordset;
  const items = (await pool.request().input('id',sql.Int,id).query(`
    SELECT TOP 5 i.item_id AS id,i.item_name AS name,l.location_code AS code,i.quantity AS units,
      CASE WHEN i.quantity=0 THEN 'Out of Stock' WHEN i.quantity<=i.reorder_level THEN 'Low Stock' ELSE 'In Stock' END AS status
    FROM dbo.ims_items i
    JOIN dbo.ims_warehouse_locations l ON l.location_id=i.location_id
    WHERE i.status='ACTIVE' AND (i.location_id=@id OR l.parent_location_id=@id)
    ORDER BY i.item_name
  `)).recordset;
  return {
    ...location,
    currentUsage:Number(location.currentUsage),maximumCapacity:Number(location.maximumCapacity),
    sublocations:sublocations.map((entry:any)=>({...entry,currentUsage:Number(entry.currentUsage),maximumCapacity:Number(entry.maximumCapacity)})),
    items
  };
}
