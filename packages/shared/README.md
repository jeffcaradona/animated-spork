# @animated-spork/shared

Shared core utilities, logging, authentication, and error handling for the animated-spork workspace.

## Features

- **Logging**: Winston-based structured logging with file and console transports
- **Debug**: Lightweight namespace-based debug logging via the debug package
- **JWT Authentication**: Token generation, verification, and Express middleware
- **Server Utilities**: HTTP server factory with graceful Kubernetes-aware shutdown
- **Error Handling**: Operational error class with machine-readable codes and HTTP status codes
- **Memory Monitoring**: Process memory usage tracking and reporting

## Installation

This is a local workspace package. Install from the repository root:

```sh
npm install
```

Then import in your workspace packages:

```js
import {
  createLogger,
  createDebug,
  generateToken,
  verifyToken,
  jwtAuthMiddleware,
  createAppError,
  createNotFoundError,
  createValidationError,
} from '@animated-spork/shared';
```

## API Reference

### Logging & Debugging

#### `createLogger(options?)`

Factory function for creating a Winston logger instance.

```js
const logger = createLogger({
  name: 'myapp',           // Log file basename (default: current dir name)
  level: 'info',           // Min level: 'error', 'warn', 'info', 'debug'
  logDir: './logs'         // Directory for log files (default: ./logs)
});

logger.info('Server started', { port: 3000 });
logger.error('Connection failed', { reason: 'timeout' });
```

**Returns**: Winston logger instance with methods: `.info()`, `.warn()`, `.error()`, `.debug()`

#### `createDebug(namespace)`

Factory for creating namespaced debug functions using the `debug` package.

```js
const debug = createDebug('myapp:service');
debug('Service initialized');  // Outputs only if DEBUG=myapp:* is set
```

**Returns**: Function for debug logging

#### `createMemoryLogger(process, logger)`

Tracks and reports peak memory usage during application lifecycle.

```js
const memLogger = createMemoryLogger(globalThis.process, debug);
memLogger('startup');  // Logs current memory usage with label
const summary = memLogger.getPeakSummary();  // Get peak values
memLogger.logPeakSummary();  // Log peak values
```

### JWT Authentication

#### `generateToken(secret, expiresIn?)`

Generate a JWT token for inter-service authentication.

```js
const token = generateToken(process.env.JWT_SECRET, '15m');
// Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Parameters**:
- `secret` (string): JWT secret key
- `expiresIn` (string, optional): Token expiration (default: `'15m'`)

**Returns**: Signed JWT token string

#### `verifyToken(token, secret)`

Verify and decode a JWT token.

```js
try {
  const decoded = verifyToken(token, process.env.JWT_SECRET);
  console.log(decoded.iss); // 'excel-export-app'
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    console.error('Token has expired');
  }
}
```

**Throws**:
- `JsonWebTokenError`: Invalid signature
- `TokenExpiredError`: Token has expired

**Returns**: Decoded token payload object

#### `jwtAuthMiddleware(secret)`

Express middleware for JWT authentication.

```js
import express from 'express';
import { jwtAuthMiddleware } from '@animated-spork/shared';

const app = express();
app.use('/api', jwtAuthMiddleware(process.env.JWT_SECRET));

// Protected routes
app.get('/api/data', (req, res) => {
  console.log(req.auth); // Decoded token payload
  res.json({ status: 'authenticated' });
});
```

**Returns**: Express middleware function

### Error Handling

#### `createAppError(code, message, statusCode)`

Create a generic application error.

```js
const error = createAppError('DB_ERROR', 'Failed to connect', 500);
throw error;
```

#### `createNotFoundError(message?)`

Create a 404 Not Found error.

```js
const error = createNotFoundError('User not found');
// statusCode: 404, code: 'NOT_FOUND'
```

#### `createValidationError(message?)`

Create a 400 Bad Request error for validation failures.

```js
const error = createValidationError('Email is required');
// statusCode: 400, code: 'VALIDATION_ERROR'
```

All errors have:
- `code`: Machine-readable error identifier
- `message`: Human-readable error message
- `statusCode`: HTTP status code
- `isOperational`: `true` (indicates this is a handled operational error)

## Environment Variables

### Logging

- `LOG_DIR`: Override default log directory (default: `./logs`)
- `LOG_LEVEL`: Set minimum log level (default: `info`)

### JWT

- `JWT_SECRET`: Secret key for signing/verifying tokens (required for JWT functions)

### Debug

- `DEBUG`: Enable debug logging by namespace (e.g., `DEBUG=myapp:*`)

### Server

- `NODE_ENV`: Set to `development` to disable TLS rejection in development
- `PORT`: Server port (configured via `createServer()` config object)

## Development

Run tests with coverage:

```sh
npm test              # Run unit tests
npm run coverage      # Run tests with coverage report
```

## Security

This package handles sensitive operations like JWT signing and verification. Always:

- Keep JWT secrets secure and never commit them
- Use environment variables for configuration
- Run security scans on new code: `snyk test`
- Follow the security guidelines in [.github/instructions/snyk_rules.instructions.md](../../.github/instructions/snyk_rules.instructions.md)

## Contributing

See the repository [CONTRIBUTING guidelines](../../CONTRIBUTING.md).

## License

ISC - See [LICENSE](../../LICENSE) in the repository root.
