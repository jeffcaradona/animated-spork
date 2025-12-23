# Implementation Phases

This document breaks down the project into **manageable phases** with clear deliverables. Each phase is designed to be completable in 2-4 weeks of part-time work (5-10 hours/week).

---

## Phase Overview

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| **Phase 0** | Project setup and documentation | 1 week | ✅ **COMPLETE** |
| **Phase 1** | Core packages implementation | 6-8 weeks | 🟡 **IN PROGRESS** (1/3 complete) |
| **Phase 2** | Demo applications | 4-6 weeks | 🔴 **NOT STARTED** |
| **Phase 3** | Documentation and polish | 2-3 weeks | 🔴 **NOT STARTED** |
| **Phase 4** | Production readiness | 2-3 weeks | 🔴 **NOT STARTED** |

**Total Estimated Time:** 15-20 weeks (4-5 months)

---

## Phase 0: Project Setup and Documentation ✅ COMPLETE

**Goal:** Establish repository structure and comprehensive documentation

### Deliverables
- [x] Monorepo structure with npm workspaces
- [x] ESLint configuration for JavaScript/Eta
- [x] Git repository initialized
- [x] Initial README.md
- [x] Draft PROJECT_OUTLINE.md with architecture
- [x] PROJECT_GOALS.md (finalized)
- [x] PHASES.md (this document)
- [x] MILESTONES.md for tracking
- [x] DEVELOPMENT_GUIDE.md for getting started

### Exit Criteria
- Documentation exists for all project goals and phases
- Repository structure allows independent package development
- Developer can understand the project by reading docs alone

**Status:** ✅ **COMPLETE** (2025-12-22)

---

## Phase 1: Core Packages Implementation 🟡 IN PROGRESS

**Goal:** Implement the three core npm packages (`shared-core`, `frontend-core`, `api-core`)

**Current Status:** 1/3 complete (shared-core done)

### Phase 1.1: shared-core Package ✅ COMPLETE

**Time Investment:** ~2 weeks

#### Deliverables
- [x] Debug utility with namespace resolution
- [x] Winston-based logger utility
- [x] Comprehensive unit tests (> 90% coverage)
- [x] Full documentation (README, API docs, test plan)
- [x] Test helpers for hermetic testing

#### What Was Built
- `createDebugger()` factory for environment-driven debug logging
- `createLogger()` factory for file + console logging
- Test infrastructure with Mocha, Sinon, Chai
- Documentation structure that other packages will follow

**Status:** ✅ **COMPLETE** (2025-12-22)

---

### Phase 1.2: api-core Package 🔴 NOT STARTED

**Estimated Time:** 3-4 weeks

#### Goals
Build the Express-based API server factory with JWT and MSSQL support.

#### Deliverables

**Week 1-2: JWT and Authentication**
- [ ] JWT signing and verification utilities (RSA)
  - Private/public key loading
  - Token generation with standard claims (sub, iat, exp, iss, aud)
  - Token verification middleware
- [ ] `/auth/exchange` endpoint
  - Accepts GitHub identity from frontend
  - Validates GitHub org/team membership
  - Assigns roles (user, admin)
  - Issues JWT
- [ ] Role-based authorization middleware
  - `requireAuth()` - verify JWT
  - `requireRole(role)` - check specific role
- [ ] Unit tests for auth logic (> 80% coverage)

**Week 3: MSSQL Integration**
- [ ] MSSQL connection pooling
  - Configuration object
  - Connection validation
  - Error handling and retries
- [ ] Stored procedure execution patterns
  - `execStoredProc(name, params)` helper
  - Input/output parameter handling
  - Result set parsing
- [ ] Query helper utilities
  - Connection acquisition/release
  - Transaction support basics
- [ ] Integration tests with test database

**Week 4: API Factory and Infrastructure**
- [ ] `createApiApp(config)` factory function
  - JSON parsing with size limits
  - Request ID generation
  - Logging middleware
  - Error handling middleware
  - Health endpoints (`/health`, `/health/db`)
- [ ] Standard error envelope
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Invalid token",
      "requestId": "abc123"
    }
  }
  ```
- [ ] Configuration validation
- [ ] Package documentation (README, API reference)
- [ ] Test coverage report

#### Exit Criteria
- Factory function creates configured Express router
- JWT authentication works end-to-end
- MSSQL connection can be established and tested
- All core middleware is implemented and tested
- Documentation exists for all public APIs

---

### Phase 1.3: frontend-core Package 🔴 NOT STARTED

**Estimated Time:** 3-4 weeks

#### Goals
Build the Express-based frontend server factory with OAuth, sessions, and view rendering.

#### Deliverables

**Week 1: Session and OAuth Foundation**
- [ ] Session management
  - Express-session configuration
  - Session store (memory for dev, Redis-ready for prod)
  - Cookie configuration (httpOnly, secure, sameSite)
- [ ] GitHub OAuth integration
  - OAuth flow initiation (`/auth/login`)
  - OAuth callback handler (`/auth/callback`)
  - Token exchange with GitHub
  - User profile fetching
- [ ] Session storage structure
  ```javascript
  req.session = {
    user: { id, login, name, avatar_url },
    jwt: "...", // API token (server-side only)
    createdAt, lastActivity
  }
  ```
- [ ] Unit tests for OAuth flow

**Week 2: View Engine and Templates**
- [ ] Eta view engine configuration
  - Template directory setup
  - Layered view resolution (package + app views)
  - View helpers and filters
- [ ] Base layout templates
  - `layouts/base.eta` - HTML shell
  - `layouts/admin.eta` - Admin shell with nav
- [ ] Common page templates
  - `pages/login.eta` - Login page
  - `pages/error.eta` - Error display
  - `pages/access-denied.eta` - 403 page
  - `pages/admin/dashboard.eta` - Admin home
- [ ] Static asset serving
  - CSS, JavaScript, images
  - Cache headers for production

**Week 3: API Client and Route Guards**
- [ ] API client abstraction
  - `apiClient.get(path, options)`
  - `apiClient.post(path, body, options)`
  - Automatic JWT injection from session
  - Error normalization
  - Timeout handling
- [ ] Route guard middleware
  - `requireLogin()` - ensure authenticated
  - `requireAdmin()` - ensure admin role
  - Redirect to login if not authenticated
  - Show access denied if insufficient role
- [ ] Auth exchange on login
  - After GitHub OAuth, call API `/auth/exchange`
  - Store returned JWT in session
  - Handle exchange failures gracefully

**Week 4: Frontend Factory and Polish**
- [ ] `createFrontendApp(config)` factory function
  - Session setup
  - OAuth configuration
  - View engine setup
  - Static middleware
  - Auth routes (`/auth/*`)
  - Logout route (`/auth/logout`)
- [ ] Admin route mounting
  - Admin area at `/admin`
  - Admin guards on all admin routes
- [ ] Error handling middleware
  - Render error pages for 404, 500
  - Friendly error messages from API failures
- [ ] Configuration validation
- [ ] Package documentation (README, API reference)
- [ ] Test coverage report

#### Exit Criteria
- Factory function creates configured Express router
- GitHub OAuth works end-to-end (can log in)
- Sessions persist across requests
- API client can make authenticated calls
- View templates render correctly
- Documentation exists for all public APIs

---

### Phase 1 Exit Criteria (Overall)

All three core packages must:
- [ ] Export working factory functions
- [ ] Have > 80% test coverage
- [ ] Have comprehensive documentation
- [ ] Follow consistent patterns and conventions
- [ ] Be installable as npm packages

**Dependencies Ready for Phase 2:**
- Packages can be imported by demo apps
- Auth flow works end-to-end conceptually
- All building blocks exist for demo implementation

---

## Phase 2: Demo Applications 🔴 NOT STARTED

**Goal:** Build working demo apps that showcase all platform patterns

**Estimated Time:** 4-6 weeks

### Phase 2.1: Database and Schema (Week 1)

**Goal:** Set up a local MSSQL test database with example schema

#### Deliverables
- [ ] Docker Compose for local MSSQL
- [ ] Schema migration scripts
  - Users table
  - Example domain tables (e.g., tasks, projects)
  - Admin audit log table
- [ ] Stored procedure examples
  - `usp_GetUserTasks` - fetch tasks for user
  - `usp_CreateTask` - insert new task
  - `usp_GetAdminStats` - admin dashboard data
- [ ] Seed data script for testing
- [ ] Documentation for running database locally

---

### Phase 2.2: demo-api Implementation (Week 2-3)

**Goal:** Implement example API application using api-core

#### Deliverables

**Week 2: API Setup and Auth**
- [ ] `apps/demo-api/index.js` - Entry point
  - Import and configure `createApiApp()`
  - Mount API routes
  - Start server
- [ ] Configuration
  - Environment variables (`.env.example`)
  - JWT keys (generate RSA keys for testing)
  - Database connection config
  - GitHub org/team config for access control
- [ ] `/auth/exchange` endpoint implementation
  - Validate GitHub user
  - Check org/team membership
  - Assign roles (admin allowlist)
  - Return JWT
- [ ] Health endpoints
  - `/health` - basic health
  - `/health/db` - database connectivity

**Week 3: Domain Routes**
- [ ] `/api/tasks` routes
  - `GET /api/tasks` - list user's tasks
  - `POST /api/tasks` - create task
  - `PUT /api/tasks/:id` - update task
  - `DELETE /api/tasks/:id` - delete task
- [ ] `/api/admin/stats` route
  - Requires admin role
  - Returns dashboard statistics
- [ ] Authorization enforcement
  - All routes require valid JWT
  - Admin routes require admin role
- [ ] Error handling examples
  - Database errors
  - Validation errors
  - Authorization failures
- [ ] API documentation (OpenAPI/Swagger optional)

#### Exit Criteria
- API server starts and connects to database
- Auth exchange works with valid GitHub identity
- CRUD operations work for domain objects
- Role-based access control enforced
- Clear examples of all api-core patterns

---

### Phase 2.3: demo-web Implementation (Week 4-5)

**Goal:** Implement example frontend application using frontend-core

#### Deliverables

**Week 4: Frontend Setup and Auth**
- [ ] `apps/demo-web/index.js` - Entry point
  - Import and configure `createFrontendApp()`
  - Mount custom routes
  - Start server
- [ ] Configuration
  - Environment variables (`.env.example`)
  - GitHub OAuth app credentials
  - Session secret
  - API base URL
- [ ] OAuth flow testing
  - Login redirects to GitHub
  - Callback handles token exchange
  - Session established after login
  - JWT obtained from API
- [ ] Basic pages
  - `/` - Home page (public)
  - `/login` - Login page
  - `/dashboard` - User dashboard (requires login)

**Week 5: Domain Features and Admin**
- [ ] Task management views
  - `/tasks` - List tasks (calls API)
  - `/tasks/new` - Create task form
  - `/tasks/:id` - Edit task form
  - Form submissions → API calls → redirect
- [ ] Admin area
  - `/admin` - Admin dashboard
  - Calls `/api/admin/stats`
  - Shows role-based access control
- [ ] View template examples
  - Custom layouts extending frontend-core base
  - Partial templates for reusable components
  - Forms with CSRF protection
- [ ] Error handling
  - API errors rendered as user-friendly messages
  - Validation errors on forms
  - 404 and 500 pages

#### Exit Criteria
- Frontend server starts and serves pages
- Users can log in via GitHub OAuth
- Frontend successfully calls API with JWT
- CRUD operations work through UI
- Admin area demonstrates role-based access
- All frontend-core patterns are showcased

---

### Phase 2.4: Integration Testing (Week 6)

**Goal:** End-to-end testing of the full stack

#### Deliverables
- [ ] Integration test suite
  - Login flow test (OAuth mock)
  - API call flow test
  - Admin access test
  - Unauthorized access test
- [ ] Docker Compose for full stack
  - MSSQL database
  - demo-api
  - demo-web
  - Environment variables configured
- [ ] README for running demo
  - Setup instructions
  - Environment configuration
  - Running locally
  - Testing the flows
- [ ] Recorded demo walkthrough
  - Screenshots or video
  - Shows login, CRUD, admin access
  - Documents expected behavior

#### Exit Criteria
- Full stack runs with `docker-compose up`
- All major flows work end-to-end
- Demo can be shown to others
- Documentation allows others to run the demo

---

## Phase 3: Documentation and Polish 🔴 NOT STARTED

**Goal:** Finalize all documentation and ensure consistency

**Estimated Time:** 2-3 weeks

### Deliverables

**Week 1: Package Documentation**
- [ ] Finalize README.md for each package
  - Installation instructions
  - API reference
  - Usage examples
  - Configuration options
- [ ] Add CHANGELOG.md for each package
- [ ] Add CONTRIBUTING.md guidelines
- [ ] Document testing strategies
- [ ] Document environment variables

**Week 2: Architecture Documentation**
- [ ] Finalize draft_PROJECT_OUTLINE.md
  - Update with lessons learned
  - Add diagrams if helpful
- [ ] Create ARCHITECTURE.md
  - Component interaction diagrams
  - Data flow diagrams
  - Sequence diagrams for auth flow
- [ ] Create SECURITY.md
  - Security model explanation
  - Threat model
  - Best practices
  - Vulnerability reporting

**Week 3: Developer Experience**
- [ ] Update DEVELOPMENT_GUIDE.md
  - Getting started for new developers
  - Common tasks and recipes
  - Troubleshooting guide
  - FAQ
- [ ] Create DEPLOYMENT.md
  - Deployment patterns
  - Environment configuration
  - CI/CD recommendations
  - Production considerations
- [ ] Create UPGRADE_GUIDE.md
  - How to upgrade package versions
  - Breaking changes
  - Migration strategies

### Exit Criteria
- All packages have complete documentation
- New developer can get started in < 30 minutes
- All patterns are documented with examples
- No "undocumented magic"

---

## Phase 4: Production Readiness 🔴 NOT STARTED

**Goal:** Ensure platform is production-ready

**Estimated Time:** 2-3 weeks

### Deliverables

**Week 1: Production Patterns**
- [ ] Redis session store integration
- [ ] Production logging patterns
  - JSON structured logs
  - Log aggregation
  - Request ID propagation
- [ ] Monitoring and observability
  - Metrics endpoints (Prometheus format)
  - Health check best practices
  - Application insights hooks
- [ ] Configuration management
  - Environment-based config
  - Secrets management patterns
  - Config validation

**Week 2: Security Hardening**
- [ ] Security audit of all packages
- [ ] Rate limiting middleware
- [ ] CSRF protection implementation
- [ ] Security headers (Helmet.js)
- [ ] Input validation and sanitization
- [ ] SQL injection prevention verification
- [ ] XSS prevention verification
- [ ] Dependency security audit

**Week 3: Performance and Reliability**
- [ ] Performance testing
  - Load testing patterns
  - Response time benchmarks
- [ ] Error recovery patterns
  - Circuit breakers
  - Retry logic
  - Graceful degradation
- [ ] Database patterns
  - Connection pool tuning
  - Query optimization guidelines
  - Migration strategies
- [ ] Production deployment checklist
- [ ] Runbook for common issues

### Exit Criteria
- Platform passes security audit
- All production concerns addressed
- Performance characteristics documented
- Real applications can be deployed to production

---

## Phase Dependencies

```
Phase 0 (Setup & Docs)
    ↓
Phase 1.1 (shared-core) ✅ COMPLETE
    ↓
    ├─→ Phase 1.2 (api-core) 🔴
    └─→ Phase 1.3 (frontend-core) 🔴
            ↓
    Phase 2.1 (Database) 🔴
            ↓
    Phase 2.2 (demo-api) 🔴
            ↓
    Phase 2.3 (demo-web) 🔴
            ↓
    Phase 2.4 (Integration) 🔴
            ↓
    Phase 3 (Documentation) 🔴
            ↓
    Phase 4 (Production) 🔴
```

**Note:** Phases 1.2 and 1.3 can be developed in parallel if desired.

---

## Resuming After a Break

If you step away and need to remember where you left off:

1. **Check this document** - Find the current phase
2. **Read MILESTONES.md** - See the detailed checklist
3. **Check git status** - See uncommitted work
4. **Check recent commits** - See what was last completed
5. **Run tests** - Verify everything still works
6. **Read package README** - Refresh on current package API

Each phase is designed to be self-contained, so you can always pick up where you left off.

---

## Adjusting the Plan

This plan is flexible. As you work, you may discover:
- Tasks that are easier than expected (great!)
- Tasks that are harder than expected (adjust estimates)
- New requirements (add phases or tasks)
- Better approaches (refactor and document why)

**Update this document** as you learn. The plan serves you, not the other way around.

---

**Document Status:** ✅ Finalized  
**Last Updated:** 2025-12-22  
**Current Phase:** Phase 1.1 (complete), Phase 1.2/1.3 next
