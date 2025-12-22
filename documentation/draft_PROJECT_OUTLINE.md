# Project Outline

## Goal
Build a reusable, composable Express-based architecture consisting of:

- **frontend-core**: a reusable server-rendered web frontend shell
- **api-core**: a reusable API shell that sits in front of MSSQL
- Both packaged as private modules and composed into concrete applications

The browser **never** talks directly to the API.  
All browser interaction goes through the frontend service (BFF pattern).

---

## High-Level Architecture

```
Browser
  |
  |  (HTTP, cookies/session)
  v
Frontend Service (Express + frontend-core)
  |
  |  (HTTP + Authorization: Bearer JWT)
  v
API Service (Express + api-core)
  |
  |  (stored procedures, views only)
  v
Microsoft SQL Server
```

---

## Core Principles

- Clear separation of concerns
- Frontend owns UX, sessions, and rendering
- API owns data access, authorization, and business rules
- Authentication and authorization are enforced **twice**:
  - Friendly gate in frontend (UX)
  - Hard gate in API (security)
- Everything is composable via Express routers, not monolithic apps

---

## Authentication & Authorization Model

### Identity Provider
- GitHub OAuth
- Frontend initiates OAuth login
- OAuth App is registered in GitHub

### Access Policy
- **Org / Team membership**
- Only users in a specific GitHub org or team are allowed
- Admin access is derived from:
  - A dedicated GitHub team **or**
  - A small allowlist of GitHub usernames

---

## Session vs Token Responsibilities

### Frontend Service
- Maintains browser session (cookie-based)
- Stores:
  - User identity (GitHub login, display name)
  - API JWT (server-side only)
- Never exposes JWT to browser JavaScript

### API Service
- Issues JWTs
- Verifies JWTs on every request
- Enforces authorization rules
- Never relies on frontend session cookies

---

## JWT Design

- JWTs are **RSA-signed**
- API is the sole token issuer

### JWT Claims (standardized)
- `sub` – stable internal user identifier
- `login` – GitHub username
- `roles` – e.g. `user`, `admin`
- `iss`, `aud`
- `iat`, `exp`

### Keys
- API holds:
  - JWT private key (signing)
  - JWT public key (verification)
- Frontend does **not** sign tokens

---

## Auth Exchange Flow

1. User logs into frontend via GitHub OAuth
2. Frontend receives GitHub identity (and access token)
3. Frontend calls API `/auth/exchange`
4. API:
   - Validates GitHub identity
   - Checks org/team membership
   - Assigns roles
   - Issues JWT
5. Frontend stores JWT in session
6. All subsequent API calls use the JWT

---

## frontend-core Responsibilities

- Express router factory (no `listen`)
- View engine and layouts
- Static assets
- Session and cookie setup
- Login/logout UX
- Access denied pages
- Admin shell (layout + navigation)
- Role-based route guards
- API client abstraction:
  - Injects JWT
  - Normalizes API errors

frontend-core **does not**:
- Know about MSSQL
- Contain domain/business logic
- Enforce final authorization

---

## api-core Responsibilities

- Express router factory
- JSON parsing and limits
- Request ID and logging
- JWT verification middleware
- Role/permission middleware
- Standard error envelope
- Health endpoints
- MSSQL connection pooling
- Stored procedure execution patterns

api-core **does not**:
- Handle OAuth directly
- Render views
- Depend on frontend session state

---

## Admin Area Design

- Admin is a role, not a separate app
- `/admin` mounted in frontend
- Admin access enforced:
  - In frontend (UX)
  - In API (hard gate)
- Admin role derived from GitHub team or allowlist

---

## AJAX / BFF Endpoints

- Browser calls frontend endpoints only
- Frontend endpoints:
  1. Validate session + role
  2. Call API with JWT
  3. Return HTML or JSON
- API errors are translated into user-friendly responses

---

## Repo & Packaging Strategy

### Recommended (Initial)
- Monorepo with workspaces:
  - `packages/frontend-core`
  - `packages/api-core`
  - `apps/frontend-*`
  - `apps/api-*`

### Later
- Publish `frontend-core` and `api-core` as private npm packages
- Use templates for new projects

---

## Environment Configuration

### Frontend Service
- GitHub OAuth client ID/secret
- Session secret
- API base URL

### API Service
- JWT RSA private/public keys
- Issuer/audience config
- GitHub org/team config
- MSSQL connection settings

---

## Build Order (Working Plan)

1. Create monorepo structure
2. Build api-core:
   - JWT verification
   - Auth exchange endpoint
   - Health endpoint
3. Build frontend-core:
   - Sessions
   - GitHub OAuth login
   - API client wrapper
4. Wire frontend ↔ API auth exchange
5. Add admin role mapping
6. Add example domain routes
7. Package and document cores

---

## Non-Goals (Explicit)

- Browser-to-API direct communication
- Shared sessions across services
- Frontend querying MSSQL
- Open user self-signup

---

## Result

A clean, secure, reusable Express-based platform where:
- New apps are mostly configuration and domain routes
- Auth and infrastructure are standardized
- Frontend and API can evolve independently
