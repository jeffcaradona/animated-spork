# Quick Reference Guide

**Use this when:** You're returning to the project after time away and need to quickly orient yourself.

---

## 🎯 What Am I Building?

A **reusable Express platform** with:
- GitHub OAuth authentication
- JWT-based API authorization
- Package-based architecture (no template drift)
- Production-ready patterns

**Read more:** [PROJECT_GOALS.md](./PROJECT_GOALS.md)

---

## 📍 Where Am I Right Now?

**Current Phase:** Phase 1 - Core Packages Implementation  
**Current Milestone:** Milestone 2 (api-core) or Milestone 3 (frontend-core)  
**Last Completed:** Milestone 1 (shared-core) ✅

**Check detailed status:** [MILESTONES.md](./MILESTONES.md)

---

## ✅ What's Done?

- [x] Project setup and documentation
- [x] shared-core package (logging, debugging)
  - 90%+ test coverage
  - Full documentation
  - Tests with Mocha/Chai/Sinon

**Still To Do:**
- [ ] api-core (JWT, MSSQL, API factory)
- [ ] frontend-core (OAuth, sessions, views)
- [ ] demo-api application
- [ ] demo-web application

---

## 🚀 What Should I Do Next?

### If Starting New Work

1. Check [MILESTONES.md](./MILESTONES.md) - Find unchecked items in current milestone
2. Read [PHASES.md](./PHASES.md) - Understand current phase requirements
3. Create feature branch: `git checkout -b feature/name`
4. Write tests first (TDD)
5. Implement feature
6. Test and lint: `npm run lint && npm test`
7. Commit and update MILESTONES.md

### If Resuming After Break

**Short break (< 1 week):**
```bash
git pull origin main
git status  # Check uncommitted work
# Read current milestone in MILESTONES.md
npm test    # Verify environment
```

**Long break (> 2 weeks):**
1. Re-read [PROJECT_GOALS.md](./PROJECT_GOALS.md)
2. Review [PHASES.md](./PHASES.md)
3. Check [MILESTONES.md](./MILESTONES.md)
4. `npm install` to update dependencies
5. Run tests to verify setup
6. Start with small task to rebuild momentum

---

## 📦 Package Status at a Glance

| Package | Status | Coverage | Documentation |
|---------|--------|----------|---------------|
| shared-core | ✅ Complete | 90%+ | ✅ Excellent |
| api-core | 🔴 Stub | - | 📝 Planned |
| frontend-core | 🔴 Stub | - | 📝 Planned |
| demo-api | 🔴 Stub | - | 📝 Planned |
| demo-web | 🔴 Stub | - | 📝 Planned |

---

## 🎯 Current Priorities

### Priority 1: api-core (Weeks 1-4)
- JWT authentication (sign, verify)
- MSSQL integration (connection pool, stored procs)
- API factory function
- `/auth/exchange` endpoint

**Start here:** [PHASES.md - Phase 1.2](./PHASES.md#phase-12-api-core-package-🔴-not-started)

### Priority 2: frontend-core (Weeks 1-4, can parallel)
- GitHub OAuth integration
- Session management
- Eta view engine and templates
- API client wrapper

**Start here:** [PHASES.md - Phase 1.3](./PHASES.md#phase-13-frontend-core-package-🔴-not-started)

---

## 💡 Key Patterns to Remember

### Testing
- Use Mocha + Chai + Sinon
- Follow patterns in `packages/shared-core/tests/`
- Aim for >80% coverage
- Use test helpers for isolation

### Documentation
- JSDoc on all public functions
- File header comments
- Usage examples in README
- Update MILESTONES.md as you go

### Code Style
- ES Modules (import/export)
- Async/await over callbacks
- Const/let, no var
- ESLint enforces style

---

## 🔍 Finding Information Fast

| Need to Know | Look Here |
|--------------|-----------|
| What we're building | [PROJECT_GOALS.md](./PROJECT_GOALS.md) |
| Why we made design decisions | [draft_PROJECT_OUTLINE.md](./draft_PROJECT_OUTLINE.md) |
| Current phase details | [PHASES.md](./PHASES.md) |
| What's done vs. what's next | [MILESTONES.md](./MILESTONES.md) |
| How to do common tasks | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) |
| Package API reference | Package `README.md` files |
| How to test | Package `tests/` directories |

---

## ⚡ Common Commands

```bash
# Testing
npm run test:shared-core
npm run coverage:shared-core

# Linting
npm run lint
npm run lint:fix

# Git
git status
git log --oneline -10
git checkout -b feature/name

# Package work
cd packages/shared-core
npm test
```

---

## 🆘 I'm Lost, Help!

### Quick Reset
```bash
# 5-minute orientation
1. Read PROJECT_GOALS.md (10 min)
2. Check MILESTONES.md current status (2 min)
3. Read current phase in PHASES.md (5 min)
4. Look at current package README (5 min)
5. You're oriented! Pick a task and start.
```

### Full Reset (After Long Break)
```bash
# 40-minute full refresh
1. PROJECT_GOALS.md - Remember the why (10 min)
2. draft_PROJECT_OUTLINE.md - Remember architecture (15 min)
3. PHASES.md - Remember the plan (10 min)
4. MILESTONES.md - See where we are (5 min)
5. Current package README - Understand current work (10 min)
6. Run tests - Verify environment works
7. Pick small task - Build momentum
```

---

## 📊 Progress Snapshot

**Started:** December 2025  
**Target Completion:** June 2026 (6 months, part-time)  
**Current Progress:** 22% complete (Phase 0 + Phase 1.1)  

**Milestones:**
- ✅ Milestone 0: Project Foundation
- ✅ Milestone 1: shared-core Package  
- 🎯 Milestone 2: api-core Package ← **YOU ARE HERE**
- 🔜 Milestone 3: frontend-core Package
- 🔜 Milestones 4-9: Apps, docs, production

---

## 🎓 Learning Resources

### Example of Great Code
Look at `packages/shared-core/` for:
- Test structure and patterns
- Documentation style
- Code organization
- Export patterns

### Patterns to Follow
- **Tests:** `packages/shared-core/tests/`
- **Docs:** `packages/shared-core/documentation/`
- **API:** `packages/shared-core/README.md`

---

## 🎯 Success Metrics

You're on track if:
- ✅ Tests pass
- ✅ Coverage > 80%
- ✅ ESLint passes
- ✅ Documentation exists
- ✅ MILESTONES.md is updated
- ✅ You can explain what you built

You need to pause and refocus if:
- ❌ Not sure what you're building
- ❌ No tests written
- ❌ Can't run existing tests
- ❌ Haven't updated docs in weeks

---

## 💪 Motivation

This is a **big project**. That's okay!

- Work in **small chunks** (1-2 hour sessions)
- **Celebrate** each checked box in MILESTONES.md
- **Document** so you can pause anytime
- **Trust the process** - it's all mapped out
- **Remember:** Slow progress is still progress

You've got this! 🚀

---

**Next Action:** Check [MILESTONES.md](./MILESTONES.md) and pick the next unchecked item.

**Last Updated:** 2025-12-22  
**Current Phase:** Phase 1.2 or 1.3 (your choice!)
