# @animated-spork/app

An opinionated Express application factory with built-in middleware, routing, and error handling. This package provides a production-ready foundation for building Express applications with sensible defaults.

## Features

- **Express Application Factory** – Pre-configured with common middleware and error handling
- **HTTP Server Factory** – With graceful shutdown support (SIGTERM/SIGINT)
- **Error Handling** – Standardized application errors with proper HTTP status codes
- **Environment Configuration** – Secure config management with sensitive key filtering
- **EJS View Engine** – Pre-configured templating
- **Built-in Routes** – Health checks, landing page, and admin dashboard
- **Plugin System** – Extensible via consumer plugins
- **Logging** – Integrated with `@animated-spork/shared` logger
- **JWT Authentication** – Ready-to-use middleware for authenticated routes

## Installation

```bash
npm install @animated-spork/app
```

### Prerequisites

- Node.js >= 22.0.0
- `@animated-spork/shared` package (installed as a dependency)

## Usage

### Basic Setup

```javascript
import { createApp, createServer, createConfig } from '@animated-spork/app';

// Create configuration
const config = createConfig({
  appName: 'My App',
  port: 3000,
  // ... other environment variables
});

// Create Express application with plugins
const app = createApp(config, [
  // Optional: add consumer plugins here
  (app, config) => {
    // Your custom middleware/routes
  }
]);

// Start HTTP server
const { server, close } = createServer(app, config);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await close();
});
```

### Creating Custom Errors

```javascript
import { 
  createAppError, 
  createNotFoundError, 
  createValidationError 
} from '@animated-spork/app';

// Generic application error (500)
throw createAppError('Something went wrong', { cause: originalError });

// Not found error (404)
throw createNotFoundError('User not found');

// Validation error (400)
throw createValidationError('Email is required');
```

### Environment Configuration

```javascript
import { createConfig, filterSensitiveKeys } from '@animated-spork/app';

const config = createConfig({
  appName: 'My App',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  // ... other config options
});

// Remove sensitive keys for logging
const safeConfig = filterSensitiveKeys(config);
```

### Creating Plugins

Plugins are functions that receive the Express app and config object:

```javascript
const customPlugin = (app, config) => {
  app.get('/custom', (req, res) => {
    res.json({ message: 'Custom route' });
  });
};

const app = createApp(config, [customPlugin]);
```

## API Reference

### `createApp(config, plugins = [])`

Creates and returns a fully configured Express application.

**Parameters:**
- `config` (object) – Configuration object with `appName`, `port`, and other env vars
- `plugins` (array) – Optional array of plugin functions to extend the app

**Returns:** Express application instance

**Features:**
- EJS view engine configured
- Static files served from `src/public`
- Built-in routes: health check, landing page, admin dashboard
- JSON and URL-encoded body parsing
- Error handling middleware

### `createServer(app, config)`

Creates and returns an HTTP server with graceful shutdown support.

**Parameters:**
- `app` (express.Express) – Express app from `createApp()`
- `config` (object) – Config object (reads `port` and `appName`)

**Returns:** Object with:
- `server` (http.Server) – Running server instance
- `close` (function) – Async function for graceful shutdown

### `createConfig(env = {})`

Creates a sanitized configuration object.

**Parameters:**
- `env` (object) – Environment variables to include

**Returns:** Configuration object

### `filterSensitiveKeys(config)`

Removes sensitive keys from config object (useful for logging).

**Sensitive keys:** `password`, `secret`, `token`, `key` (case-insensitive)

**Parameters:**
- `config` (object) – Configuration object

**Returns:** Sanitized copy of config

### Error Creators

```javascript
createAppError(message, options?)
createNotFoundError(message, options?)
createValidationError(message, options?)
```

## Built-in Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Health check endpoint (returns 200) |
| `/admin` | GET | Admin dashboard |
| `/` | GET | Landing page |
| `*` | * | 404 handler for undefined routes |

## Error Handling

The error handler automatically:
- Returns appropriate HTTP status codes
- Logs errors with stack traces
- Sends JSON or HTML responses based on content type
- Filters sensitive information

## Requirements

- `@animated-spork/shared` – Logger, JWT, and utility functions
- `express` – HTTP framework
- `ejs` – Template engine

## License

MIT

## Author

Jeff Caradona &lt;jeffcaradona@gmail.com&gt;
