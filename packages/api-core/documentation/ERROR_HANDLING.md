# Error Handling in api-core

Comprehensive guide to error handling in the api-core database layer, including Express middleware integration, client vs server error handling, and production best practices.

---

## Overview

All database errors in api-core:

1. **Extend `Error`** - Full JavaScript error compatibility (stack traces, instanceof checks)
2. **Include `statusCode`** - HTTP status codes for Express middleware (4xx or 5xx)
3. **Include `code`** - Machine-readable error code for categorization
4. **Include `context`** - Debugging information without exposing sensitive data
5. **Preserve stack traces** - Complete call stack for development/debugging

This design enables clean integration with Express error middleware via the `next(error)` pattern.

---

## Error Categories

### Client Errors (4xx)

**Definition**: Programming errors or invalid input from the caller.  
**Responsibility**: The application developer should fix the code or input.  
**Logging Severity**: INFO or WARN (don't alert operations).  
**Response**: Return error details to caller for debugging.

| Error | HTTP | Code | Meaning |
|-------|------|------|---------|
| `QueryError` | 400 | `QUERY_ERROR` | Invalid SQL syntax or query execution failure |
| `ConfigurationError` | 400 | `CONFIGURATION_ERROR` | Invalid/missing database configuration |
| `DatabaseNotFoundError` | 400 | `DATABASE_NOT_FOUND` | Referenced database is not configured |
| `PermissionError` | 403 | `PERMISSION_DENIED` | User lacks required database permissions |

**Examples**:

```javascript
// Invalid SQL (programmer error)
throw new QueryError(
  'Column "name" does not exist on table "users"',
  { sql: 'SELECT name FROM users', table: 'users' }
);

// Typo in database name (programmer error)
throw new DatabaseNotFoundError(
  'reporting',
  { configuredDatabases: ['default', 'secondary'] }
);

// Insufficient permissions (configuration error)
throw new PermissionError(
  'User "api" does not have INSERT permission on users table',
  { user: 'api', operation: 'INSERT', table: 'users' }
);
```

### Server Errors (5xx)

**Definition**: Database or infrastructure failures beyond the application's control.  
**Responsibility**: Operations must investigate and resolve the underlying issue.  
**Logging Severity**: ERROR or CRITICAL (alert operations immediately).  
**Response**: Return generic error; log full details for ops investigation.

| Error | HTTP | Code | Meaning |
|-------|------|------|---------|
| `ConnectionError` | 503 | `CONNECTION_ERROR` | Cannot connect to database server |
| `QueryTimeoutError` | 504 | `QUERY_TIMEOUT` | Query/connection attempt exceeded timeout |
| `PoolExhaustedError` | 503 | `POOL_EXHAUSTED` | All connections in use; cannot acquire new one |
| `TransactionError` | 500 | `TRANSACTION_ERROR` | Unexpected failure during transaction |
| `InternalDatabaseError` | 500 | `INTERNAL_DATABASE_ERROR` | Unexpected driver or database error |

**Examples**:

```javascript
// Database server unreachable (infrastructure failure)
throw new ConnectionError(
  'Cannot connect to MSSQL server at localhost:1433',
  {
    databaseName: 'default',
    server: 'localhost',
    port: 1433,
    attempt: 3,
    lastError: 'Connection timeout after 15000ms'
  },
  originalError
);

// Query running too long (resource exhaustion)
throw new QueryTimeoutError(
  'Query exceeded 30000ms timeout',
  {
    databaseName: 'default',
    sql: 'SELECT ... (complex query)',
    timeoutMs: 30000,
    duration: 35000
  }
);

// Pool exhausted (infrastructure/tuning issue)
throw new PoolExhaustedError(
  'Cannot acquire connection; pool exhausted',
  {
    databaseName: 'default',
    poolSize: 20,
    activeConnections: 20,
    waitTime: 10000
  }
);
```

---

## Express Middleware Integration

### Basic Error Handler

```javascript
// src/middleware/errorHandler.js
import { isDatabaseError, isClientError } from '../database/errors.js';
import { createLogger } from '../logger.js';

const log = createLogger('api:error-handler');

/**
 * Express error middleware for handling database errors.
 * Must be registered AFTER all other middleware and routes.
 */
export function errorHandler(err, req, res, next) {
  // Default to 500 if not a recognized error
  const statusCode = err.statusCode || 500;
  const isDbError = isDatabaseError(err);
  
  // Log appropriately based on error type
  if (isDbError && isClientError(err)) {
    // Client error: programmer mistake or bad input
    log.warn(`${err.name}: ${err.message}`, {
      code: err.code,
      path: req.path,
      method: req.method,
      context: err.context
    });
  } else if (isDbError) {
    // Server error: infrastructure problem
    log.error(`${err.name}: ${err.message}`, {
      code: err.code,
      path: req.path,
      method: req.method,
      context: err.context,
      originalError: err.originalError?.message,
      stack: err.stack
    });
  } else {
    // Non-database error
    log.error(`Unexpected error: ${err.message}`, {
      name: err.name,
      path: req.path,
      method: req.method,
      stack: err.stack
    });
  }
  
  // Send response to client
  const response = {
    error: err.name,
    message: message(err, req),
    code: err.code || 'UNKNOWN_ERROR'
  };
  
  // Include context in development
  if (process.env.NODE_ENV === 'development' && isDbError) {
    response.context = err.context;
  }
  
  res.status(statusCode).json(response);
}

/**
 * Determine appropriate message for client response.
 * Hides sensitive details in production.
 */
function message(err, req) {
  if (process.env.NODE_ENV === 'development') {
    // Show full details in development
    return err.message;
  }
  
  if (isDatabaseError(err)) {
    if (isClientError(err)) {
      // Client errors: helpful message
      return err.message;
    } else {
      // Server errors: generic message
      return 'Database service temporarily unavailable';
    }
  }
  
  // Other errors
  return 'An unexpected error occurred';
}
```

### Usage in Routes

```javascript
// src/routes/users.js
import express from 'express';

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const user = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user[0]);
  } catch (err) {
    // Pass to error middleware
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    const result = await db.execute(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      email
    });
  } catch (err) {
    // Automatically routed to error middleware
    next(err);
  }
});

export default router;
```

### Registration in App

```javascript
// src/app.js
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import usersRouter from './routes/users.js';

const app = express();

app.use(express.json());
app.use('/users', usersRouter);

// ERROR MIDDLEWARE: Must be registered LAST
app.use(errorHandler);

export default app;
```

---

## Error Helper Functions

### Check Error Type

```javascript
import { isDatabaseError, isClientError, isServerError } from '../database/errors.js';

// Check if any error is a database error
if (isDatabaseError(err)) {
  console.log(`Database error: ${err.code}`);
}

// Check if error is programmer's fault (4xx)
if (isClientError(err)) {
  log.warn('Fix your code', { code: err.code });
}

// Check if error is infrastructure's fault (5xx)
if (isServerError(err)) {
  alertOps('Database problem detected', { code: err.code });
}
```

### Retry Logic Based on Error Type

```javascript
async function executeWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // Don't retry client errors (4xx)
      if (isClientError(err)) {
        throw err; // Fail immediately
      }
      
      // Retry server errors (5xx) with backoff
      if (attempt < maxRetries && isServerError(err)) {
        const backoff = Math.pow(2, attempt - 1) * 100; // exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      throw err;
    }
  }
}

// Usage
const result = await executeWithRetry(
  () => db.query('SELECT * FROM users', [])
);
```

### Error Recovery Strategies

```javascript
// Strategy 1: Retry transient failures
try {
  await db.query(sql, params);
} catch (err) {
  if (err instanceof QueryTimeoutError) {
    // Increase timeout and retry
    await db.query(sql, params, 'default', { timeout: 60000 });
  } else {
    throw err;
  }
}

// Strategy 2: Degrade gracefully
try {
  const analytics = await db.query(sql, [], 'analytics');
  res.json({ data, analytics });
} catch (err) {
  if (err instanceof ConnectionError) {
    // Analytics DB down, but return main data
    log.warn('Analytics unavailable', { code: err.code });
    res.json({ data, analytics: null });
  } else {
    throw err;
  }
}

// Strategy 3: Circuit breaker pattern
const circuitBreaker = {
  failures: 0,
  maxFailures: 5,
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'CLOSED';
      return result;
    } catch (err) {
      this.failures++;
      if (this.failures >= this.maxFailures) {
        this.state = 'OPEN';
        log.error('Circuit breaker opened', { failures: this.failures });
      }
      throw err;
    }
  }
};

// Usage
await circuitBreaker.execute(() => db.query(sql, params));
```

---

## Logging Best Practices

### Log Levels

```javascript
import { createLogger } from '../logger.js';
const log = createLogger('api:database');

// CLIENT ERRORS (4xx): INFO or WARN
try {
  await db.query(invalidSql);
} catch (err) {
  if (isDatabaseError(err) && isClientError(err)) {
    // INFO: Expected error; developer should fix
    log.info('Invalid query', { code: err.code, sql: invalidSql });
  }
}

// SERVER ERRORS (5xx): ERROR or CRITICAL
try {
  await db.query('SELECT ...');
} catch (err) {
  if (isDatabaseError(err) && isServerError(err)) {
    // ERROR: Infrastructure problem; ops needs to know
    log.error('Database unavailable', {
      code: err.code,
      context: err.context,
      originalError: err.originalError?.message
    });
  }
}
```

### Sanitize Sensitive Data

```javascript
// ❌ BAD: Logs database connection details
catch (err) {
  log.error('Connection failed', { context: err.context });
  // context contains: { server: 'prod-db.company.com', password: '...' }
}

// ✅ GOOD: Logs only relevant details
catch (err) {
  log.error('Connection failed', {
    code: err.code,
    databaseName: err.context.databaseName,
    server: err.context.server, // hostname OK; no credentials
    attempt: err.context.attempt
  });
}
```

### Structured Logging

```javascript
// Structure logs for easy parsing and searching
log.error('Query timeout', {
  // Standard fields
  timestamp: new Date().toISOString(),
  severity: 'ERROR',
  code: 'QUERY_TIMEOUT',
  
  // Context
  databaseName: 'default',
  operation: 'SELECT',
  table: 'users',
  timeoutMs: 30000,
  actualDuration: 35000,
  
  // Tracing
  requestId: req.id,
  userId: req.user?.id,
  
  // Stack trace
  error: {
    name: err.name,
    message: err.message,
    stack: err.stack
  }
});
```

---

## Testing Error Scenarios

### Unit Test Example

```javascript
import { expect } from 'chai';
import { QueryError } from '../src/database/errors.js';

describe('Error Handling', () => {
  it('should throw QueryError for invalid SQL', async () => {
    try {
      await db.query('SELECT * FROM nonexistent_table');
      expect.fail('Should have thrown QueryError');
    } catch (err) {
      expect(err).to.be.instanceOf(QueryError);
      expect(err.statusCode).to.equal(400);
      expect(err.code).to.equal('QUERY_ERROR');
    }
  });

  it('should include context in error', async () => {
    try {
      await db.execute('INSERT', []);
    } catch (err) {
      expect(err.context).to.include({
        databaseName: 'default'
      });
    }
  });

  it('should preserve original error', async () => {
    try {
      await db.query('SELECT');
    } catch (err) {
      expect(err.originalError).to.be.instanceOf(Error);
    }
  });
});
```

### Integration Test Example

```javascript
describe('Express Error Middleware', () => {
  it('should return 400 for QueryError', async () => {
    const res = await request(app)
      .get('/users')
      .query({ search: 'invalid SQL' });
    
    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('QUERY_ERROR');
  });

  it('should return 503 for ConnectionError', async () => {
    // Simulate database down
    sinon.stub(db, 'query').rejects(
      new ConnectionError('Cannot connect', { databaseName: 'default' })
    );
    
    const res = await request(app).get('/users');
    
    expect(res.status).to.equal(503);
    expect(res.body.code).to.equal('CONNECTION_ERROR');
  });

  it('should hide details in production', async () => {
    process.env.NODE_ENV = 'production';
    
    const res = await request(app).get('/users');
    
    expect(res.body.message).to.equal('Database service temporarily unavailable');
    expect(res.body.context).to.be.undefined;
  });
});
```

---

## Error Response Format

### Client (4xx) Response

```json
{
  "error": "QueryError",
  "message": "Column \"email\" does not exist on table \"users\"",
  "code": "QUERY_ERROR"
}
```

**With development details**:

```json
{
  "error": "QueryError",
  "message": "Column \"email\" does not exist on table \"users\"",
  "code": "QUERY_ERROR",
  "context": {
    "sql": "SELECT email FROM users WHERE id = ?",
    "table": "users"
  }
}
```

### Server (5xx) Response

```json
{
  "error": "ConnectionError",
  "message": "Database service temporarily unavailable",
  "code": "CONNECTION_ERROR"
}
```

**In development** (full details for debugging):

```json
{
  "error": "ConnectionError",
  "message": "Cannot connect to MSSQL server at localhost:1433",
  "code": "CONNECTION_ERROR",
  "context": {
    "databaseName": "default",
    "server": "localhost",
    "port": 1433,
    "attempt": 3,
    "lastError": "Connection timeout after 15000ms"
  }
}
```

---

## Summary

| Aspect | Client Error (4xx) | Server Error (5xx) |
|--------|-------------------|-------------------|
| **Cause** | Programming error | Infrastructure failure |
| **Responsibility** | Developer fixes code | Operations fixes infrastructure |
| **Logging** | WARN (don't alert ops) | ERROR (alert ops) |
| **Response** | Full details for debugging | Generic message in production |
| **Retry** | No (error won't fix itself) | Yes (may be temporary) |
| **Example** | Invalid SQL, wrong database name | Connection timeout, pool exhausted |

