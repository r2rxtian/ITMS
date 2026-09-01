IF DB_ID(N'StockHubIMS') IS NULL THROW 50000, 'Database [StockHubIMS] does not exist. Run the schema first.', 1;
GO
USE StockHubIMS;
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM dbo.ims_roles WHERE role_name = 'ADMIN') INSERT dbo.ims_roles(role_name) VALUES ('ADMIN');
IF NOT EXISTS (SELECT 1 FROM dbo.ims_roles WHERE role_name = 'STAFF') INSERT dbo.ims_roles(role_name) VALUES ('STAFF');
IF NOT EXISTS (SELECT 1 FROM dbo.ims_roles WHERE role_name = 'VIEWER') INSERT dbo.ims_roles(role_name) VALUES ('VIEWER');

DECLARE @categories TABLE(name NVARCHAR(100));
INSERT @categories VALUES ('Electronics'),('Tools'),('Office Supplies'),('Safety Equipment'),('Electrical'),('Furniture'),('Cleaning'),('Packaging'),('Consumables'),('Other');
INSERT dbo.ims_categories(category_name)
SELECT source.name FROM @categories source WHERE NOT EXISTS (SELECT 1 FROM dbo.ims_categories target WHERE target.category_name = source.name);

IF NOT EXISTS (SELECT 1 FROM dbo.ims_warehouse_locations WHERE location_code = 'MAIN')
  INSERT dbo.ims_warehouse_locations(location_code, location_name, location_type, maximum_capacity) VALUES ('MAIN','Main Warehouse','WAREHOUSE',2000);
DECLARE @main INT = (SELECT location_id FROM dbo.ims_warehouse_locations WHERE location_code = 'MAIN');

IF NOT EXISTS (SELECT 1 FROM dbo.ims_warehouse_locations WHERE location_code = 'A') INSERT dbo.ims_warehouse_locations(parent_location_id,location_code,location_name,location_type,maximum_capacity) VALUES (@main,'A','Shelf A','SECTION',500);
IF NOT EXISTS (SELECT 1 FROM dbo.ims_warehouse_locations WHERE location_code = 'B') INSERT dbo.ims_warehouse_locations(parent_location_id,location_code,location_name,location_type,maximum_capacity) VALUES (@main,'B','Shelf B','SECTION',500);
IF NOT EXISTS (SELECT 1 FROM dbo.ims_warehouse_locations WHERE location_code = 'C') INSERT dbo.ims_warehouse_locations(parent_location_id,location_code,location_name,location_type,maximum_capacity) VALUES (@main,'C','Shelf C','SECTION',500);
IF NOT EXISTS (SELECT 1 FROM dbo.ims_warehouse_locations WHERE location_code = 'ST') INSERT dbo.ims_warehouse_locations(parent_location_id,location_code,location_name,location_type,maximum_capacity) VALUES (@main,'ST','Storage Area','SECTION',500);

DECLARE @sectionCode NVARCHAR(10), @sectionId INT, @slot INT;
DECLARE section_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT location_code, location_id FROM dbo.ims_warehouse_locations WHERE location_code IN ('A','B','C','ST');
OPEN section_cursor; FETCH NEXT FROM section_cursor INTO @sectionCode,@sectionId;
WHILE @@FETCH_STATUS = 0 BEGIN
  SET @slot = 1;
  WHILE @slot <= 3 BEGIN
    DECLARE @slotCode NVARCHAR(40) = CONCAT(@sectionCode, @slot);
    IF NOT EXISTS (SELECT 1 FROM dbo.ims_warehouse_locations WHERE location_code = @slotCode)
      INSERT dbo.ims_warehouse_locations(parent_location_id,location_code,location_name,location_type,maximum_capacity) VALUES (@sectionId,@slotCode,CONCAT(@sectionCode,' Sub-location ',@slot),'SLOT',CASE WHEN @slot=3 THEN 170 ELSE 165 END);
    SET @slot += 1;
  END
  FETCH NEXT FROM section_cursor INTO @sectionCode,@sectionId;
END
CLOSE section_cursor; DEALLOCATE section_cursor;

COMMIT TRANSACTION;
