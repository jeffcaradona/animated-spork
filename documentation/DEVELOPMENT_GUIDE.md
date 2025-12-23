# Development Guide

Welcome! This guide will help you get started working on the animated-spork project.

---

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/jeffcaradona/animated-spork.git
cd animated-spork

# 2. Install dependencies
npm install

# 3. Run tests
npm run test:shared-core

# 4. Lint the code
npm run lint
```

That's it! You're ready to start developing.

---

## Project Structure

```
animated-spork/
├── packages/              # Core reusable packages
│   ├── shared-core/      # ✅ Common utilities (COMPLETE)
│   ├── frontend-core/    # 🔴 Frontend factory (stub)
│   └── api-core/         # 🔴 API factory (stub)
├── apps/                 # Demo applications
│   ├── demo-web/         # 🔴 Frontend demo (stub)
│   └── demo-api/         # 🔴 API demo (stub)
├── documentation/        # Project documentation
│   ├── PROJECT_GOALS.md           # What we're building
│   ├── PHASES.md                  # How we're building it
│   ├── MILESTONES.md              # Progress tracking
│   ├── DEVELOPMENT_GUIDE.md       # This file
│   └── draft_PROJECT_OUTLINE.md   # Architecture details
├── package.json          # Root workspace config
└── eslint.config.js      # Linting configuration
```

---

## Understanding the Project

Before diving into code, read these documents **in order**:

1. **[PROJECT_GOALS.md](./PROJECT_GOALS.md)** (10 min)
   - Understand what we're building and why
   - Learn the core principles
   - See the success criteria

2. **[draft_PROJECT_OUTLINE.md](./draft_PROJECT_OUTLINE.md)** (15 min)
   - Understand the architecture
   - Learn the auth flow
   - See the package structure

3. **[PHASES.md](./PHASES.md)** (10 min)
   - Understand the implementation plan
   - See what's done vs. what's next
   - Learn the phase dependencies

4. **[MILESTONES.md](./MILESTONES.md)** (5 min)
   - See detailed checklists
   - Track progress
   - Find what to work on next

**Total Reading Time:** ~40 minutes (well worth it!)

---

## Current State (As of 2025-12-22)

### What's Complete ✅

**`packages/shared-core`** - Fully implemented
- Debug utility (`createDebugger`)
- Logger utility (`createLogger`)
- 90%+ test coverage
- Comprehensive documentation

**Project Documentation** - Finalized
- Goals, phases, milestones documented
- Architecture documented
- Ready for next phase

### What's Next 🚀

**`packages/api-core`** - Priority #1
- JWT authentication and authorization
- MSSQL integration
- API factory function
- See [PHASES.md Phase 1.2](./PHASES.md#phase-12-api-core-package-🔴-not-started) for details

**`packages/frontend-core`** - Can be done in parallel
- GitHub OAuth integration
- Session management
- View rendering with Eta
- API client wrapper
- See [PHASES.md Phase 1.3](./PHASES.md#phase-13-frontend-core-package-🔴-not-started) for details

---

## Development Workflow

### Starting a New Feature

1. **Read the phase documentation** for what you're building
2. **Check MILESTONES.md** for the specific deliverables
3. **Create a feature branch**
   ```bash
   git checkout -b feature/api-core-jwt
   ```
4. **Write tests first** (TDD approach)
5. **Implement the feature**
6. **Verify with tests and linting**
   ```bash
   npm run lint
   npm run test:shared-core  # or appropriate test command
   ```
7. **Commit with clear messages**
   ```bash
   git commit -m "Add JWT generation utility"
   ```
8. **Update MILESTONES.md** to check off completed items

### Daily Development Loop

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Make your changes
# ... edit files ...

# 4. Test as you go
npm run test:shared-core  # or other test commands

# 5. Lint before committing
npm run lint

# 6. Fix any linting errors
npm run lint:fix

# 7. Commit your work
git add .
git commit -m "Descriptive message"
git push origin your-branch
```

### Testing Your Changes

```bash
# Test a specific package
npm run test:shared-core

# Run with coverage
npm run coverage:shared-core

# Lint everything
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Package-Specific Commands

Each package has its own scripts. From the package directory:

```bash
# Example: Working on shared-core
cd packages/shared-core

# Run tests
npm test

# Run with coverage
npm run coverage

# Watch mode (if available)
npm run test:watch
```

---

## Code Style and Conventions

### JavaScript Style

- **ES Modules:** Use `import`/`export` (no CommonJS)
- **Async/Await:** Prefer over callbacks or raw promises
- **Arrow Functions:** Use for callbacks and short functions
- **Const/Let:** No `var` (ESLint enforces this)
- **Semicolons:** Use them (ESLint enforces this)

### Documentation Style

- **JSDoc:** All public functions must have JSDoc comments
- **File Headers:** Every file should have a header comment explaining its purpose
- **Inline Comments:** Explain "why", not "what"
- **Examples:** Include usage examples in documentation

### Testing Style

- **Arrange-Act-Assert:** Structure tests clearly
- **Descriptive Test Names:** Use full sentences for `it()` descriptions
- **One Assertion Per Test:** Keep tests focused
- **Hermetic Tests:** Use helpers to isolate environment
- **Coverage:** Aim for >80% coverage on new code

### Example: Well-Documented Function

```javascript
/**
 * createDebugger(options)
 * Factory function for creating a namespaced debug function.
 *
 * The debug function uses the 'debug' npm package for environment-driven logging.
 * Namespace is constructed from the app name and an optional suffix.
 *
 * @param {object} [options] - Configuration options
 * @param {string} [options.name] - App name (defaults to package.json name)
 * @param {string} [options.namespaceSuffix] - Suffix for namespace (e.g., 'api')
 * @returns {function} A debug function compatible with the debug package
 *
 * @example
 * const debug = createDebugger({ name: 'myapp', namespaceSuffix: 'db' });
 * debug('Connection established'); // Logs if DEBUG=myapp:db:* is set
 */
function createDebugger({ name, namespaceSuffix } = {}) {
    // Implementation...
}
```

---

## Common Tasks

### Adding a New Dependency

```bash
# For a specific package
cd packages/shared-core
npm install some-package

# For the root (dev tools)
npm install --save-dev some-tool

# From repo root for a specific package
npm install some-package --workspace=packages/shared-core
```

### Creating a New Package

1. Create package directory: `packages/your-package/`
2. Create `package.json`:
   ```json
   {
     "name": "@animated-spork/your-package",
     "version": "0.0.1",
     "type": "module",
     "main": "index.js",
     "scripts": {
       "test": "mocha tests/**/*.spec.js --exit"
     }
   }
   ```
3. Create `index.js` with exports
4. Add to root `package.json` workspaces
5. Run `npm install` from root

### Setting Up a New Test Suite

1. Create `tests/` directory in package
2. Create `tests/helpers/index.js` with test utilities
3. Create `tests/*.spec.js` test files
4. Add test script to package.json
5. Add test command to root package.json
6. Follow patterns from `shared-core/tests/`

### Running Specific Tests

```bash
# Run all tests in a package
npm run test:shared-core

# Run a specific test file
npx mocha packages/shared-core/tests/logger.spec.js

# Run tests matching a pattern
npx mocha packages/shared-core/tests/**/*.spec.js --grep "debug"

# Run with debugging
npx mocha packages/shared-core/tests/**/*.spec.js --inspect-brk
```

---

## Troubleshooting

### "Module not found" Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Ensure all workspaces are installed
npm install --workspaces
```

### Tests Failing

```bash
# Check if it's your changes or pre-existing
git stash
npm run test:shared-core
# If tests pass, the issue is in your changes
git stash pop

# Run single test for debugging
npx mocha packages/shared-core/tests/logger.spec.js --grep "your test name"
```

### Linting Errors

```bash
# Auto-fix many issues
npm run lint:fix

# Check specific files
npx eslint packages/shared-core/src/debug.js

# See detailed error messages
npx eslint . --debug
```

### Import/Export Issues

- Ensure `"type": "module"` is in package.json
- Use `.js` extensions in imports: `import x from './file.js'`
- Use `export default` or named exports consistently
- Check for circular dependencies

### Environment Variable Issues

```bash
# Check what's set
env | grep DEBUG

# Set temporarily
DEBUG=myapp:* npm test

# Use cross-env for cross-platform
npx cross-env DEBUG=myapp:* npm test
```

---

## Working with Packages

### Understanding Workspaces

This project uses **npm workspaces** for monorepo management.

- All packages share the same `node_modules/` at root
- Dependencies are hoisted when possible
- `package-lock.json` tracks all workspace dependencies

### Installing Dependencies

```bash
# Install for all workspaces
npm install

# Install for specific workspace
npm install lodash --workspace=packages/shared-core

# Install dev dependency at root
npm install --save-dev mocha
```

### Running Scripts Across Workspaces

```bash
# Run script in specific workspace
npm run test --workspace=packages/shared-core

# Run script in all workspaces (if available)
npm run test --workspaces
```

### Linking Between Packages

Packages can depend on each other:

```json
// packages/api-core/package.json
{
  "dependencies": {
    "@animated-spork/shared-core": "*"
  }
}
```

Import like any npm package:
```javascript
import { createLogger } from '@animated-spork/shared-core';
```

---

## Documentation Guidelines

### When to Update Documentation

Update documentation when you:
- Add a new public API
- Change existing behavior
- Complete a milestone
- Learn something important
- Fix a tricky bug
- Add a new pattern

### Where to Document

| What | Where |
|------|-------|
| Package API | Package `README.md` |
| Architecture decisions | `draft_PROJECT_OUTLINE.md` |
| Implementation progress | `MILESTONES.md` |
| How-to guides | `DEVELOPMENT_GUIDE.md` (this file) |
| Security model | `SECURITY.md` (Phase 3) |
| Deployment info | `DEPLOYMENT.md` (Phase 3) |

### Documentation Checklist

When creating a new package:
- [ ] README.md with API reference
- [ ] JSDoc comments on all exports
- [ ] Usage examples
- [ ] Configuration documentation
- [ ] Test documentation
- [ ] Update root README.md

---

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation only
- `refactor/description` - Code refactoring
- `test/description` - Test additions/changes

### Commit Messages

Use clear, descriptive commit messages:

```
Good:
- "Add JWT generation utility to api-core"
- "Fix session expiration handling in frontend-core"
- "Update MILESTONES.md after completing Phase 1.2"

Bad:
- "fix stuff"
- "WIP"
- "update"
```

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Ensure linting passes
4. Update documentation
5. Push and create PR
6. Address review feedback
7. Merge when approved

---

## Resuming After a Break

### Short Break (< 1 week)

1. `git pull origin main` - Get latest changes
2. `git status` - Check for uncommitted work
3. Read current milestone in `MILESTONES.md`
4. Run tests to verify environment
5. Continue where you left off

### Long Break (> 2 weeks)

1. Re-read `PROJECT_GOALS.md` - Refresh on the why
2. Review `PHASES.md` - Remember the plan
3. Check `MILESTONES.md` - See current status
4. `npm install` - Update dependencies
5. Run all tests - Verify setup
6. Read current package README - Refresh on API
7. Check recent commits - See what changed
8. Start with small task - Build momentum

### If You're Completely Lost

Don't panic! Follow this sequence:

1. **PROJECT_GOALS.md** - What are we building?
2. **draft_PROJECT_OUTLINE.md** - How does it work?
3. **PHASES.md** - What's the plan?
4. **MILESTONES.md** - Where are we now?
5. **Current package README** - What am I working on?
6. **Tests** - What does the code do?

Take your time. This is a big project meant to be built incrementally.

---

## Getting Help

### Self-Service Resources

1. **Project Documentation** - Start here (see above)
2. **Package READMEs** - For package-specific info
3. **Tests** - Show how code is meant to be used
4. **Git History** - See how things evolved
5. **Draft PRs** - Document work in progress

### Key Files for Reference

- `packages/shared-core/` - Example of complete package structure
- `packages/shared-core/tests/` - Example of test patterns
- `packages/shared-core/documentation/` - Example of documentation structure

### Best Practices

- **Read before coding** - Saves time in the long run
- **Test as you go** - Catch issues early
- **Document as you go** - While it's fresh
- **Commit frequently** - Small commits are better
- **Update milestones** - Keep progress visible

---

## Tips for Success

### 1. Stay Focused on the Current Phase

Don't try to build everything at once. Focus on the current milestone.

### 2. Follow the Patterns from shared-core

`shared-core` is a complete, well-documented package. Use it as a template for:
- Test structure
- Documentation style
- Code organization
- Export patterns

### 3. Write Tests First (TDD)

Benefits:
- Clarifies what you're building
- Prevents regressions
- Makes refactoring easier
- Serves as documentation

### 4. Keep Changes Small

Small PRs are:
- Easier to review
- Less likely to break things
- Faster to merge
- Easier to revert if needed

### 5. Update Documentation as You Go

Don't leave it for later. Future you will thank present you.

### 6. Use the Milestone Checklists

Check off items as you complete them. It feels good and keeps you on track.

### 7. Don't Be Afraid to Refactor

If you discover a better approach:
1. Document why it's better
2. Update relevant documentation
3. Refactor with tests as safety net
4. Update this guide if needed

---

## Environment Setup

### Required Software

- **Node.js**: 20.x or higher
- **npm**: Comes with Node.js
- **Git**: For version control
- **Code Editor**: VS Code recommended

### VS Code Extensions (Recommended)

- **ESLint** - Linting support
- **Mocha Test Explorer** - Run tests from sidebar
- **GitLens** - Enhanced git support
- **JavaScript Debugger** - Built-in
- **EditorConfig** - Consistent formatting

### VS Code Settings (Recommended)

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript"],
  "files.eol": "\n"
}
```

### Environment Variables

The project uses environment variables for configuration. Each package/app has an `.env.example` file showing what's needed.

Never commit `.env` files with real credentials!

---

## Next Steps

Ready to start building? Here's what to do:

1. **Read PROJECT_GOALS.md** if you haven't already
2. **Check MILESTONES.md** to see current status
3. **Read PHASES.md** for current phase details
4. **Pick a task** from the current milestone
5. **Create a branch** for your work
6. **Write tests** for what you're building
7. **Implement** the feature
8. **Verify** with tests and linting
9. **Document** what you built
10. **Update MILESTONES.md** to check off completed items

---

## Appendix: Useful Commands

### npm Scripts

```bash
# Linting
npm run lint          # Check all files
npm run lint:fix      # Auto-fix issues

# Testing
npm run test:shared-core          # Run shared-core tests
npm run coverage:shared-core      # Run with coverage

# Workspace Management
npm install                       # Install all workspaces
npm install --workspaces         # Explicit workspace install
```

### Git Commands

```bash
# Branch Management
git checkout -b feature/my-feature    # Create branch
git branch -d feature/my-feature      # Delete branch
git push origin feature/my-feature    # Push branch

# Status and History
git status                # See changes
git log --oneline -10     # Recent commits
git diff                  # See unstaged changes

# Stashing
git stash                 # Stash changes
git stash pop             # Restore changes
git stash list            # List stashes
```

### Mocha Commands

```bash
# Run tests
npx mocha tests/**/*.spec.js              # All tests
npx mocha tests/debug.spec.js             # Specific file
npx mocha --grep "pattern"                # Match pattern
npx mocha --exit                          # Force exit

# Coverage
npx c8 mocha tests/**/*.spec.js           # With coverage
npx c8 --reporter=html mocha tests/**/*.spec.js  # HTML report
```

---

**Document Status:** ✅ Finalized  
**Last Updated:** 2025-12-22  
**For:** animated-spork developers
