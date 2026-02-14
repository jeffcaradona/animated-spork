# Contributing to animated-spork

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/animatedspork/animated-spork.git
   cd animated-spork
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify everything works:**
   ```bash
   npm test
   npm run lint
   ```

## Code Standards

### Linting

All code must pass ESLint:

```bash
# Check for issues
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Testing

- **Unit tests must pass:** `npm test`
- **Coverage must be maintained:** `npm run coverage`
- **No `console.log` in production code** (use logger instead)

### Security

- **Security scans must pass:** `npm run snyk` (if available)
- **No sensitive data in code**  use environment variables
- **Follow security guidelines** in [.github/instructions/snyk_rules.instructions.md](.github/instructions/snyk_rules.instructions.md)

## Git Workflow

### Branching Strategy

- **main**: Production-ready code, protected branch
- **feature/\***: Feature branches for new functionality
- **bugfix/\***: Bugfix branches for fixing issues
- **docs/\***: Documentation improvements

### Pull Workflow

When pulling changes from `main` into your feature branch, use **merge**:

```bash
git pull origin main
```

This is safer for collaborative branches and avoids rebase conflicts.

### Push Workflow

Push your feature branch normally:

```bash
git push origin <branch-name>
```

If you encounter a rejected push:

1. Pull first: `git pull origin main`
2. Resolve any conflicts locally
3. Push again: `git push origin <branch-name>`

### When to Force-Push

Only force-push with lease if you **intentionally rebased** before opening a PR:

```bash
git push origin <branch-name> --force-with-lease
```

 **Never force-push after others have pulled your branch.**

### Before Submitting a PR

1. **Update your branch:**
   ```bash
   git pull origin main
   ```

2. **Run all tests and checks:**
   ```bash
   npm test
   npm run coverage
   npm run lint
   ```

3. **Check code quality with SonarQube** (if available in your setup):
   ```bash
   npm run sonar
   ```

4. **Make a descriptive PR with:**
   - Clear title
   - Summary of changes
   - Link to related issues
   - Screenshots (if UI changes)

## Monorepo Structure

This is a monorepo with the following packages:

- **`packages/shared`**  Shared utilities, logging, JWT, error handling
- **`packages/app`**  Express application factory
- **`dev-app`**  Development demo application

### Running Tests and Coverage

For the **whole workspace:**

```bash
npm test              # Run all tests
npm run coverage      # Generate coverage reports
```

For **specific packages:**

```bash
npm run test:shared   # Test @animated-spork/shared
npm run test:app      # Test @animated-spork/app
npm run coverage      # Coverage for all packages
```

## Making Changes to Packages

### Changes to `packages/shared`

- Utility functions affecting all consumers
- Authentication, logging, error handling
- Test with: `npm run test:shared`
- Verify with: `npm run coverage:shared`

### Changes to `packages/app`

- Express application factory
- Middleware, routes, error handlers
- Test with: `npm run test:app`
- Verify with: `npm run coverage:app`

### Changes to `dev-app`

- Demo application only
- Test with: `npm run dev` then verify `http://localhost:3000`
- Must not break workspace tests: `npm test`

## Commit Message Guidelines

Follow conventional commits for clarity:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Scopes:** `shared`, `app`, `dev-app`, `config`, `readme`

**Examples:**

```
feat(app): add plugin system documentation
fix(shared): handle JWT expiration correctly
docs(readme): update installation instructions
test(app): add error handler tests
```

## Code Style

- **Spacing:** 2 spaces (configured in ESLint)
- **Semicolons:** Always required (ESLint enforced)
- **Quotes:** Single quotes for strings (ESLint enforced)
- **Max line length:** 100 characters (guideline)

## Documentation

When making changes:

1. **Update relevant README files:**
   - [README.md](README.md)  Main project documentation
   - [packages/shared/README.md](packages/shared/README.md)  Shared utilities API
   - [packages/app/README.md](packages/app/README.md)  App factory API
   - [dev-app/DEV_APP_README.md](dev-app/DEV_APP_README.md)  Dev guide

2. **Update CHANGELOG.md** (if creating a release):
   - Link to GitHub issues/PRs
   - Note breaking changes clearly

3. **Document public APIs** with JSDoc comments:
   ```js
   /**
    * Creates a new logger instance.
    * @param {object} options - Configuration options
    * @param {string} options.name - Logger name
    * @returns {Logger} Winston logger instance
    */
   export function createLogger(options) { ... }
   ```

## Reporting Issues

Before opening an issue, check if it already exists. When opening a new issue:

- Use a descriptive title
- Provide steps to reproduce
- Include error messages and logs
- Mention Node.js version: `node --version`
- Mention OS (Windows, macOS, Linux)

## Asking Questions

For questions, use GitHub Discussions or reach out to:
- **Author:** Jeff Caradona <jeffcaradona@gmail.com>

## License

By contributing, you agree that your contributions will be licensed under [MIT](LICENSE).

## Questions?

If you have questions about contributing:

1. Check [README.md](README.md) for project overview
2. Check [dev-app/DEV_APP_README.md](dev-app/DEV_APP_README.md) for development setup
3. Review existing code in the relevant package
4. Open an issue to ask for clarification
