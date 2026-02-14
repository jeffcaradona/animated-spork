# Demo Application — Local Development Guide

> **Using the `dev-app/` directory for local development and testing**

This document explains how to use the `dev-app/` directory to run a demo application locally, which demonstrates how a consuming application would use the `@animated-spork/app` module in production.

---

## Overview

The `dev-app/` directory simulates a real-world consumer application (like a "Task Manager") that depends on the core `@animated-spork/app` module. It demonstrates:

- ✅ How to compose the core module with custom plugins
- ✅ How to provide application-specific routes and views
- ✅ How to override or extend configuration
- ✅ How a thin `server.js` entrypoint boots the composed application

**In production**, a consumer would install `@animated-spork/app` via npm:
```bash
npm install @animated-spork/app
```

**For local development**, the `dev-app/` directory imports directly from the local module:
```js
import { createApp, createServer, createConfig } from '@animated-spork/app';
```

This allows you to develop and test the core module alongside a demo application without publishing to npm.

---

## Directory Structure

```
dev-app/
├── DEV_APP_README.md          # This file
├── package.json               # Demo app metadata
└── src/
    ├── server.js              # Entrypoint — composes & boots the app
    ├── app.js                 # Demo plugin (custom routes/middleware)
    ├── config/
    │   └── env.js             # Demo-specific config overrides
    ├── routes/
    │   └── router.js          # Application routes
    ├── controllers/           # Request handlers
    ├── models/                # Data models
    ├── utils/                 # Utility functions
    └── views/                 # Application templates
```

---

## Running the Demo Application

### 1. Install Dependencies

From the **repository root**:

```bash
npm install
```

### 2. Start the Demo Server

**Option A: Standard mode**
```bash
npm start
```

**Option B: Development mode (with auto-restart)**
```bash
npm run dev
```

This runs:
```bash
node --watch src/server.js
```

### 3. Access the Application

Open your browser to:
- **http://localhost:3000** — Landing page
- **http://localhost:3000/health** — Health check
- **http://localhost:3000/admin** — Admin dashboard
- **http://localhost:3000/admin/config** — Configuration viewer

---

## How It Works

### Entry Point: `app/src/server.js`

This is the main file that composes the application:

```js
import { createApp, createServer, createConfig } from '../../index.js';
import { taskManagerApplicationPlugin } from './app.js'@animated-spork/app';
import { demoPlugin } from './app.js';
import { demoOverrides } from './config/env.js';

// 1. Create configuration with demo overrides
const config = createConfig(demoOverrides);

// 2. Create Express app with demo plugin
const app = createApp(config, [demoPlugin]);

// 3. Start HTTP server
const { server, close } = createServer(app, config);

export { server, close };
```

**Key points:**
1. Imports from `@animated-spork/app` package
3. Passes the demo plugin to `createApp()`
4. Exports `server` and `close` for testing

---

### Demo Plugin: `app/src/app.js`

The plugin adds demo functionality to the core application:

```js
export function demoPlugin(app, config) {
  // Custom middleware and routes can be added here
  app.get('/custom', (req, res) => {
    res.json({ message: 'Hello from demo plugin' });
  });
}
```

**What it does:**
- Adds custom routes and middleware
- Follows the plugin contract: `(app, config) => void`
- Is composed into the app via `createApp()`

---

### Configuration Overrides: `app/src/config/env.js`

Demo-specific configuration values:

```js
export const demoOverrides = {
  appName: 'Demo App',
  appVersion: '0.0.1',
  // Add any demo-specific overrides here
};
```

**Configuration priority** (highest wins):
1. `demoOverrides` (this file)
2. Environment variables (`.env` or `process.env`)
3. Built-in defaults from the core module

---

### Custom Routes: `app/src/routes/router.js`

Application-specific routes:

```js
import { Router } from 'express';

export function appRoutes(config) {
  const router = Router();

  router.get('/api/data', (req, res) => {
    res.json({
      appName: config.appName,
      version: config.appVersion,
    });
  });

  return router;
}
```

---

## Development Workflow

### 1. Make Changes to Core Module

Edit files in the `packages/app/src/` directory (core module):
```
packages/app/
├── src/
│   ├── app-factory.js
│   ├── server-factory.js
│   ├── config/env.js
│   ├── routes/
│   ├── middlewares/
│   └── views/
```

### 2. Test with Demo App

Run the demo application to see your changes:
```bash
```

The demo app will automatically restart when you modify files (via `node --watch
The demo app will automatically restart when you modify files (via `nodemon`).

### 3. Verify Changes

- Visit the routes in your browser
- Check the admin dashboard at `/admin`
- Verify configuration at `/health
- Test health endpoints at `/healthz`, `/readyz`, `/livez`

### 4. Run Tests

Run the test suite to ensure your changes don't break existing functionality:

```bash
# Run all tests (from workspace root)
npm test

# Run app tests only
npm run test:app
```

---

## Environment Variables

Create a `.env` file in the **repository root** (not in `app/`):

```envdev-app/`):

```env
PORT=3000
NODE_ENV=development
APP_NAME=Demo App
The demo application will use these values when it calls `createConfig()`.

---

## Adding New Demo Features

### Adding a New Route

1. **Create the route** in `app/src/routes/router.js`:
```js
router.get('/tasks/:id', (req, res) => {
  res.render('tasks/detail',src/routes/router.js`:
```js
router.get('/api/items', (req, res) => {
  res.json({ items: [] });
});
```

2. **Test it** by visiting `http://localhost:3000/api/items
1. **Create a plugin file** in `app/src/plugins/`:
```js
// app/src/plugins/analytics.js
export function analyticsPlugin(app, config) {
  app.use((req, res, next) => {
    console.log(`[Analytics] ${req.method} ${req.path}`);
    next();
  });
}
```

2. **Add it to `server.js`**:src/plugins/`:
```js
// src/plugins/customMiddleware.js
export function customMiddlewarePlugin(app, config) {
  app.use((req, res, next) => {
    console.log(`[Middleware] ${req.method} ${req.path}`);
    next();
  });
}
```

2. **Add it to `server.js`**:
```js
import { customMiddlewarePlugin } from './plugins/customMiddleware.js';

const app = createApp(config, [
  demoPlugin,
  customMiddleware
1. **Install the module** via npm:
```json
{
  "dependencies": {
    "animated-spork": "^0.0.1"
  }
}
```dev-app/` directory structure mirrors how a real application would consume the module in production.

**Production scenario:**

1. **Install the module** via npm:
```json
{
  "dependencies": {
    "@animated-spork/app": "^0.0.1"
  }
}
```

2. **Import from the module**:
```js
import { createApp, createServer, createConfig } from '@animated-spork/app
4. **Compose and boot**:
```js
const config = createConfig({ appName: 'My App' });
const app = createApp(config, [myPlugin]);
const { server, close } = createServer(app, config);
```

---

## Troubleshooting

### Server won't start

**Check the port:**
```bash
# See if something is already running on port 3000
lsof -i :3000

# Use a different port
PORT=8080 npm run start:demo
```

### Changes not reflected

**Make sure you're using dev mode:**
```bash
npm run dev:demo  # Not start:demo
```

**Check nodemon is watching the right files:**
```bashstart
```

### Changes not reflected

**Make sure you're using dev mode:**
```bash
npm run dev  # Not npm start
```

**Restart the dev server manually by pressing Ctrl+C and running `npm run dev` again**

describe('Demo App', () => {
  afterAll(async () => {
    await close();
  });

  it('should respond to /tasks', async () => {
    const response = await request(server).get('/tasks');
    expect(response.status).toBe(200);
  });
});
```

---

## Comparing Local Dev vs Production
 } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { server, close } from './src/server.js';

describe('Demo App', () => {
  afterEach(async () => {
    await close();
  });

  it('should respond to /', async () => {
    const response = await request(server).get('/');
    expect(response.status).to.equal
1. **Modify the demo pldev-app/`) | Production |
|---|---|---|
| **Module source** | Local `@animated-spork/app` | npm package `@animated-spork/app
4. **Run the test suite** to ensure everything works
5. **Check the admin dashboard** to verify configuration

---

## Related Documentation

- [Main README](../README.md) — Module overview and API reference
- [Project Specification](../documentation/00-project-specs.md) — Detailed architecture and design decisions

---

## Questions?

If you're building a consuming application:
1. Review the `app/` directory(`src/app.js`) to add your own features
2. **Create additional plugins** to test composition patterns
3. **Add custom routes** to test view rendering
4. **Run the test suite** to ensure everything works
5. **Check the admin dashboard** to verify configuration

## Related Documentation

- [Main README](../README.md) — Project overview and structure
- [@animated-spork/app README](../packages/app/README.md) — API reference for the core module
- [@animated-spork/shared README](../packages/shared/README.md) — Shared utilities