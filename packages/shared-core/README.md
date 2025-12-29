# @animated-spork/shared-core

Shared core utilities and types for the animated-spork monorepo.

## Overview

`shared-core` provides framework-agnostic utilities that are shared across all animated-spork packages (`api-core`, `frontend-core`) and demo applications.

**Current Status (as of 2025-12-29):**
- ✅ **Phase 1 Complete**: Logging and debugging utilities production-ready
- 🔴 **Future additions**: Validation, types, and error utilities will be added as patterns emerge from api-core and frontend-core development

**Implemented utilities:**
1. **`createDebugger`** - Factory for creating namespaced debug functions using the `debug` npm package
2. **`createLogger` / `logger`** - Winston-based logger factory and default logger instance for file and console output

**Test Coverage:** 97.77% statements, 82.14% branches, 80% functions

## Installation

Since this is a workspace package, dependencies are managed at the root:

```bash
npm install
```

## Usage

### Debug Utility

Create a namespaced debugger for your application:

```javascript
import { createDebugger } from '@animated-spork/shared-core';

// Explicit name and namespace suffix
const debug = createDebugger({ name: 'my-app', namespaceSuffix: 'api' });
debug('message'); // logs if DEBUG=my-app:api:* is set in environment

// Or use defaults (reads calling app's package.json name)
const debug2 = createDebugger();
debug2('auto-namespaced message');
```

**Environment variable:**
- Set `DEBUG=namespace:*` to enable logging for that namespace and its sub-namespaces
- Example: `DEBUG=my-app:* node app.js`

### Logger Utility

Use the default logger or create a custom one:

```javascript
import { logger, createLogger } from '@animated-spork/shared-core';

// Default logger (writes to process.cwd()/logs/<app-name>.log)
logger.info('app started');
logger.warn('warning message');
logger.error('error occurred');
logger.debug('debug info');

// Custom logger with options
const customLogger = createLogger({
  name: 'custom-service',     // log file basename
  level: 'warn',              // minimum log level
  logDir: '/custom/log/path'  // override default logs directory
});

customLogger.info('this will not appear (level is warn)');
customLogger.warn('this will appear');
```

**Log Methods:**
- `logger.info(message, [meta])`
- `logger.warn(message, [meta])`
- `logger.error(message, [meta])`
- `logger.debug(message, [meta])`

**Output Format:**
Logs are written to files and console with timestamp, level, message, and optional metadata:
```
2025-12-22T02:24:08.033Z [info] message {"meta":"data"}
```

## Testing

Run the test suite:

```bash
# From packages/shared-core
npm test

# From repo root
npm run test:shared-core
```

### Code Coverage

Generate code coverage reports with c8:

```bash
# From packages/shared-core
npm run coverage

# From repo root
npm run coverage:shared-core
```

This produces:
- Text summary in terminal (90.35% statements, 100% functions)
- HTML detailed report in `coverage/index.html`

**Current coverage:**
- **Statements:** 97.77% (220/225)
- **Functions:** 80% (4/5)
- **Lines:** 97.77% (220/225)
- **Branches:** 82.14% (23/28)

**Note:** The vault.js file is currently a stub (placeholder) and will be implemented in future phases as secure configuration management needs emerge.

**Test Coverage:**
- `tests/debug.spec.js` — tests for `createDebugger` namespace resolution and environment filtering
- `tests/logger.spec.js` — tests for `createLogger`, log levels, file output, and timestamps

**Test Helpers** (`tests/helpers/index.js`):
- `withEnv(env, fn)` — run `fn` with temporary environment variables
- `captureConsole()` — spy on console methods
- `tempDir()` — create/cleanup temporary directories
- `stubClock(date)` — stub time for deterministic tests
- `importFresh(path)` — force-reload an ESM module

## File Structure

```
packages/shared-core/
├── src/
│   ├── debug.js         # Debug utility (createDebugger factory)
│   ├── logger.js        # Logger utility (createLogger factory + default logger)
│   └── index.js         # Public exports
├── tests/
│   ├── helpers/
│   │   └── index.js     # Reusable test helpers
│   ├── debug.spec.js    # Debug module tests
│   └── logger.spec.js   # Logger module tests
├── TEST_PLAN.md         # Testing plan and architecture
├── package.json
├── index.js
└── README.md            # This file
```

## API Reference

### `createDebugger(options?)`

Factory function for creating a namespaced debug function.

**Parameters:**
- `options` (object, optional)
  - `name` (string) — explicit app name; if omitted, reads from calling app's `package.json`
  - `namespaceSuffix` (string) — appended to name with `:` separator (e.g., `name:suffix`)

**Returns:** A debug function compatible with the `debug` npm package

**Example:**
```javascript
const { createDebugger } = require('@animated-spork/shared-core');
const dbg = createDebugger({ name: 'myapp', namespaceSuffix: 'module' });
dbg('data: %o', { key: 'value' }); // uses debug formatting
```

### `createLogger(options?)`

Factory function for creating a Winston logger instance.

**Parameters:**
- `options` (object, optional)
  - `name` (string, default: `basename(process.cwd())`) — log file name
  - `level` (string, default: `'info'`) — minimum log level (error, warn, info, debug)
  - `logDir` (string, default: `process.cwd()/logs`) — directory for log files

**Returns:** A Winston logger instance with `info`, `warn`, `error`, `debug` methods

**Example:**
```javascript
const { createLogger } = require('@animated-spork/shared-core');
const log = createLogger({ name: 'service', level: 'debug' });
log.debug('detailed info');
log.info('general info');
```

### `logger` (default export)

A pre-configured Winston logger instance for immediate use.

**Example:**
```javascript
import { logger } from '@animated-spork/shared-core';
logger.info('App initialized');
```

## Architecture Notes

- **Separation of concerns:** `debug.js` handles environment-driven, lightweight tracing; `logger.js` provides structured file/console logging.
- **Monorepo-friendly:** `shared-core` is dependency-agnostic; `api-core` and `frontend-core` can import and re-export these utilities tailored to their needs.
- **ESM:** All code is written as ES modules (`import`/`export`); the repo's `package.json` has `"type": "module"`.
- **Hermetic tests:** Tests use Sinon mocks, temporary directories, and environment isolation to avoid side effects.
