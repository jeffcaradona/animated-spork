# animated-spork

Building an opinionated, composable Express-based platform with standardized authentication, authorization, and database patterns.

## 🎯 What Is This?

A **reusable, package-based architecture** that provides:

- **Standardized GitHub OAuth** authentication
- **JWT-based** service-to-service authorization
- **Backend-For-Frontend (BFF)** pattern for security
- **Composable npm packages** to prevent template drift
- **Production-ready patterns** for Express applications

## 📦 Packages

| Package | Status | Description |
|---------|--------|-------------|
| **[@animated-spork/shared-core](./packages/shared-core)** | 🟡 Phase 1 | Common utilities (logging, debugging; more to come) |
| **[@animated-spork/api-core](./packages/api-core)** | 🔴 Planned | API server factory with JWT and MSSQL |
| **[@animated-spork/frontend-core](./packages/frontend-core)** | 🔴 Planned | Frontend server factory with OAuth and sessions |

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/jeffcaradona/animated-spork.git
cd animated-spork
npm install

# Run tests
npm run test:shared-core

# Lint code
npm run lint
```

## 📚 Documentation

### Start Here (Essential Reading)

1. **[PROJECT_GOALS.md](./documentation/PROJECT_GOALS.md)** - What we're building and why (10 min read)
2. **[DEVELOPMENT_GUIDE.md](./documentation/DEVELOPMENT_GUIDE.md)** - How to get started developing (15 min read)
3. **[PHASES.md](./documentation/PHASES.md)** - Implementation plan and roadmap (10 min read)
4. **[MILESTONES.md](./documentation/MILESTONES.md)** - Detailed progress tracking (5 min read)

### Architecture & Design

- **[draft_PROJECT_OUTLINE.md](./documentation/draft_PROJECT_OUTLINE.md)** - Complete architectural overview
  - Auth flows (GitHub OAuth + JWT)
  - Package structure and responsibilities
  - Security model
  - Design decisions

### Project Status (as of 2025-12-22)

**Current Phase:** Phase 1 - Core Packages Implementation  
**Progress:** 1/3 packages complete (shared-core ✅)  
**Next Up:** api-core (JWT + MSSQL) or frontend-core (OAuth + sessions)

See [MILESTONES.md](./documentation/MILESTONES.md) for detailed progress.

## 🏗️ Project Structure

```
animated-spork/
├── packages/
│   ├── shared-core/      # ✅ Common utilities (COMPLETE)
│   ├── api-core/         # 🔴 API factory (planned)
│   └── frontend-core/    # 🔴 Frontend factory (planned)
├── apps/
│   ├── demo-api/         # 🔴 Example API app (planned)
│   └── demo-web/         # 🔴 Example frontend app (planned)
└── documentation/        # Project documentation
    ├── PROJECT_GOALS.md
    ├── PHASES.md
    ├── MILESTONES.md
    ├── DEVELOPMENT_GUIDE.md
    └── draft_PROJECT_OUTLINE.md
```

## 🎓 For New Developers

**Never seen this project before?** Here's your 40-minute onboarding:

1. Read [PROJECT_GOALS.md](./documentation/PROJECT_GOALS.md) - Understand the vision
2. Read [draft_PROJECT_OUTLINE.md](./documentation/draft_PROJECT_OUTLINE.md) - Understand the architecture
3. Read [DEVELOPMENT_GUIDE.md](./documentation/DEVELOPMENT_GUIDE.md) - Start developing
4. Look at [shared-core](./packages/shared-core) - See a complete, documented package

## 🔑 Key Design Principles

### 1. Packages, Not Templates
We distribute **versioned npm packages**, not project templates. This prevents "template drift" where copied code diverges over time.

### 2. Factory Pattern
Core packages export **factory functions** that return configured Express routers, giving apps full control of the lifecycle.

### 3. Security by Default
- Authentication enforced at **both** frontend (UX) and API (security)
- JWT tokens stored **server-side only** (never exposed to browser)
- Browser **never** talks directly to API (BFF pattern)

### 4. Separation of Concerns
- **Frontend**: UX, sessions, rendering, OAuth flow
- **API**: Data access, authorization, business rules
- **Shared-Core**: Framework-agnostic utilities

## 🏆 What Makes This Different?

### Traditional Approach (Template-Based)
```
Copy starter files → Customize → Update template → Manual updates
❌ Template drift - projects diverge
❌ Security patches require manual updates
❌ Improvements don't propagate
```

### Our Approach (Package-Based)
```
Import packages → Compose → Update package versions
✅ Centralized updates via version bumps
✅ Security patches propagate automatically
✅ Apps compose, don't copy
```

## 📊 Current Status

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 0: Setup & Docs | ✅ Complete | 100% |
| Phase 1: Core Packages | 🟡 In Progress | 33% (1/3 packages) |
| Phase 2: Demo Apps | 🔴 Not Started | 0% |
| Phase 3: Documentation | 🔴 Not Started | 0% |
| Phase 4: Production | 🔴 Not Started | 0% |

**Overall Progress:** ~22% complete

## 🛠️ Development

### Available Commands

```bash
# Testing
npm run test:shared-core          # Run shared-core tests
npm run coverage:shared-core      # Run with coverage report

# Linting
npm run lint                      # Check all files
npm run lint:fix                  # Auto-fix linting issues
```

### Contributing

This is a personal project by [@jeffcaradona](https://github.com/jeffcaradona). If you'd like to contribute or use these patterns in your own work, feel free to fork and adapt!

## 📖 Learn More

- **Architecture Details**: [draft_PROJECT_OUTLINE.md](./documentation/draft_PROJECT_OUTLINE.md)
- **Implementation Plan**: [PHASES.md](./documentation/PHASES.md)
- **Progress Tracking**: [MILESTONES.md](./documentation/MILESTONES.md)
- **Getting Started**: [DEVELOPMENT_GUIDE.md](./documentation/DEVELOPMENT_GUIDE.md)
- **Security Scanning**: [SNYK_SETUP.md](./documentation/SNYK_SETUP.md) - Snyk integration setup

## 📝 License

ISC License - See [LICENSE](./LICENSE) file for details.

---

**Built with:** Node.js • Express • JWT • Eta • Winston • MSSQL  
**Maintained by:** Jeff Caradona ([@jeffcaradona](https://github.com/jeffcaradona))
