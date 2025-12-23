# Project Goals

## Primary Objective

Build a **reusable, composable, package-based Express architecture** that provides:

1. **Standardized authentication and authorization** using GitHub OAuth
2. **Clear separation between frontend and API** services (BFF pattern)
3. **Composable npm packages** that prevent template drift
4. **Production-ready patterns** for sessions, JWT, logging, and error handling

## What We're Building

### Three Core Packages

1. **`@animated-spork/shared-core`**
   - Common utilities (logging, debugging, validation)
   - Shared types and interfaces
   - No framework dependencies
   - **Status:** ✅ **COMPLETE** (documented, tested, coverage > 90%)

2. **`@animated-spork/frontend-core`**
   - Express-based frontend server factory
   - GitHub OAuth integration
   - Session management (cookie-based)
   - Server-side rendering with Eta templates
   - API client wrapper (injects JWT)
   - Admin UI shell
   - **Status:** 🔴 **NOT STARTED** (stub only)

3. **`@animated-spork/api-core`**
   - Express-based API server factory
   - JWT issuing and verification
   - MSSQL connection pooling
   - Stored procedure execution patterns
   - Role-based authorization
   - **Status:** 🔴 **NOT STARTED** (stub only)

### Two Demo Applications

1. **`demo-web`** - Example frontend application
   - Consumes `frontend-core` + `shared-core`
   - Demonstrates view template layering
   - Shows domain-specific route implementation
   - **Status:** 🔴 **NOT STARTED** (stub only)

2. **`demo-api`** - Example API application
   - Consumes `api-core` + `shared-core`
   - Demonstrates stored procedure patterns
   - Shows domain-specific endpoint implementation
   - **Status:** 🔴 **NOT STARTED** (stub only)

---

## Core Principles (Non-Negotiable)

### 1. Package-First Approach
- **Distribute as npm packages**, not project templates
- Prevents "template drift" where copied files diverge
- Security patches and updates propagate via version bumps
- Apps compose functionality via imports, not copy-paste

### 2. Factory Pattern
- Core packages export **factory functions**, not listening servers
- Apps configure and mount routers
- Full control of application lifecycle
- Easy testing and composition

### 3. Security by Design
- **Authentication enforced twice:**
  - Frontend: Friendly UX gate (redirects, user-facing errors)
  - API: Hard security gate (JWT verification on every request)
- **Zero trust between services:** API never relies on frontend session
- **JWT best practices:** RSA signing, short expiration, standard claims
- **No secrets in browser:** JWT lives server-side only in session

### 4. Browser ↔ Frontend ↔ API (BFF Pattern)
- Browser **NEVER** talks directly to API
- All browser requests go through frontend service
- Frontend acts as Backend-For-Frontend (BFF)
- Frontend translates API errors into user-friendly responses

### 5. Separation of Concerns
- **Frontend:** UX, sessions, rendering, OAuth flow
- **API:** Data access, authorization, business rules, JWT issuing
- **Shared-Core:** Utilities with no framework dependencies

---

## Success Criteria

A successful implementation will enable:

1. **Rapid application creation:** New apps can be created in < 1 hour with just configuration
2. **Consistent security:** All apps inherit proven auth patterns
3. **Zero template drift:** Updates flow through package versions
4. **Composable architecture:** Apps can pick and choose what they need
5. **Production-ready:** Logging, error handling, health checks built-in
6. **Maintainable:** Clear documentation, tested code, easy to resume after breaks

---

## What This Is NOT

### Explicit Non-Goals

❌ **Project template distribution** - We don't provide "starter files" to copy  
❌ **Browser-to-API direct communication** - Always through frontend BFF  
❌ **Shared sessions across services** - Each service has its own session/token strategy  
❌ **Frontend database access** - Frontend never queries MSSQL  
❌ **Open user self-signup** - Access controlled by GitHub org/team membership  
❌ **Framework-agnostic core** - We're opinionated: Express, Eta, Winston, JWT, MSSQL  

---

## Target Audience

This platform is designed for:

- **Internal organizational applications** requiring GitHub OAuth
- **Data-driven applications** backed by Microsoft SQL Server
- **Teams that value convention over configuration**
- **Organizations wanting to standardize their Express patterns**
- **Projects requiring audit trails and structured logging**

---

## Measuring Success

### Phase 1 Success: Core Packages Complete
- All three packages (`shared-core`, `frontend-core`, `api-core`) are functional
- Each package has > 80% test coverage
- Comprehensive documentation exists for each package
- Demo apps can successfully authenticate and make API calls

### Phase 2 Success: Demo Apps Demonstrate Patterns
- `demo-web` successfully logs in via GitHub OAuth
- `demo-web` calls `demo-api` with JWT
- `demo-api` enforces authorization on protected endpoints
- Admin area shows role-based access control
- All core patterns are demonstrated with working examples

### Phase 3 Success: Production-Ready
- Error handling patterns documented and tested
- Health checks and monitoring endpoints exist
- Deployment documentation is complete
- Package versioning and upgrade strategy is documented
- Real applications can be built by following the patterns

---

## Timeline & Commitment

This is a **large project** that will be built incrementally:

- Work happens in **small, manageable phases**
- Each phase has **clear deliverables**
- Documentation allows **easy resumption** after breaks
- Progress is tracked with **milestones and checklists**

**Expected Total Duration:** 3-6 months (working part-time)  
**Current Status:** Phase 1 - Step 1 complete (shared-core)

See [PHASES.md](./PHASES.md) for the detailed phase breakdown.  
See [MILESTONES.md](./MILESTONES.md) for specific deliverables and checkpoints.

---

## Key Design Decisions

### Why Packages Instead of Templates?
**Problem:** Traditional project templates suffer from "drift" - copied code diverges and becomes unmaintainable.  
**Solution:** Versioned npm packages. Apps depend on packages and get updates via version bumps.

### Why Factory Functions?
**Problem:** Monolithic apps are hard to test and compose.  
**Solution:** Core packages return Express routers, not listening servers. Apps control the lifecycle.

### Why Separate Frontend and API?
**Problem:** Coupling UX and data access leads to security issues and poor separation of concerns.  
**Solution:** BFF pattern. Frontend owns UX and sessions. API owns data and business rules.

### Why JWT + Sessions?
**Problem:** Need both browser-friendly auth (cookies) and service-to-service auth (tokens).  
**Solution:** Frontend uses sessions with browsers. Frontend uses JWT when calling API.

### Why GitHub OAuth?
**Problem:** Need identity provider for internal organizational apps.  
**Solution:** GitHub OAuth with org/team-based access control. Simple, secure, no password management.

---

## Next Steps

1. Read [PHASES.md](./PHASES.md) to understand the implementation plan
2. Read [MILESTONES.md](./MILESTONES.md) to see deliverables and tracking
3. Read [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) to start building
4. Review [draft_PROJECT_OUTLINE.md](./draft_PROJECT_OUTLINE.md) for architectural details

---

**Document Status:** ✅ Finalized  
**Last Updated:** 2025-12-22  
**Next Review:** After Phase 1 completion
