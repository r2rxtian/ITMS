import { getPool, sql } from '../config/database.js';

export async function listCategories(includeArchived = false) {
  const pool = await getPool();
  return (await pool.request().input('includeArchived', sql.Bit, includeArchived).query(`SELECT c.category_id AS id,c.category_name AS name,c.description,c.is_active AS isActive,c.created_at AS createdAt,c.updated_at AS updatedAt,COUNT(i.item_id) AS itemCount FROM dbo.ims_categories c LEFT JOIN dbo.ims_items i ON i.category_id=c.category_id AND i.status='ACTIVE' WHERE @includeArchived=1 OR c.is_active=1 GROUP BY c.category_id,c.category_name,c.description,c.is_active,c.created_at,c.updated_at ORDER BY c.category_name`)).recordset;
}
export async function createCategory(name: string, description: string | null) {
  const pool = await getPool();
  return (await pool.request().input('name',sql.NVarChar(100),name).input('description',sql.NVarChar(500),description).query(`INSERT dbo.ims_categories(category_name,description) OUTPUT inserted.category_id AS id,inserted.category_name AS name,inserted.description VALUES(@name,@description)`)).recordset[0];
}
export async function updateCategory(id: number, input: { name?: string; description?: string | null }) {
  const pool = await getPool();
  return (await pool.request().input('id',sql.Int,id).input('name',sql.NVarChar(100),input.name ?? null).input('description',sql.NVarChar(500),input.description ?? null).input('hasDescription',sql.Bit,Object.hasOwn(input,'description')).query(`UPDATE dbo.ims_categories SET category_name=COALESCE(@name,category_name),description=CASE WHEN @hasDescription=1 THEN @description ELSE description END,updated_at=SYSUTCDATETIME() OUTPUT inserted.category_id AS id,inserted.category_name AS name,inserted.description WHERE category_id=@id AND is_active=1`)).recordset[0];
}
export async function archiveCategory(id: number) { const pool=await getPool(); return (await pool.request().input('id',sql.Int,id).query(`UPDATE dbo.ims_categories SET is_active=0,updated_at=SYSUTCDATETIME() OUTPUT inserted.category_id AS id WHERE category_id=@id AND is_active=1`)).recordset[0]; }
