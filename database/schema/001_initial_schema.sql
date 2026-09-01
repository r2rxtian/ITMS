/* StockHub IMS schema. Uses the same direct-database pattern as LostFoundDB. */
IF DB_ID(N'StockHubIMS') IS NULL CREATE DATABASE StockHubIMS;
GO
USE StockHubIMS;
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.ims_roles', 'U') IS NULL
CREATE TABLE dbo.ims_roles (
  role_id INT IDENTITY(1,1) PRIMARY KEY,
  role_name NVARCHAR(20) NOT NULL UNIQUE,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_roles_created DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.ims_users', 'U') IS NULL
CREATE TABLE dbo.ims_users (
  user_id INT IDENTITY(1,1) PRIMARY KEY,
  role_id INT NOT NULL REFERENCES dbo.ims_roles(role_id),
  email NVARCHAR(255) NOT NULL UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  display_name NVARCHAR(120) NOT NULL,
  is_active BIT NOT NULL CONSTRAINT DF_ims_users_active DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_users_created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ims_users_updated DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.ims_categories', 'U') IS NULL
CREATE TABLE dbo.ims_categories (
  category_id INT IDENTITY(1,1) PRIMARY KEY,
  category_name NVARCHAR(100) NOT NULL,
  description NVARCHAR(500) NULL,
  is_active BIT NOT NULL CONSTRAINT DF_ims_categories_active DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_categories_created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ims_categories_updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_ims_categories_name UNIQUE(category_name)
);

IF OBJECT_ID('dbo.ims_warehouse_locations', 'U') IS NULL
CREATE TABLE dbo.ims_warehouse_locations (
  location_id INT IDENTITY(1,1) PRIMARY KEY,
  parent_location_id INT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  location_code NVARCHAR(40) NOT NULL UNIQUE,
  location_name NVARCHAR(120) NOT NULL,
  location_type NVARCHAR(30) NOT NULL,
  maximum_capacity DECIMAL(18,2) NOT NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_ims_locations_status DEFAULT 'ACTIVE',
  description NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_locations_created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ims_locations_updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_ims_locations_capacity CHECK(maximum_capacity >= 0),
  CONSTRAINT CK_ims_locations_status CHECK(status IN ('ACTIVE','INACTIVE','MAINTENANCE'))
);

IF OBJECT_ID('dbo.ims_items', 'U') IS NULL
CREATE TABLE dbo.ims_items (
  item_id INT IDENTITY(1,1) PRIMARY KEY,
  sku NVARCHAR(80) NOT NULL UNIQUE,
  item_name NVARCHAR(200) NOT NULL,
  description NVARCHAR(1000) NULL,
  category_id INT NOT NULL REFERENCES dbo.ims_categories(category_id),
  location_id INT NOT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  unit NVARCHAR(30) NOT NULL CONSTRAINT DF_ims_items_unit DEFAULT 'unit',
  unit_cost DECIMAL(18,2) NOT NULL,
  quantity DECIMAL(18,2) NOT NULL CONSTRAINT DF_ims_items_quantity DEFAULT 0,
  reorder_level DECIMAL(18,2) NOT NULL CONSTRAINT DF_ims_items_reorder DEFAULT 0,
  maximum_stock DECIMAL(18,2) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_ims_items_status DEFAULT 'ACTIVE',
  image_path NVARCHAR(500) NULL,
  created_by INT NOT NULL REFERENCES dbo.ims_users(user_id),
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_items_created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ims_items_updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_ims_items_numbers CHECK(quantity >= 0 AND reorder_level >= 0 AND unit_cost >= 0 AND (maximum_stock IS NULL OR maximum_stock >= 0)),
  CONSTRAINT CK_ims_items_status CHECK(status IN ('ACTIVE','ARCHIVED'))
);

IF OBJECT_ID('dbo.ims_stock_transactions', 'U') IS NULL
CREATE TABLE dbo.ims_stock_transactions (
  transaction_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  item_id INT NOT NULL REFERENCES dbo.ims_items(item_id),
  transaction_type NVARCHAR(30) NOT NULL,
  quantity_change DECIMAL(18,2) NOT NULL,
  previous_quantity DECIMAL(18,2) NOT NULL,
  new_quantity DECIMAL(18,2) NOT NULL,
  location_id INT NOT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  reference_number NVARCHAR(100) NULL,
  remarks NVARCHAR(1000) NOT NULL,
  performed_by INT NOT NULL REFERENCES dbo.ims_users(user_id),
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_transactions_created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_ims_transactions_type CHECK(transaction_type IN ('STOCK_IN','STOCK_OUT','RETURN','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT','INITIAL_STOCK')),
  CONSTRAINT CK_ims_transactions_result CHECK(previous_quantity >= 0 AND new_quantity >= 0 AND quantity_change <> 0)
);

IF OBJECT_ID('dbo.ims_item_movements', 'U') IS NULL
CREATE TABLE dbo.ims_item_movements (
  movement_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  item_id INT NOT NULL REFERENCES dbo.ims_items(item_id),
  from_location_id INT NOT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  to_location_id INT NOT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  quantity DECIMAL(18,2) NOT NULL,
  moved_by INT NOT NULL REFERENCES dbo.ims_users(user_id),
  remarks NVARCHAR(1000) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_movements_created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_ims_movements_quantity CHECK(quantity > 0),
  CONSTRAINT CK_ims_movements_locations CHECK(from_location_id <> to_location_id)
);

IF OBJECT_ID('dbo.ims_alerts', 'U') IS NULL
CREATE TABLE dbo.ims_alerts (
  alert_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  item_id INT NULL REFERENCES dbo.ims_items(item_id),
  alert_type NVARCHAR(40) NOT NULL,
  severity NVARCHAR(20) NOT NULL,
  message NVARCHAR(500) NOT NULL,
  is_resolved BIT NOT NULL CONSTRAINT DF_ims_alerts_resolved DEFAULT 0,
  resolved_by INT NULL REFERENCES dbo.ims_users(user_id),
  resolved_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_alerts_created DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.ims_audit_logs', 'U') IS NULL
CREATE TABLE dbo.ims_audit_logs (
  audit_id BIGINT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NULL REFERENCES dbo.ims_users(user_id),
  action NVARCHAR(60) NOT NULL,
  entity_type NVARCHAR(60) NOT NULL,
  entity_id NVARCHAR(80) NULL,
  description NVARCHAR(1000) NOT NULL,
  ip_address NVARCHAR(64) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_audit_created DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.ims_sessions', 'U') IS NULL
CREATE TABLE dbo.ims_sessions (
  session_id NVARCHAR(128) PRIMARY KEY,
  session_data NVARCHAR(MAX) NOT NULL,
  expires_at DATETIME2 NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_sessions_created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ims_sessions_updated DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ims_items_category') CREATE INDEX IX_ims_items_category ON dbo.ims_items(category_id, status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ims_items_location') CREATE INDEX IX_ims_items_location ON dbo.ims_items(location_id, status) INCLUDE(quantity, reorder_level);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ims_transactions_item_date') CREATE INDEX IX_ims_transactions_item_date ON dbo.ims_stock_transactions(item_id, created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ims_audit_date') CREATE INDEX IX_ims_audit_date ON dbo.ims_audit_logs(created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ims_alerts_open') CREATE INDEX IX_ims_alerts_open ON dbo.ims_alerts(is_resolved, severity, created_at DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ims_sessions_expiry') CREATE INDEX IX_ims_sessions_expiry ON dbo.ims_sessions(expires_at);

COMMIT TRANSACTION;
