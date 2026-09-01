/* Development-only users. Passwords are stored only as bcrypt hashes. */
USE StockHubIMS;
GO

DECLARE @users TABLE (
  email NVARCHAR(255),
  display_name NVARCHAR(120),
  role_name NVARCHAR(20),
  password_hash NVARCHAR(255)
);

INSERT @users(email,display_name,role_name,password_hash) VALUES
  (N'admin@stockhub.local',N'System Administrator',N'ADMIN',N'$2b$12$g87AH7BxohqRoPIIfwPlc.LPFqiHNpHR34rPSgU4EvJE3AN/kwrbm'),
  (N'staff@stockhub.local',N'Warehouse Staff',N'STAFF',N'$2b$12$k955SHhPNt5dmHh7mupCH.knGenWUv5CG0Y8ORzKTARVd6pYGcnyi'),
  (N'viewer@stockhub.local',N'Inventory Viewer',N'VIEWER',N'$2b$12$mfb.LMEwDss0Q2aAQj2RrOs4JIzOJqZ/NWtzoPtEd27p3AvTtRYZO');

MERGE dbo.ims_users AS target
USING (
  SELECT source.email,source.display_name,source.password_hash,role.role_id
  FROM @users source JOIN dbo.ims_roles role ON role.role_name=source.role_name
) AS source ON target.email=source.email
WHEN MATCHED THEN UPDATE SET
  target.display_name=source.display_name,
  target.password_hash=source.password_hash,
  target.role_id=source.role_id,
  target.is_active=1,
  target.updated_at=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(role_id,email,password_hash,display_name)
  VALUES(source.role_id,source.email,source.password_hash,source.display_name);
GO
