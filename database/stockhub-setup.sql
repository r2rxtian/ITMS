/*
  LEGACY SQLCMD WRAPPER

  The recommended setup now matches LostAndFound's trusted Windows connection:
      npm run db:init

  If you prefer SSMS, run schema/001_initial_schema.sql and then
  seeds/001_reference_data.sql individually using Windows Authentication.

  The SQLCMD wrapper below remains available only for environments that
  explicitly enable Query > SQLCMD Mode.

  Update ProjectRoot below only if this project is moved elsewhere.
  This script creates StockHubIMS, selects it, then runs the versioned
  schema and safe reference-data scripts in the correct order.
*/

:setvar DatabaseName "StockHubIMS"
:setvar ProjectRoot "D:\DavidAC\ITMS"

USE master;
GO

IF DB_ID('$(DatabaseName)') IS NULL
BEGIN
  PRINT 'Creating database $(DatabaseName)...';
  CREATE DATABASE [$(DatabaseName)];
END
ELSE
  PRINT 'Database $(DatabaseName) already exists; applying idempotent setup.';
GO

USE [$(DatabaseName)];
GO

:r $(ProjectRoot)\database\schema\001_initial_schema.sql
:r $(ProjectRoot)\database\seeds\001_reference_data.sql

PRINT 'StockHub database schema and reference data setup completed.';
GO
