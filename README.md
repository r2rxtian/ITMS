# StockHub Inventory Management System

StockHub is a warehouse-oriented inventory system with a responsive TypeScript dashboard and a Node.js REST API backed by Microsoft SQL Server. Stock quantities can only change through audited stock operations.

## Stack

- Client: Vite, TypeScript, custom HTML/CSS/SVG
- Server: Node.js, TypeScript, Express, Zod, session authentication
- Database: Microsoft SQL Server Express through `mssql/msnodesqlv8` connection pooling and Windows trusted authentication

## Structure

```text
client/             Vite frontend, UI services, and shared client types
server/src/
  config/           Environment, SQL pool, and SQL-backed sessions
  controllers/      HTTP request and response handling
  middleware/       Authentication, authorization, validation, errors
  repositories/     Parameterized SQL access
  routes/           REST endpoint definitions
  services/         Stock, movement, and authentication rules
  validators/       Zod request schemas
  scripts/          Database initialization and admin bootstrap
database/
  schema/            Versioned database schema
  seeds/             Safe reference data
docs/screenshots/    UI reference renders
```

## Setup

1. Install Node.js 20 or newer and Microsoft SQL Server.
2. Copy `.env.example` to `.env`. The default targets the local `SQLEXPRESS` instance with Windows trusted authentication, so no database password is stored.
3. Install packages:

   ```bash
   npm install
   ```

4. Create and initialize the database through the trusted Windows connection:

   ```bash
   npm run db:init
   ```

   This connects to `master`, creates `StockHubIMS` when needed, and applies the schema and seed. Alternatively, using **Windows Authentication** in SQL Server Management Studio, execute `database/schema/001_initial_schema.sql` and then `database/seeds/001_reference_data.sql`. This is the same direct-script pattern used by LostAndFound and does not require SQLCMD Mode.

5. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `.env`, then create the first administrator:

   ```bash
   npm run user:create-admin -w server
   ```

6. Start both applications:

   ```bash
   npm run dev
   ```

The client defaults to `http://localhost:5173`; the API defaults to `http://localhost:3000`.

### Development accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@stockhub.local` | `Admin123!2026` |
| Staff | `staff@stockhub.local` | `Staff123!2026` |
| Viewer | `viewer@stockhub.local` | `Viewer123!2026` |

These local accounts are created by the development seed and should be replaced before deployment.

## Commands

```bash
npm run dev          # client and server
npm run dev:client   # frontend only
npm run dev:server   # backend only
npm run build        # compile both workspaces
npm run db:init      # apply schema and reference data
npm run db:check -w server # verify the trusted SQL connection
npm run user:reset-admin -w server # reset admin to ADMIN_PASSWORD in .env
```

## Security and inventory rules

- Credentials are read only from environment variables.
- SQL input is parameterized and pooled.
- Sessions are HTTP-only and stored in SQL Server.
- ADMIN, STAFF, and VIEWER permissions are enforced by backend middleware.
- Item editing cannot change quantity.
- Stock In, Stock Out, initial stock, and movements run in database transactions and write separate operational and audit records.
- Negative stock, duplicate SKUs, archived-item operations, invalid locations, and capacity violations are rejected.

## API overview

Routes are mounted under `/api`: `auth`, `categories`, `locations`, `items`, `dashboard`, `stock`, `transactions`, `movements`, `alerts`, `reports`, and `audit-logs`. Responses use `{ success, message, data }`; failures use `{ success, message, errors }`.

The repository intentionally contains no real `.env` or credentials. Live database initialization and connection testing require the project owner’s SQL Server values.
