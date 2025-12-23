# Project Outline

<!-- 
REVISION NOTES (from PR #3 - copilot/update-project-outline-for-factory):
This document has been updated to reflect the package distribution strategy and factory pattern.
Key changes include:
- Added shared-core package to architecture
- Emphasized packages over project templates to avoid "template drift"
- Clarified factory pattern for Express apps
- Updated packaging strategy to focus on npm packages, not project template files
- Added explicit non-goal about project template distribution

NOTE: This outline distinguishes between:
- "Project templates" (drop-in files/directories) - which we AVOID to prevent drift
- "View templates" (Eta/EJS rendering templates) - which frontend-core DOES distribute

📚 DOCUMENTATION UPDATE (2025-12-22):
This document provides architectural details. For a complete documentation overview:
- See PROJECT_GOALS.md for project objectives and principles
- See PHASES.md for the implementation plan and roadmap
- See MILESTONES.md for detailed progress tracking
- See DEVELOPMENT_GUIDE.md for getting started with development
-->

## Goal
Build a reusable, composable Express-based architecture consisting of:

- **shared-core**: common utilities, validation, and shared logic
- **frontend-core**: a reusable server-rendered web frontend shell (factory)
- **api-core**: a reusable API shell (factory) that sits in front of MSSQL
- All packaged as private npm modules and composed into concrete applications

The browser **never** talks directly to the API.  
All browser interaction goes through the frontend service (BFF pattern).

---

## High-Level Architecture

<!-- REVISION: Added shared-core to the architecture diagram -->

```
Browser
  |
  |  (HTTP, cookies/session)
  v
Frontend Service (Express + frontend-core + shared-core)
  |
  |  (HTTP + Authorization: Bearer JWT)
  v
API Service (Express + api-core + shared-core)
  |
  |  (stored procedures, views only)
  v
Microsoft SQL Server
```

---

## Core Principles

<!-- REVISION: Updated to emphasize factory pattern and package-based approach -->

- Clear separation of concerns
- Frontend owns UX, sessions, and rendering
- API owns data access, authorization, and business rules
- Authentication and authorization are enforced **twice**:
  - Friendly gate in frontend (UX)
  - Hard gate in API (security)
- Everything is composable via Express routers, not monolithic apps
- **Factory Pattern**: Core packages export factory functions that create configured Express routers
- **Package-First Approach**: Distribute platform capabilities as npm packages, not templates

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

## shared-core Responsibilities

<!-- REVISION: Added section for shared-core package (previously missing from outline) -->

- Common utilities shared by both frontend-core and api-core
- Validation logic (e.g., input sanitization, schema validation)
- Shared domain types and interfaces
- Common error types and handling utilities
- Configuration parsing and validation helpers

shared-core **does not**:
- Depend on Express or web frameworks
- Contain business logic specific to frontend or API
- Access databases or external services directly

---

## frontend-core Responsibilities

<!-- REVISION: Clarified that frontend-core is a factory that exports router creation functions -->

- **Factory function** that returns configured Express routers (no `listen`)
- **View templates** (Eta/EJS) for rendering:
  - Base layouts distributed with the package
  - Common UI components and pages (login, error pages, admin shell)
  - Layered view resolution (package views + app-specific views)
- View engine configuration (Eta)
- Static assets (CSS, JS, images)
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

<!-- REVISION: Clarified that api-core is a factory that exports router creation functions -->

- **Factory function** that returns configured Express routers
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

<!-- 
REVISION: Updated to emphasize package distribution over project templates.
This is critical to avoid "project template drift" where copied project files 
diverge and become unmaintainable. Instead, we distribute capabilities 
as versioned npm packages that apps depend on.

Note: frontend-core DOES distribute view templates (Eta/EJS files) within the 
package for rendering layouts and common UI components.
-->

### Current (Monorepo Development)
- Monorepo with npm workspaces:
  - `packages/shared-core` - common utilities
  - `packages/frontend-core` - frontend factory
  - `packages/api-core` - API factory
  - `apps/demo-web` - example frontend app
  - `apps/demo-api` - example API app

### Package Distribution Strategy
- Core packages (`shared-core`, `frontend-core`, `api-core`) are **npm packages**
- Apps import and use factory functions from these packages
- **frontend-core includes view templates (Eta)** for rendering common layouts/pages
- Apps provide:
  - Configuration (OAuth keys, DB connection, etc.)
  - Domain-specific routes and business logic
  - Additional view templates (layered with frontend-core's templates)
- Updates to core functionality happen via **package version updates**, not file copying

### How Apps Consume Packages

```javascript
// Example: apps/demo-web/index.js
import { createFrontendApp } from '@my-org/frontend-core';
import myDomainRoutes from './routes/index.js';

const app = createFrontendApp({
  sessionSecret: process.env.SESSION_SECRET,
  apiBaseUrl: process.env.API_URL,
  githubOAuth: { /* ... */ }
});

app.use('/my-feature', myDomainRoutes);
app.listen(3000);
```

### Benefits of Package Approach
- **No project template drift**: All apps get updates by upgrading package versions
- **Centralized fixes**: Security patches and bug fixes propagate automatically
- **Versioned evolution**: Apps can upgrade on their own timeline using semver
- **Composition over copying**: Apps compose functionality rather than forking code
- **View templates bundled**: Common UI layouts/components distributed within packages

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

<!-- REVISION: Updated to include shared-core in the build plan -->

1. Create monorepo structure with workspaces
2. Build shared-core:
   - Common utilities and validation
   - Shared types
3. Build api-core factory:
   - JWT verification
   - Auth exchange endpoint
   - Health endpoint
4. Build frontend-core factory:
   - Sessions
   - GitHub OAuth login
   - API client wrapper
5. Wire frontend ↔ API auth exchange
6. Add admin role mapping
7. Add example domain routes in demo apps
8. Test and document core packages

---

## Non-Goals (Explicit)

<!-- REVISION: Added explicit non-goal about project template distribution to emphasize package-first approach -->

- Browser-to-API direct communication
- Shared sessions across services
- Frontend querying MSSQL
- Open user self-signup
- **Project template-based distribution** (we distribute packages, not drop-in project files, to avoid drift)
- Copying and forking core code into individual apps

Note: View templates (Eta/EJS) ARE distributed within frontend-core package.

---

## Avoiding Template Drift

<!-- REVISION: New section addressing the core motivation for package-based distribution -->

### The Problem
Traditional **project template-based** approaches suffer from "template drift":
- Teams copy project template files/directories to start new projects
- Project template gets updated with fixes and improvements
- Existing projects don't automatically get those updates
- Each project becomes a unique maintenance burden
- Security patches require manual updates across all projects

### Our Solution: Package-Based Architecture
Instead of distributing project templates (drop-in files), we distribute **versioned npm packages**:

1. **Central Updates**: Core functionality lives in npm packages
2. **Version Control**: Apps specify which version they depend on
3. **Gradual Upgrades**: Apps can upgrade when ready, using semver
4. **Automatic Propagation**: Critical fixes can be applied by bumping versions
5. **Composition**: Apps compose functionality via imports, not copy-paste

### View Templates vs Project Templates
**Important distinction:**
- **Project templates** (drop-in files) → ❌ AVOIDED to prevent drift
- **View templates** (Eta/EJS rendering files) → ✅ DISTRIBUTED within frontend-core package
  - Common layouts, error pages, admin shell UI
  - Apps can layer their own views on top using layered view resolution
  - Updates to view templates propagate via package version updates

### Factory Pattern
Our core packages export factory functions, not full applications:

```javascript
// In @my-org/frontend-core
export function createFrontendApp(config) {
  const app = express();
  // Set up sessions, OAuth, middleware, etc.
  // Configure Eta view engine with package-bundled templates
  return app; // Returns router, not a listening server
}
```

This allows apps to:
- Configure the core functionality with their specific needs
- Add their domain routes on top
- Use or override the distributed view templates
- Maintain full control of the application lifecycle
- Upgrade the core package independently

---

## Result

<!-- REVISION: Updated to emphasize package distribution and avoiding template drift -->

A clean, secure, reusable Express-based platform where:
- New apps are mostly configuration and domain routes
- Auth and infrastructure are standardized in versioned packages
- Frontend and API can evolve independently
- **No project template drift**: Updates propagate via package versions
- Apps compose functionality from packages rather than copying code
- View templates (Eta/EJS) are distributed within packages for consistent UI
