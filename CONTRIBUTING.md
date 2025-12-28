# Contributing to animated-spork

## Git Workflow

### Branching Strategy

- **main**: Production-ready code, protected branch
- **feature/\***: Feature branches for new functionality
- **bugfix/\***: Bugfix branches for fixing issues

### Pull Workflow (Recommended)

When pulling changes from `main` into your feature branch, use **merge** instead of rebase:

```bash
git pull origin main
```

This is safer for collaborative branches and avoids rebase conflicts with the remote.

### Push Workflow

Push your feature branch normally:

```bash
git push origin <branch-name>
```

No force-push needed. If you encounter a rejected push:

1. Pull first: `git pull origin main`
2. Resolve any conflicts locally
3. Push again: `git push origin <branch-name>`

### When to Force-Push

Only force-push with lease if you **intentionally rebased** before opening a PR:

```bash
git push origin <branch-name> --force-with-lease
```

⚠️ **Never force-push after others have pulled your branch.**

### Before Submitting a PR

1. Ensure your branch is up-to-date:
   ```bash
   git pull origin main
   ```

2. Run all tests locally:
   ```bash
   npm run coverage:api-core
   npm run coverage:shared-core
   ```

3. Verify SonarLint findings in VS Code

4. Create a descriptive PR with:
   - Clear title
   - Summary of changes
   - Link to related issues

### Code Quality Standards

- ESLint must pass: `npm run lint`
- Tests must pass with >90% coverage
- SonarLint issues must be resolved
- No console.log statements in production code

### Monorepo Structure

This is a monorepo with the following packages:

- **packages/api-core**: Database abstraction layer
- **packages/shared-core**: Shared utilities

Changes to one package may affect others. Run full test suite before submitting:

```bash
npm install --ignore-scripts
npm run coverage:api-core
npm run coverage:shared-core
```