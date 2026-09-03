USE StockHubIMS;
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.ims_operational_objectives', 'U') IS NULL
CREATE TABLE dbo.ims_operational_objectives (
  objective_id INT IDENTITY(1,1) PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  year INT NOT NULL,
  week_number INT NOT NULL,
  title NVARCHAR(200) NOT NULL,
  description NVARCHAR(1000) NULL,
  category NVARCHAR(50) NOT NULL CONSTRAINT DF_ims_objectives_category DEFAULT 'GENERAL',
  priority NVARCHAR(20) NOT NULL CONSTRAINT DF_ims_objectives_priority DEFAULT 'NORMAL',
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_ims_objectives_status DEFAULT 'PENDING',
  target_date DATE NULL,
  created_by INT NOT NULL REFERENCES dbo.ims_users(user_id),
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_objectives_created DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ims_objectives_updated DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.ims_floor_logs', 'U') IS NULL
CREATE TABLE dbo.ims_floor_logs (
  log_id INT IDENTITY(1,1) PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  location_id INT NULL REFERENCES dbo.ims_warehouse_locations(location_id),
  log_type NVARCHAR(50) NOT NULL CONSTRAINT DF_ims_logs_type DEFAULT 'HANDOVER',
  severity NVARCHAR(20) NOT NULL CONSTRAINT DF_ims_logs_severity DEFAULT 'INFO',
  content NVARCHAR(2000) NOT NULL,
  logged_by INT NOT NULL REFERENCES dbo.ims_users(user_id),
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ims_logs_created DEFAULT SYSUTCDATETIME()
);

COMMIT TRANSACTION;
GO
