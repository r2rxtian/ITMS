# StockHub IMS — Project Memory & Architecture Context

This document is the persistent memory and invariant guideline for **StockHub IMS** (Inventory & Tracking Management System). It is automatically loaded by Antigravity across all sessions.

---

## 1. Project Overview & Tech Stack
- **System**: Multi-tenant/multi-warehouse inventory tracking and management system.
- **Frontend (`/client`)**:
  - Pure TypeScript with Vanilla DOM manipulation (no React/Vue/Angular).
  - Modern, responsive Vanilla CSS (`client/src/styles.css`) with light and dark mode support.
  - Bundled with **Vite** (dev server: `http://localhost:5173`).
  - Font: Inter.
- **Backend (`/server`)**:
  - Node.js + Express with TypeScript (`tsx watch src/server.ts`).
  - Port: `3000` (API routes prefixed with `/api`).
  - Authentication: Session-based cookie auth with bcrypt password hashing and RBAC (`ADMIN`, `STAFF`, `USER`).
- **Database**:
  - Microsoft SQL Server (`StockHubIMS` database on local named instance `xdize\SQLEXPRESS`).
  - Connection driver: **`mssql/msnodesqlv8.js`** using Windows Integrated Authentication (Trusted_Connection).
  - **CRITICAL INVARIANT**: In backend repositories, ALWAYS import `sql` from `../config/database.js` (`import { getPool, sql } from '../config/database.js'`). NEVER import directly from `'mssql'` (which defaults to the `tedious` driver and fails on Windows named pipes/instances).

---

## 2. Directory Structure & Key Files
```text
ITMS/
├── client/
│   ├── src/
│   │   ├── main.ts              # App shell, navigation, dashboard warehouse view, SVG backdrop
│   │   ├── styles.css           # Global stylesheet & design system tokens
│   │   ├── pages/
│   │   │   └── modules.ts       # Modules (Inventory, Categories, Locations, Plans, Reports, Settings)
│   │   ├── services/api.ts      # Client HTTP API client & error handling
│   │   └── ui/dialog.ts         # Modal dialogs, toast notifications, confirmations
├── server/
│   ├── src/
│   │   ├── config/database.ts   # MSSQL connection pool using msnodesqlv8
│   │   ├── controllers/         # Request handling & HTTP status logic
│   │   ├── repositories/        # SQL queries, recursive CTEs, and data access
│   │   └── routes/              # Express API route declarations
├── database/                    # SQL migration scripts and seed data
└── AGENTS.md                    # Persistent workspace memory (this file)
```

---

## 3. Critical Architecture Invariants

### 1. Warehouse Scoping & Filtering
- **Dashboard Warehouse Selector**: Scoped *exclusively* to dashboard overview widgets, floating rack cards, and capacity metrics. Changing the dashboard warehouse does NOT mutate other modules.
- **Plans Module Warehouse Switcher**: The Plans page has its own independent warehouse switcher dropdown (`#plansWarehouseSelect`) persisted in `localStorage('stockhub.plans.warehouseId')`. Objectives and Floor Logs are strictly partitioned per warehouse.
- **Multi-Warehouse Support**: Two primary facilities exist by default:
  - `Main Warehouse` (Code: `MAIN`)
  - `East Hub Warehouse` (Code: `EAST`)

### 2. Recursive Location Hierarchy (CTEs)
- Locations follow an arbitrary multi-tier hierarchy: `WAREHOUSE` $\rightarrow$ `SECTION` $\rightarrow$ `SLOT` / `STORAGE`.
- Item inventory is stored primarily at leaf/slot levels.
- **Aggregation Invariant**: Any query calculating warehouse occupancy, SKU count, or capacity MUST use recursive CTEs (e.g. `WITH LocationHierarchy AS ...`) to aggregate sub-locations at all depths. Never query only 1-level parent IDs.

### 3. Dashboard Warehouse Backdrops
- Rendered dynamically in `client/src/main.ts` via `renderWarehouseBackdrop(warehouseName, warehouseCode)`:
  - `Main Warehouse`: `warehouseSvg` with `preserveAspectRatio="none"`.
  - `East Hub Warehouse`: `eastHubSvg` (custom vector graphic depicting high-bay racking and dock doors) with `preserveAspectRatio="none"`.
- **Full Stretch Invariant**: All warehouse SVGs MUST specify `preserveAspectRatio="none"` and `.warehouse-art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }` so they stretch edge-to-edge without dead space or pillarboxing.

### 4. UI Layout & Component Patterns
- **Toolbar Standards**:
  - In `Locations` and `Categories`: The search input sits on the left, followed immediately by filter dropdowns (`Status`, `Type`, `Sort`). Action buttons (`Export`, view toggle, primary `+ Add` button) are aligned to the far right with `margin-left: auto`.
  - Do NOT create separate `.module-heading` rows when action buttons can live inside the filter card toolbar.
- **Standard Card Action Buttons**:
  - Card footers use `.btn-action` or `.btn-sub-action`:
    - `height: 32px; border-radius: 7px; font-size: 11px; font-weight: 600;`
    - View/Edit: `.btn-action` with soft blue hover.
    - Delete: `.btn-action.danger` with text label `⌫ Delete` (soft red text, `#fff0f1` hover).
    - Always include dark mode variants (`.dark .btn-action.danger`).
- **Universal Stat Cards**:
  - 4-tile rows with left-edge colored indicator strips (`.blue`, `.green`, `.orange`, `.purple`).

---

## 4. Initialization & Health Check Runbook
When the user sends `init`, `/init`, or starts a new session:
1. Verify backend server running on port `3000` (`http://localhost:3000/api/locations`).
2. Verify Vite dev server on port `5173`.
3. Verify client build passes: `npm run build -w client`.
4. Greet the user with a concise status summary (DB connected, servers active, active features).
