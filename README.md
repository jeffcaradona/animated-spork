# animated-spork

An opinionated, production-ready template for building Express applications with built-in logging, authentication, error handling, and a plugin system for extensibility.

## Overview

`animated-spork` is a monorepo containing:

- **`@animated-spork/shared`** – Shared utilities, logging, JWT authentication, and error handling
- **`@animated-spork/app`** – Express application factory with pre-configured middleware and routing  
- **`dev-app`** – Development demo application showing real-world usage

Each package can be used independently or together as a cohesive system.

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/animatedspork/animated-spork.git
cd animated-spork

# Install dependencies (monorepo setup)
npm install
```

### Running the Demo Application

```bash
# Start in development mode (auto-restart on file changes)
npm run dev

# Or start in standard mode
npm start
```

Visit **http://localhost:3000** to see the demo application.

## Project Structure

```
animated-spork/
├── packages/
│   ├── app/                          # Express application factory
│   │   ├── README.md                 # API documentation
│   │   ├── CHANGELOG.md
│   │   ├── index.js                  # Public exports
│   │   └── src/
│   │       ├── app-factory.js        # createApp()
│   │       ├── server-factory.js     # createServer()
│   │       ├── config/               # Configuration utilities
│   │       ├── routes/               # Built-in routes (health, index, admin)
│   │       ├── middlewares/          # Error handling middleware
│   │       ├── errors/               # Error creators
│   │       ├── public/               # Static assets (CSS)
│   │       └── views/                # EJS templates (layouts, errors)
│   │
│   └── shared/                       # Shared utilities and core features
│       ├── README.md                 # API documentation
│       ├── index.js                  # Public exports
│       └── src/
│           ├── logger.js             # Winston logging
│           ├── debug.js              # Namespaced debug utility
│           ├── memory.js             # Memory monitoring
│           ├── vault.js              # Secure configuration storage
│           ├── auth/
│           │   └── jwt.js            # JWT generation and verification
│           ├── errors/               # Error classes
│           └── middlewares/
│               └── jwtAuth.js        # Express authentication middleware
│
├── dev-app/                          # Development demo application
│   ├── DEV_APP_README.md             # Development guide
│   ├── package.json
│   └── src/
│       ├── server.js                 # Application entry point
│       ├── app.js                    # Demo plugin
│       ├── config/env.js             # Config overrides
│       ├── routes/router.js          # Application-specific routes
│       ├── controllers/              # Request handlers
│       ├── models/                   # Data models
│       ├── utils/                    # Utilities
│       └── views/                    # Application templates
│
├── coverage/                         # Test coverage reports
├── logs/                             # Application logs
├── package.json                      # Root workspace config
├── eslint.config.js                  # ESLint configuration
├── sonar-project.properties          # SonarQube configuration
└── CONTRIBUTING.md                   # Contribution guidelines
```

## Available Packages

### [@animated-spork/shared](packages/shared/README.md)

Shared core utilities for the entire workspace.

**Features:**
- **Logging** — Winston-based structured logging
- **Debug** — Namespace-based debug utility
- **JWT Authentication** — Token generation, verification, and middleware
- **Error Handling** — Operational error classes with HTTP status codes
- **Memory Monitoring** — Process memory tracking
- **Vault** — Secure configuration storage

**Usage:**
```javascript
import { 
  createLogger, 
  generateToken, 
  jwtAuthMiddleware, 
  createAppError 
} from '@animated-spork/shared';

const logger = createLogger({ name: 'myapp' });
const token = generateToken(process.env.JWT_SECRET, '1h');
```

### [@animated-spork/app](packages/app/README.md)

Express application factory with built-in middleware, routing, and plugin system.

**Features:**
- **Application Factory** — Pre-configured Express app
- **Server Factory** — HTTP server with graceful shutdown
- **Built-in Routes** — Health checks, landing page, admin dashboard
- **Error Handling** — Standardized error responses
- **Plugin System** — Extend functionality without modifying core
- **Environment Config** — Secure configuration management

**Usage:**
```javascript
import { createApp, createServer, createConfig } from '@animated-spork/app';

const config = createConfig({ appName: 'My App', port: 3000 });
const app = createApp(config, [myPlugin]);
const { server, close } = createServer(app, config);
```

### [dev-app](dev-app/DEV_APP_README.md)

Demo application showing real-world usage patterns.

**Purpose:**
- Demonstrates how to compose `@animated-spork/app` with custom plugins
- Shows how to build application-specific routes and views
- Provides a local development environment for testing
- Serves as a template for consuming applications

**Access:**
- **http://localhost:3000** — Landing page
- **http://localhost:3000/health** — Health check
- **http://localhost:3000/admin** — Admin dashboard
- **http://localhost:3000/admin/config** — Configuration viewer

## Available Scripts

### Root Workspace Commands

```bash
# Development
npm run dev                 # Start demo app with auto-restart
npm start                   # Start demo app in standard mode

# Testing
npm test                    # Run all tests (shared + app)
npm run test:shared        # Run shared package tests
npm run test:app           # Run app package tests

# Coverage
npm run coverage            # Generate coverage for all packages
npm run coverage:shared    # Coverage for shared package
npm run coverage:app       # Coverage for app package

# Linting
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
```

### Package-Specific Commands

Each package has its own `package.json` with scripts:

```bash
# From packages/shared/
npm run test      # Tests for shared package
npm run coverage  # Coverage for shared package

# From packages/app/
npm run test      # Tests for app package
npm run coverage  # Coverage for app package
```

## Configuration

### Environment Variables

Configuration is managed through environment variables. Create a `.env` file in the repository root:

```env
# Application
NODE_ENV=development
APP_NAME=Demo App
PORT=3000

# Authentication & Security
JWT_SECRET=your-secret-key-here

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Debug (enable specific namespaces)
DEBUG=app:*
```

### Configuration Objects

When creating an app, pass a configuration object:

```javascript
const config = {
  appName: 'My Application',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  // ... other custom config
};

const app = createApp(config, plugins);
```

Sensitive keys (password, secret, token, key) are automatically filtered from logs.

## Building a Plugin

Plugins extend the core application with custom middleware and routes:

```javascript
// plugins/analytics.js
export function analyticsPlugin(app, config) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${duration}ms`);
    });
    next();
  });
}

// plugins/customRoutes.js
export function customRoutesPlugin(app, config) {
  app.get('/api/data', (req, res) => {
    res.json({ message: 'Hello from custom plugin' });
  });
}

// server.js
const app = createApp(config, [
  analyticsPlugin,
  customRoutesPlugin
]);
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Watch mode (by package)
npm run test:shared -- --watch
npm run test:app -- --watch
```

### Test Structure

Tests use **Mocha** for test framework and **Chai** for assertions:

```javascript
import { describe, it, expect } from 'chai';
import { createAppError } from '@animated-spork/shared';

describe('Error Handling', () => {
  it('should create validation error with correct status code', () => {
    const error = createAppError('VALIDATION', 'Invalid input', 400);
    expect(error.statusCode).to.equal(400);
  });
});
```

## Security & Compliance

This project follows security best practices:

- ✅ **SAST Scanning** — Code vulnerabilities detected with Snyk
- ✅ **Dependency Scanning** — Known vulnerabilities in dependencies checked
- ✅ **Component Analysis** — AI Bill of Materials (AIBOM) tracking
- ✅ **Code Quality** — ESLint and SonarQube analysis
- ✅ **Test Coverage** — Monitored and reported

### Security Rules

All new code follows the security guidelines in [.github/instructions/snyk_rules.instructions.md](.github/instructions/snyk_rules.instructions.md):

1. Run SAST scans on new code
2. Fix security issues before merging
3. Rescan after fixes to verify resolution

### Running Security Scans

```bash
# SAST code analysis
snyk code test

# Dependency scanning
snyk test

# Container scanning (if applicable)
snyk container test

# IaC scanning
snyk iac test
```

## Documentation

- **[packages/shared/README.md](packages/shared/README.md)** — Detailed API documentation for shared utilities
- **[packages/app/README.md](packages/app/README.md)** — Detailed API documentation for Express factory
- **[dev-app/DEV_APP_README.md](dev-app/DEV_APP_README.md)** — Development guide and demo patterns
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines

## Built-in Routes

The core `@animated-spork/app` provides these routes:

| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Landing page |
| `/health` | GET | Health check (200 OK) |
| `/admin` | GET | Admin dashboard |
| `/admin/config` | GET | Configuration viewer (filtered) |
| `*` | * | 404 handler for undefined routes |

## Error Handling

Errors are standardized with:
- Machine-readable `code`
- Human-readable `message`
- HTTP `statusCode`
- Flag for operational errors

```javascript
import { createValidationError, createNotFoundError } from '@animated-spork/app';

// Validation error (400)
throw createValidationError('Email is required');

// Not found error (404)
throw createNotFoundError('User not found');

// Generic error with custom code
throw createAppError('DB_ERROR', 'Database connection failed', 500);
```

## Publishing to npm

Each package can be published independently:

```bash
# Prepare for publishing
cd packages/app
npm publish --access public

# Or for scoped packages
npm publish --access public --registry https://registry.npmjs.org/
```

For monorepo publishing workflow, see the workspace setup in `package.json`.

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
PORT=8080 npm start

# Or find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Module Not Found

If importing from `@animated-spork/shared` or `@animated-spork/app` fails:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Tests Failing

```bash
# Clear any cached data
npm run coverage -- --clean

# Run specific test file
npm run test:app -- --grep "test name"
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Code style and formatting
- Commit message conventions
- Pull request process
- Testing requirements

## License

MIT — See [LICENSE](LICENSE) for details

## Author

Jeff Caradona &lt;jeffcaradona@gmail.com&gt;

## Repository

[https://github.com/animatedspork/animated-spork](https://github.com/animatedspork/animated-spork)
