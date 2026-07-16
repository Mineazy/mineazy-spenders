# Codebase Memory: Mineazy Big Spenders Tracking System

This document provides a comprehensive technical overview and architectural summary of the **Mineazy Big Spenders Tracking System** codebase.

---

## 1. System Overview

The **Mineazy Big Spenders Tracking System** is a full-stack web application designed for **Mineazy Mining Solutions** to track, segment, and analyze their high-value (VIP) client profiles, transaction history, and spending patterns. 

The application is structured to connect to a **TiDB (MySQL-compatible)** cloud database cluster in production, while supporting an in-memory **Demo Mode** fallback (mock state) when database credentials are not supplied or connection attempts fail.

---

## 2. Technology Stack

### Backend
- **Node.js (>=20.0.0)**: Main runtime environment.
- **Express.js (v4.19.2)**: Web application framework for REST API routing and static file serving.
- **MySQL2 (v3.10.1)**: Promise-based client for connection pooling and SQL queries targeting TiDB/MySQL database.
- **JSON Web Tokens (JWT) (v9.0.3)**: State-free token authentication for secure API access.
- **Bcrypt (v6.0.0)**: Secure password hashing.
- **Helmet (v8.2.0)**: Security middleware to set HTTP headers.
- **Compression (v1.8.1)**: Gzip compression middleware.
- **Dotenv (v16.4.5)**: Configuration loader via `.env` file.

### Frontend
- **HTML5**: Structured markup utilizing semantic tags and native `<dialog>` elements for modals.
- **CSS3 (Vanilla)**: Customized modern theme using responsive designs (Flexbox and Grid), custom CSS variables, glassmorphism UI accents, and typography loaded from Google Fonts (`Outfit` and `Space Grotesk`).
- **JavaScript (Vanilla ES6)**: Handles client-side state management, authentication, DOM manipulation, and dynamic tables/charts.
- **Chart.js**: Render client metrics, category distributions, spending trends, and cumulative timeline growth.

---

## 3. Project Structure

Here is an overview of the files in this project:

- [package.json](file:///e:/Dev/mineazy-spenders/package.json): Defines application metadata, dependency packages, and scripts (`start`, `dev`).
- [server.js](file:///e:/Dev/mineazy-spenders/server.js): The entry point for the backend server, API routing, database initialization, seeding logic, and Demo Mode fallback.
- [schema.sql](file:///e:/Dev/mineazy-spenders/schema.sql): Database DDL queries to create the required tables (`categories`, `clients`, `transactions`, `users`).
- [public/](file:///e:/Dev/mineazy-spenders/public): Folder containing client-side assets served statically.
  - [index.html](file:///e:/Dev/mineazy-spenders/public/index.html): HTML structure defining navigation tabs, dashboard components, metrics grids, tables, and dialog modals.
  - [styles.css](file:///e:/Dev/mineazy-spenders/public/styles.css): Stylesheet containing custom theme variables, custom UI styles, animations, and modal designs.
  - [app.js](file:///e:/Dev/mineazy-spenders/public/app.js): Handles client-side state, event handlers, paginations, charting, search/filters, CSV exports, backup imports, and REST requests.
- [Dockerfile](file:///e:/Dev/mineazy-spenders/Dockerfile): Lean multi-stage Docker build configuration based on `node:20-alpine` for containerized environments.
- [render.yaml](file:///e:/Dev/mineazy-spenders/render.yaml): Blueprint configuration for automated deployment on Render web services.
- [.env.example](file:///e:/Dev/mineazy-spenders/.env.example): Reference file showing how to structure `.env` configuration keys.
- [.dockerignore](file:///e:/Dev/mineazy-spenders/.dockerignore): Dictates files to omit during Docker builds.

---

## 4. Database Schema

The database model is defined in [schema.sql](file:///e:/Dev/mineazy-spenders/schema.sql). It consists of 4 main tables:

```mermaid
erDiagram
    users {
        VARCHAR_50 id PK
        VARCHAR_100 username UNIQUE
        VARCHAR_255 password_hash
        VARCHAR_50 role "default 'admin'"
        TIMESTAMP created_at
    }
    categories {
        VARCHAR_100 name PK
    }
    clients {
        VARCHAR_50 id PK
        VARCHAR_255 company
        VARCHAR_255 contact
        VARCHAR_255 email
        VARCHAR_50 phone
        VARCHAR_50 tier "Diamond VIP | Gold Partner | Standard Partner"
        VARCHAR_50 status "Active | Inactive"
        VARCHAR_50 joinDate
    }
    transactions {
        VARCHAR_50 txid PK
        VARCHAR_50 invoiceNo
        VARCHAR_50 clientId FK
        DECIMAL amount
        VARCHAR_100 category
        VARCHAR_50 date
        TEXT notes
    }
    clients ||--o{ transactions : "places"
```

### Table Definitions

1. **`categories`**: Stores valid transaction tags.
   - `name` (VARCHAR(100), PRIMARY KEY): Category identifier (e.g., *Workshop*, *Processing*).
2. **`clients`**: Contains company profiles and VIP relationship metrics.
   - `id` (VARCHAR(50), PRIMARY KEY)
   - `company` (VARCHAR(255))
   - `contact` (VARCHAR(255))
   - `email` (VARCHAR(255))
   - `phone` (VARCHAR(50))
   - `tier` (VARCHAR(50)): VIP segments like `Diamond VIP`, `Gold Partner`, `Standard Partner`.
   - `status` (VARCHAR(50)): Status tracking (`Active`, `Inactive`).
   - `joinDate` (VARCHAR(50)): Date the company joined.
3. **`transactions`**: Purchase ledger detailing individual orders.
   - `txid` (VARCHAR(50), PRIMARY KEY): Unique transaction ID.
   - `invoiceNo` (VARCHAR(50))
   - `clientId` (VARCHAR(50), FOREIGN KEY -> `clients.id` ON DELETE CASCADE)
   - `amount` (DECIMAL(15, 2))
   - `category` (VARCHAR(100))
   - `date` (VARCHAR(50))
   - `notes` (TEXT): Specific equipment details, delivery terms, etc.
4. **`users`**: System administrators and users with authentication records.
   - `id` (VARCHAR(50), PRIMARY KEY)
   - `username` (VARCHAR(100), UNIQUE)
   - `password_hash` (VARCHAR(255))
   - `role` (VARCHAR(50), default `'admin'`)
   - `created_at` (TIMESTAMP)

---

## 5. API Endpoints

The API router is implemented in [server.js](file:///e:/Dev/mineazy-spenders/server.js). JWT authentication is required for all paths starting with `/api/` (except the login endpoint).

### Authentication
- `POST /api/auth/login`
  - Body: `{ username, password }`
  - Returns: `{ success, token, user: { id, username, role } }`
  - Behavior: Verifies hashed passwords in SQL. If in Demo Mode, validates password against `'admin123'` or `'demo'`.

### User Management (Admin Required)
- `GET /api/users`
  - Returns: Array of user records: `[{ id, username, role, created_at }]`
- `POST /api/users`
  - Body: `{ username, password, role }`
  - Returns: `{ success, user }`
- `DELETE /api/users/:id`
  - Returns: `{ success }`

### Data Retrieval & Management
- `GET /api/data`
  - Returns: `{ dbConnected, categories: [...], clients: [...], transactions: [...] }`
  - Behavior: Aggregates client-side state in one payload.
- `POST /api/clients`
  - Body: `{ id (optional), company, contact, email, phone, tier, status }`
  - Behavior: Creates a new client profile (if no `id` is supplied) or updates an existing record.
- `DELETE /api/clients/:id`
  - Behavior: Removes the specified client profile and cascades transaction deletion.
- `POST /api/transactions`
  - Body: `{ txid (optional), invoiceNo, clientId, amount, category, date, notes }`
  - Behavior: Logs a transaction. Checks if the category is new, registering it automatically if it does not exist.
- `DELETE /api/transactions/:id`
  - Behavior: Deletes the specified transaction.

### Data Portability
- `POST /api/import`
  - Body: `{ clients: [...], transactions: [...], categories: [...] }`
  - Behavior: Wipes current state (`TRUNCATE`) and restores state from the JSON payload. Useful for backup restoration.

---

## 6. Frontend Layout & Logic

The client code resides in [public/index.html](file:///e:/Dev/mineazy-spenders/public/index.html) and [public/app.js](file:///e:/Dev/mineazy-spenders/public/app.js).

### Navigation Tabs
1. **Dashboard**: 
   - Shows KPIs: *Total Spending*, *VIP Spenders Count*, *Average Order Value*, *Total Orders*.
   - Displays Charts: Spend trend line, Category share doughnut, Top spenders horizontal bar, Cumulative spend growth.
   - Renders a quick Top 5 Spenders Leaderboard.
2. **Clients**: 
   - Administers customer files, contact details, and client VIP tiers.
   - Includes real-time client search, VIP tier filtering, and status filtering.
   - Sorted dynamically by name, tier, lifetime spend, orders count, and last active date.
3. **Transactions**: 
   - Logs new transactions and queries the central purchase ledger.
   - Search by transaction notes, invoice numbers, or client names.
   - Filters transactions by client, category, and date ranges.
   - Incorporates paginated view (default: 10 rows per page).
4. **Big Spenders**: 
   - Displays ranked cumulative expenditure list sorted by lifetime value.
   - Filter rankings by period (All Time, This Month, Last 90 Days, or Custom Date Ranges).
   - Allows CSV data export of rankings.
5. **Users**: 
   - Lists administrative login accounts (visible to `admin` role users only).

### Key Frontend Components
- **Live Clock**: Simulates standard system time.
- **Toast System**: Provides dynamic alerts for actions (e.g., success, info, error).
- **Native `<dialog>` Elements**: Used for modals with backdrop clicking to close (except forms requiring input).
- **Data Portability Drawer**: Access JSON configurations to export current state or restore from backups.

---

## 7. Deployment & Configuration

### Environment Variables
The application uses the following env keys, detailed in [.env.example](file:///e:/Dev/mineazy-spenders/.env.example):
- `PORT` (default: `8000`): Port to listen on.
- `JWT_SECRET`: Used to generate signature blocks for auth sessions.
- `DATABASE_URL`: Connection string containing username, password, host, port, database, and SSL query params.
- `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`: Individual parameters for connection fallback.
- `TIDB_SSL_CA`: Local system absolute path to SSL Certificate.

### Docker Environment
Defined in [Dockerfile](file:///e:/Dev/mineazy-spenders/Dockerfile):
- Utilizes `node:20-alpine`.
- Copies application dependencies and sets `NODE_ENV=production`.
- Exposes port `8000`.

### Render Cloud Platform
Defined in [render.yaml](file:///e:/Dev/mineazy-spenders/render.yaml):
- Builds using `npm install` and runs with `npm start`.
- Configured with environment hooks for `DATABASE_URL` and `JWT_SECRET`.
