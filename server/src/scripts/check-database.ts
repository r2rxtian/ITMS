import { connectToDatabase } from '../config/database.js';
import { env } from '../config/env.js';

try {
  const pool = await connectToDatabase(env.DB_DATABASE);
  const result = await pool.request().query(`SELECT DB_NAME() AS databaseName,SUSER_SNAME() AS loginName,IS_SRVROLEMEMBER('sysadmin') AS isSysadmin,
    (SELECT COUNT(*) FROM dbo.ims_roles) AS roleCount,
    (SELECT COUNT(*) FROM dbo.ims_categories) AS categoryCount,
    (SELECT COUNT(*) FROM dbo.ims_warehouse_locations) AS locationCount`);
  console.log(result.recordset[0]);
  await pool.close();
} catch (error) {
  console.dir(error, { depth: 8 });
  process.exitCode = 1;
}
