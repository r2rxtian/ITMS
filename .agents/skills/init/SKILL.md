---
name: init
description: >-
  Initialize project memory, inspect system health, verify database and server status,
  and summarize the StockHub IMS context when the user runs "init" or asks to initialize.
---

# StockHub IMS Initialization & Health Check

Execute this runbook whenever the user sends `init`, `/init`, `run init`, or requests a project status/initialization.

## 1. Context Verification
Review the permanent project guidelines in [AGENTS.md](file:///d:/DavidAC/ITMS/AGENTS.md):
- **Stack**: Pure TypeScript + Vanilla DOM client (Vite), Express API, SQL Server Express (`msnodesqlv8`).
- **Database**: Always import `sql` from `server/src/config/database.ts` (never directly from `mssql`).
- **Locations**: All occupancy and SKU counts must be calculated recursively through CTEs.
- **Warehouse Scoping**: Dashboard selector filters overview stats only; Plans page selector operates independently.
- **UI Components**: Filter dropdowns sit adjacent to search inputs; buttons use standard `.btn-action` styling.

## 2. Service Health Checks
Check active background services:
- **Backend Server**: Port 3000 (`http://localhost:3000/api/locations`)
- **Client Dev Server**: Port 5173 (`http://localhost:5173`)
- **Database**: Local SQL Server named instance `xdize\SQLEXPRESS` / `StockHubIMS`

## 3. User Response Format
Acknowledge the initialization and provide a concise overview of the active state, confirming:
1. Memory loaded from `AGENTS.md`
2. Backend & Frontend server statuses
3. Database connection status
4. Ready to proceed with tasks
