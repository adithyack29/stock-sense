# StockSense — Modular Inventory & Warehouse Management System

StockSense is a high-performance, modular Inventory Management System designed to replace manual registers, Excel spreadsheets, and fragmented stock tracking with real-time, ledger-audited inventory operations.

Built for fast-paced logistics and warehouse facilities, it serves both **Inventory Managers** (inbound/outbound oversight, low-stock warnings, multi-warehouse setup) and **Warehouse Staff** (shelf picking, location relocations, cycle count adjustments).

---

## Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with modern design system and semantic status colors
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: Inter & JetBrains Mono (Google Fonts)

### Backend & Data Layer
- **Engine**: [FastAPI](https://fastapi.tiangolo.com/) with asynchronous Uvicorn runner
- **ORM & Data Layer**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/)
- **Database**: Local [SQLite](https://www.sqlite.org/) with transactional ACID guarantees and relational foreign keys
- **API Documentation**: Interactive OpenAPI / Swagger UI at `http://127.0.0.1:8000/docs`

---

## Core Inventory Logic & Business Rules

StockSense enforces strict inventory state transitions to prevent disconnected stock copies:

1. **Receipt of Goods** (`RECEIVE GOODS`):
   - Status transitions from `draft` → `waiting` → `ready` → `done`
   - Validating receipt increases stock at destination location
   - Records an immutable entry in the **Stock Ledger** (`StockMovement`)
2. **Internal Transfer** (`INTERNAL RELOCATION`):
   - Relocates stock from source location to destination location
   - Total enterprise stock remains constant; location quantities shift
   - Logs a `transfer` movement in the Stock Ledger
3. **Delivery Orders** (`PICK & SHIP`):
   - Validates on-hand stock availability before dispatch
   - Deducts quantities from origin location
   - Logs a `delivery` movement in the Stock Ledger
4. **Stock Adjustments** (`CYCLE COUNTS`):
   - Computes discrepancies between system on-hand and physical count
   - Corrects location stock and logs an `adjustment` variance audit

---

## Project Structure

```
stocksense/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application, CORS, lifespan & seed hook
│   │   ├── database.py             # SQLite engine, SessionLocal, declarative base
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── entities.py         # SQLAlchemy domain models (User, Product, Stock, etc.)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── domain.py           # Pydantic schemas for validation and API serialization
│   │   ├── services/
│   │   │   ├── inventory_service.py# Business logic for stock moves & ledger audits
│   │   │   └── seed_service.py     # Realistic demo dataset population
│   │   └── routes/
│   │       ├── __init__.py
│   │       └── api.py              # Modular API endpoints (/api/products, /api/stock, etc.)
│   ├── requirements.txt            # Python dependencies
│   └── run.py                      # Uvicorn launcher
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           # Fetch API client with error handling
│   │   │   └── index.ts            # Typed API methods
│   │   ├── components/
│   │   │   ├── common/             # Reusable UI component library
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── LoadingState.tsx
│   │   │   │   ├── ErrorState.tsx
│   │   │   │   ├── ConfirmDialog.tsx
│   │   │   │   ├── FormField.tsx
│   │   │   │   └── Breadcrumbs.tsx
│   │   │   └── layout/             # Shell layout
│   │   │       ├── AppLayout.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       ├── TopBar.tsx
│   │   │       └── MobileNav.tsx
│   │   ├── pages/                  # Page routes
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── products/
│   │   │   ├── stock/
│   │   │   ├── receipts/
│   │   │   ├── deliveries/
│   │   │   ├── transfers/
│   │   │   ├── adjustments/
│   │   │   ├── movements/
│   │   │   ├── warehouses/
│   │   │   ├── locations/
│   │   │   ├── settings/
│   │   │   └── profile/
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Session state & Manager / Staff role switcher
│   │   ├── utils/
│   │   │   └── formatters.ts       # Dates, quantities, and status badge color maps
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript domain interfaces
│   │   ├── routes/
│   │   │   └── index.tsx           # React Router route registry
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts              # Vite config with Tailwind & proxy to backend
│   └── package.json
├── package.json                    # Root scripts for running full stack
├── .gitignore
└── README.md
```

---

## Installation & Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Python**: 3.9+

### 2. Setup
Run from root directory:
```bash
# Setup backend virtual environment and install dependencies
npm run setup:backend

# Install frontend dependencies
npm run setup:frontend

# Or setup both at once
npm run setup
```

### 3. Run Development Servers
Start both backend (port 8000) and frontend (port 5173) concurrently:
```bash
npm run dev
```

Alternatively, run in separate terminals:
```bash
# Terminal 1 (Backend API)
npm run dev:backend

# Terminal 2 (Frontend UI)
npm run dev:frontend
```

Open your browser at:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Established Routing Map

| Route | Purpose | Behavior |
|---|---|---|
| `/dashboard` | Operations Hub | Live KPI stats, low-stock warnings, recent stock ledger movements |
| `/products` | Product Catalog | Master list of all SKUs with aggregate stock and search/filter |
| `/products/:id` | Product Details | Product specs, warehouse location breakdown, product movement audit |
| `/stock` | Stock Positions | Detailed breakdown of inventory quantity by warehouse rack |
| `/receipts` | Inbound Receipts | Receipts list view with status filters and quick actions |
| `/receipts/new` | Create Receipt | Form with dynamic line items and destination rack selection |
| `/receipts/:id` | Receipt Detail | Line item breakdown and "Validate / Receive Goods" action |
| `/deliveries` | Outbound Deliveries | Delivery list view with status filters |
| `/deliveries/new` | Create Delivery | Order creation with stock check and pick instructions |
| `/deliveries/:id` | Delivery Detail | Line item breakdown and "Validate / Ship" action |
| `/transfers` | Internal Transfers | Relocations list view |
| `/transfers/new` | Create Transfer | Source and destination rack movement scheduler |
| `/transfers/:id` | Transfer Detail | Line items and "Validate / Move Stock" action |
| `/adjustments` | Stock Adjustments | Cycle count audit log and variance records |
| `/adjustments/new` | New Adjustment | Physical count correction with real-time discrepancy preview |
| `/move-history` | Stock Ledger | Immutable trace of all receipts, deliveries, transfers, and adjustments |
| `/warehouses` | Warehouses | Multi-warehouse management |
| `/locations` | Locations | Specific shelving racks, production staging, and bays |
| `/settings` | Settings & Demo | Live system specs and one-click demo data reset |
| `/profile` | Profile | Operator info and role configuration |

---

## Current Development Status
- **Phase 1 (Foundation)**: Complete.
  - Project architecture established with clean separation of concerns.
  - Reusable UI component library created (Buttons, Badges, Tables, Cards, Modals, StatCards, SearchBars, Forms, ConfirmDialogs).
  - Dynamic SQLite database with relational SQLAlchemy models and Pydantic validation.
  - Core inventory business logic service ensuring transactional consistency between operations, stocks, and the ledger.
  - Realistic seed dataset ready for instant hackathon demonstration.
  - React Router navigation with mobile-responsive shell and role switching (Manager vs Staff).
