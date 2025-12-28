# Phase 1 Implementation Guide

This guide provides detailed instructions for implementing Phase 1 of the api-core database layer: **Database Abstraction**.

**Phase 1 Goals**:
- Define database interfaces (`IDatabase`, `IConnection`, `ITransaction`)
- Implement error hierarchy with Express compatibility
- Implement SQLite adapter for development/testing
- Implement connection manager for multi-database routing
- Create factory function for initializing the database client

**Timeline**: 1 week

---

## 1. Interfaces & Error Handling

Phase 1 Item 1 consists of two core foundation pieces: error classes and interface contracts.

### 1.1 Error Hierarchy

All database operations must handle errors gracefully with meaningful error information. Create `src/database/errors.js` with custom error classes:

```javascript
/**
 * Base database error class.
 * All database-related errors inherit from this.
 * Compatible with Express error middleware via next(error).
 */
export class DatabaseError extends Error {
  /**
   * @param {string} message - Error message for logging/display
   * @param {string} code - Machine-readable error code (e.g., 'CONNECTION_ERROR')
   * @param {number} [statusCode=500] - HTTP status code (default: 500)
   * @param {object} [context] - Additional context about the error
   * @param {Error} [originalError] - Original error from driver (for logging)
   */
  constructor(message, code, statusCode = 500, context = {}, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a database connection cannot be established or maintained.
 * HTTP Status: 503 Service Unavailable
 */
export class ConnectionError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'CONNECTION_ERROR', 503, context, originalError);
    this.name = 'ConnectionError';
  }
}

/**
 * Thrown when a query times out.
 * HTTP Status: 504 Gateway Timeout
 */
export class QueryTimeoutError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'QUERY_TIMEOUT', 504, context, originalError);
    this.name = 'QueryTimeoutError';
  }
}

/**
 * Thrown when a SQL query has invalid syntax or is rejected by the database.
 * HTTP Status: 400 Bad Request
 */
export class QueryError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'QUERY_ERROR', 400, context, originalError);
    this.name = 'QueryError';
  }
}

/**
 * Thrown when a required configuration is missing or invalid.
 * HTTP Status: 400 Bad Request
 */
export class ConfigurationError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'CONFIGURATION_ERROR', 400, context, originalError);
    this.name = 'ConfigurationError';
  }
}

/**
 * Thrown when attempting to acquire a connection and the pool is exhausted.
 * HTTP Status: 503 Service Unavailable
 */
export class PoolExhaustedError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'POOL_EXHAUSTED', 503, context, originalError);
    this.name = 'PoolExhaustedError';
  }
}

/**
 * Thrown when attempting to use a database that is not configured.
 * HTTP Status: 400 Bad Request
 */
export class DatabaseNotFoundError extends DatabaseError {
  constructor(databaseName, context = {}, originalError = null) {
    super(
      `Database '${databaseName}' is not configured`,
      'DATABASE_NOT_FOUND',
      400,
      { ...context, databaseName },
      originalError
    );
    this.name = 'DatabaseNotFoundError';
  }
}

/**
 * Thrown when a transaction operation fails (commit, rollback, begin).
 * HTTP Status: 500 Internal Server Error
 */
export class TransactionError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'TRANSACTION_ERROR', 500, context, originalError);
    this.name = 'TransactionError';
  }
}

/**
 * Thrown when user lacks required database permissions.
 * HTTP Status: 403 Forbidden
 */
export class PermissionError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'PERMISSION_DENIED', 403, context, originalError);
    this.name = 'PermissionError';
  }
}

/**
 * Thrown when an unexpected error occurs in the database driver.
 * HTTP Status: 500 Internal Server Error
 */
export class InternalDatabaseError extends DatabaseError {
  constructor(message, context, originalError) {
    super(message, 'INTERNAL_DATABASE_ERROR', 500, context, originalError);
    this.name = 'InternalDatabaseError';
  }
}

/**
 * Helper: Check if an error is a database error.
 * @param {Error} err - Error to check
 * @returns {boolean} True if err is instanceof DatabaseError
 */
export function isDatabaseError(err) {
  return err instanceof DatabaseError;
}

/**
 * Helper: Check if an error is a client error (4xx).
 * Client errors are programmer mistakes; no retry will help.
 * @param {Error} err - Error to check
 * @returns {boolean} True if statusCode is 4xx
 */
export function isClientError(err) {
  return isDatabaseError(err) && err.statusCode >= 400 && err.statusCode < 500;
}

/**
 * Helper: Check if an error is a server error (5xx).
 * Server errors are infrastructure problems; may be transient.
 * @param {Error} err - Error to check
 * @returns {boolean} True if statusCode is 5xx
 */
export function isServerError(err) {
  return isDatabaseError(err) && err.statusCode >= 500 && err.statusCode < 600;
}
```

**Key Points**:
- All errors extend `Error` with `statusCode` for Express middleware compatibility
- **4xx errors** (QueryError, ConfigurationError, etc.): Programming mistakes—don't retry
- **5xx errors** (ConnectionError, QueryTimeoutError, etc.): Infrastructure problems—may be transient
- Include `context` with debugging information (but not sensitive credentials)
- Include `originalError` to preserve stack traces from underlying driver

**For comprehensive error handling patterns, logging strategies, and Express integration examples, see [ERROR_HANDLING.md](../ERROR_HANDLING.md)**.

### 1.2 Error Context Information

When throwing errors, include context for debugging:

```javascript
// Example: ConnectionError with context
throw new ConnectionError(
  'Failed to connect to MSSQL database',
  {
    databaseName: 'default',
    server: 'localhost',
    database: 'myapp',
    attempt: 3,
    lastError: originalError.message
  },
  originalError
);

// Example: QueryError with context
throw new QueryError(
  'Column "email" does not exist',
  {
    databaseName: 'default',
    sql: 'SELECT email FROM users WHERE id = ?',
    table: 'users'
  }
);
```

### 1.3 Interface Definitions

Create `src/database/interface.js` with interface contracts that all adapters must implement.

**Core Interfaces**:

**IDatabase** - Main database client interface:
- `query(sql, params, databaseName)` - SELECT queries
- `execute(sql, params, databaseName)` - INSERT/UPDATE/DELETE
- `getConnection(databaseName)` - Get connection from pool
- `releaseConnection(connection)` - Release connection to pool
- `beginTransaction(connection)` - Start a transaction
- `isHealthy()` - Check database availability
- `getStatus()` - Get detailed status
- `close()` - Cleanup and shutdown

**IConnection** - Manual connection management:
- `query(sql, params)` - SELECT on specific connection
- `execute(sql, params)` - INSERT/UPDATE/DELETE on specific connection
- `release()` - Return to pool

**ITransaction** - Transaction management:
- `query(sql, params)` - SELECT within transaction
- `execute(sql, params)` - INSERT/UPDATE/DELETE within transaction
- `commit()` - Commit transaction
- `rollback()` - Rollback transaction

**Supporting Types**:
- `ResultSet` - Array of row objects from queries
- `ExecutionResult` - Result with rowsAffected, lastInsertRowid, recordsets (for procedures)
- `OutputParameter` - For MSSQL OUTPUT parameters in stored procedures
- `QueryParams` - Array or object of query parameters

See [src/database/interface.js](../../src/database/interface.js) for complete JSDoc and examples.

---

## 2. Configuration Validation Schema

Configuration is validated at application startup before any database operations occur.

### Configuration Structure

All configuration follows this top-level structure:

```javascript
/**
 * @typedef {object} DatabaseConfig
 * @property {string} backend - Backend type: 'mssql' or 'sqlite'
 * @property {object} databases - Map of named database configurations
 * @property {object} [healthCheck] - Optional health check configuration
 * @property {object} [logging] - Optional logging configuration
 */
```

### Backend: SQLite

```javascript
/**
 * @typedef {object} SqliteConfig
 * @property {string} [filename] - Database file path (default: ':memory:')
 *                                - ':memory:' for in-memory database
 *                                - './path/to/file.db' for file-based
 * @property {boolean} [readonly] - Open database in read-only mode (default: false)
 * @property {number} [timeout] - Query timeout in milliseconds (default: 10000)
 */

// Example
{
  backend: 'sqlite',
  databases: {
    default: {
      filename: ':memory:', // or './data/dev.db'
      timeout: 10000
    },
    test: {
      filename: ':memory:'
    }
  }
}
```

### Backend: MSSQL

```javascript
/**
 * @typedef {object} MssqlConfig
 * @property {string} server - Server hostname
 * @property {string} database - Database name
 * @property {object} authentication - Authentication configuration
 * @property {object} [pool] - Connection pool configuration
 * @property {object} [options] - MSSQL-specific options
 */

/**
 * @typedef {object} MssqlAuthentication
 * @property {string} type - Always 'default' for SQL Server authentication
 * @property {object} options - Credentials
 * @property {string} options.userName - SQL Server username
 * @property {string} options.password - SQL Server password
 */

/**
 * @typedef {object} MssqlPoolConfig
 * @property {number} [min] - Minimum pool size (default: 5)
 * @property {number} [max] - Maximum pool size (default: 20)
 * @property {number} [idleTimeoutMillis] - Idle timeout (default: 30000)
 * @property {number} [acquireTimeoutMillis] - Acquire timeout (default: 10000)
 */

// Example
{
  backend: 'mssql',
  databases: {
    default: {
      server: 'localhost',
      database: 'myapp',
      authentication: {
        type: 'default',
        options: {
          userName: 'sa',
          password: 'password'
        }
      },
      pool: {
        min: 5,
        max: 20
      },
      options: {
        trustServerCertificate: true,
        connectTimeout: 15000
      }
    }
  }
}
```

### Health Check Configuration

```javascript
/**
 * @typedef {object} HealthCheckConfig
 * @property {boolean} [enabled] - Enable periodic health checks (default: true)
 * @property {number} [intervalMs] - Check interval in milliseconds (default: 30000)
 * @property {number} [queryMs] - Query timeout in milliseconds (default: 5000)
 */

// Example
{
  healthCheck: {
    enabled: true,
    intervalMs: 30000,
    queryMs: 5000
  }
}
```

### Validation Rules

Create validation function in `src/database/validation.js`:

```javascript
/**
 * Validates database configuration.
 * Throws ConfigurationError if validation fails.
 *
 * @param {object} config - Configuration object to validate
 * @throws {ConfigurationError} If configuration is invalid
 */
export function validateDatabaseConfig(config) {
  // Validate backend
  if (!config.backend) {
    throw new ConfigurationError('backend is required', { config });
  }
  if (!['mssql', 'sqlite'].includes(config.backend)) {
    throw new ConfigurationError(
      `backend must be 'mssql' or 'sqlite', got '${config.backend}'`,
      { config }
    );
  }

  // Validate databases object
  if (!config.databases || typeof config.databases !== 'object') {
    throw new ConfigurationError('databases must be a non-empty object', { config });
  }
  if (Object.keys(config.databases).length === 0) {
    throw new ConfigurationError('at least one database must be configured', { config });
  }

  // Validate each database config
  for (const [dbName, dbConfig] of Object.entries(config.databases)) {
    validateDatabaseConfigForBackend(dbName, dbConfig, config.backend);
  }

  // Validate health check config (if present)
  if (config.healthCheck) {
    validateHealthCheckConfig(config.healthCheck);
  }
}

/**
 * Validates a specific database configuration based on backend type.
 */
function validateDatabaseConfigForBackend(name, dbConfig, backend) {
  if (!dbConfig || typeof dbConfig !== 'object') {
    throw new ConfigurationError(
      `Database '${name}' configuration must be an object`,
      { name, dbConfig }
    );
  }

  if (backend === 'sqlite') {
    // SQLite validations
    if (dbConfig.filename !== undefined && typeof dbConfig.filename !== 'string') {
      throw new ConfigurationError(
        `Database '${name}': filename must be a string`,
        { name, dbConfig }
      );
    }
    if (dbConfig.timeout !== undefined && typeof dbConfig.timeout !== 'number') {
      throw new ConfigurationError(
        `Database '${name}': timeout must be a number`,
        { name, dbConfig }
      );
    }
  } else if (backend === 'mssql') {
    // MSSQL validations
    if (!dbConfig.server || typeof dbConfig.server !== 'string') {
      throw new ConfigurationError(
        `Database '${name}': server is required and must be a string`,
        { name, dbConfig }
      );
    }
    if (!dbConfig.database || typeof dbConfig.database !== 'string') {
      throw new ConfigurationError(
        `Database '${name}': database is required and must be a string`,
        { name, dbConfig }
      );
    }
    if (!dbConfig.authentication || typeof dbConfig.authentication !== 'object') {
      throw new ConfigurationError(
        `Database '${name}': authentication is required`,
        { name, dbConfig }
      );
    }
    if (dbConfig.authentication.type !== 'default') {
      throw new ConfigurationError(
        `Database '${name}': authentication.type must be 'default'`,
        { name, dbConfig }
      );
    }
    const opts = dbConfig.authentication.options;
    if (!opts || !opts.userName || !opts.password) {
      throw new ConfigurationError(
        `Database '${name}': authentication.options.userName and password are required`,
        { name, dbConfig }
      );
    }
  }
}

/**
 * Validates health check configuration.
 */
function validateHealthCheckConfig(healthCheck) {
  if (typeof healthCheck !== 'object') {
    throw new ConfigurationError('healthCheck must be an object', { healthCheck });
  }
  if (healthCheck.enabled !== undefined && typeof healthCheck.enabled !== 'boolean') {
    throw new ConfigurationError('healthCheck.enabled must be a boolean', { healthCheck });
  }
  if (healthCheck.intervalMs !== undefined && typeof healthCheck.intervalMs !== 'number') {
    throw new ConfigurationError('healthCheck.intervalMs must be a number', { healthCheck });
  }
  if (healthCheck.queryMs !== undefined && typeof healthCheck.queryMs !== 'number') {
    throw new ConfigurationError('healthCheck.queryMs must be a number', { healthCheck });
  }
}
```

---

## 3. JSDoc Conventions

Since we're using ESM without TypeScript, JSDoc is our primary documentation and type-hinting mechanism.

### Type Definitions

Use `@typedef` for complex types:

```javascript
/**
 * Result set from a query - an array of objects where each object
 * represents one row from the result set.
 * @typedef {Array<object>} ResultSet
 */

/**
 * Execution result from a non-query statement (INSERT, UPDATE, DELETE).
 * @typedef {object} ExecutionResult
 * @property {number} rowsAffected - Number of rows affected by the operation
 */

/**
 * Database status information.
 * @typedef {object} DatabaseStatus
 * @property {boolean} healthy - Whether the database is currently accessible
 * @property {string} backend - Backend type ('mssql' or 'sqlite')
 * @property {object} databases - Status of each named database
 * @property {object} databases.{name} - Status object for named database
 * @property {boolean} databases.{name}.connected - Connection status
 * @property {string} [databases.{name}.error] - Error message if disconnected
 * @property {number} databases.{name}.poolSize - Number of active connections (MSSQL only)
 */
```

### Interface Documentation

Document interfaces as classes with JSDoc method signatures:

```javascript
/**
 * Core database interface.
 * All database adapters must implement these methods.
 */
export class IDatabase {
  /**
   * Execute a SELECT query.
   * @param {string} sql - SQL query string with ? placeholders for params
   * @param {Array} [params] - Query parameters (positional)
   * @param {string} [databaseName] - Named database (default: 'default')
   * @returns {Promise<ResultSet>} Array of result objects
   * @throws {ConnectionError} If database connection fails
   * @throws {QueryTimeoutError} If query exceeds timeout
   * @throws {QueryError} If SQL is invalid or execution fails
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * const results = await db.query('SELECT * FROM users WHERE id = ?', [123]);
   */
  async query(sql, params, databaseName) {
    throw new Error('Not implemented');
  }

  /**
   * Execute a non-query statement (INSERT, UPDATE, DELETE).
   * @param {string} sql - SQL statement with ? placeholders for params
   * @param {Array} [params] - Statement parameters (positional)
   * @param {string} [databaseName] - Named database (default: 'default')
   * @returns {Promise<ExecutionResult>} Result with rowsAffected
   * @throws {ConnectionError} If database connection fails
   * @throws {QueryTimeoutError} If query exceeds timeout
   * @throws {QueryError} If SQL is invalid or execution fails
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * const result = await db.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
   * console.log(`Inserted ${result.rowsAffected} row(s)`);
   */
  async execute(sql, params, databaseName) {
    throw new Error('Not implemented');
  }

  /**
   * Acquire a connection from the pool for manual transaction management.
   * @param {string} [databaseName] - Named database (default: 'default')
   * @returns {Promise<IConnection>} Connection object for manual operations
   * @throws {ConnectionError} If connection cannot be acquired
   * @throws {PoolExhaustedError} If pool has no available connections (MSSQL)
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * const conn = await db.getConnection();
   * try {
   *   const results = await conn.query('SELECT ...', []);
   *   await conn.release();
   * } catch (err) {
   *   await conn.release();
   *   throw err;
   * }
   */
  async getConnection(databaseName) {
    throw new Error('Not implemented');
  }

  /**
   * Release a connection back to the pool.
   * @param {IConnection} connection - Connection to release
   * @returns {Promise<void>}
   * @throws {Error} If connection is invalid
   */
  async releaseConnection(connection) {
    throw new Error('Not implemented');
  }

  /**
   * Begin a transaction.
   * @param {IConnection} [connection] - Existing connection for transaction
   *                                     (if omitted, new connection acquired)
   * @returns {Promise<ITransaction>} Transaction object
   * @throws {TransactionError} If transaction cannot be started
   * @throws {ConnectionError} If connection cannot be acquired
   */
  async beginTransaction(connection) {
    throw new Error('Not implemented');
  }

  /**
   * Check if the database is currently accessible.
   * @returns {Promise<boolean>} True if database is accessible
   * @example
   * if (await db.isHealthy()) {
   *   console.log('Database is ready');
   * }
   */
  async isHealthy() {
    throw new Error('Not implemented');
  }

  /**
   * Get detailed status information about the database.
   * @returns {Promise<DatabaseStatus>} Status object
   * @example
   * const status = await db.getStatus();
   * console.log(status.databases.default.connected);
   */
  async getStatus() {
    throw new Error('Not implemented');
  }

  /**
   * Close all database connections and cleanup resources.
   * Must be called before application shutdown.
   * @returns {Promise<void>}
   * @throws {Error} If errors occur during shutdown
   */
  async close() {
    throw new Error('Not implemented');
  }
}

/**
 * Connection interface for manual connection management.
 */
export class IConnection {
  /**
   * Execute a SELECT query on this connection.
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} [params] - Query parameters
   * @returns {Promise<ResultSet>}
   * @throws {QueryError} If query fails
   */
  async query(sql, params) {
    throw new Error('Not implemented');
  }

  /**
   * Execute a non-query statement on this connection.
   * @param {string} sql - SQL statement with ? placeholders
   * @param {Array} [params] - Statement parameters
   * @returns {Promise<ExecutionResult>}
   * @throws {QueryError} If statement fails
   */
  async execute(sql, params) {
    throw new Error('Not implemented');
  }

  /**
   * Release this connection back to the pool.
   * @returns {Promise<void>}
   */
  async release() {
    throw new Error('Not implemented');
  }
}

/**
 * Transaction interface for transaction management.
 */
export class ITransaction {
  /**
   * Execute a SELECT query within this transaction.
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} [params] - Query parameters
   * @returns {Promise<ResultSet>}
   * @throws {QueryError} If query fails
   */
  async query(sql, params) {
    throw new Error('Not implemented');
  }

  /**
   * Execute a non-query statement within this transaction.
   * @param {string} sql - SQL statement with ? placeholders
   * @param {Array} [params] - Statement parameters
   * @returns {Promise<ExecutionResult>}
   * @throws {QueryError} If statement fails
   */
  async execute(sql, params) {
    throw new Error('Not implemented');
  }

  /**
   * Commit the transaction.
   * @returns {Promise<void>}
   * @throws {TransactionError} If commit fails
   */
  async commit() {
    throw new Error('Not implemented');
  }

  /**
   * Rollback the transaction.
   * @returns {Promise<void>}
   * @throws {TransactionError} If rollback fails
   */
  async rollback() {
    throw new Error('Not implemented');
  }
}
```

### Regular Functions

```javascript
/**
 * Create a database client for the given configuration.
 *
 * Validates configuration, initializes the appropriate adapter,
 * and returns a ready-to-use database client.
 *
 * @param {object} config - Database configuration object
 * @param {string} config.backend - 'mssql' or 'sqlite'
 * @param {object} config.databases - Named database configurations
 * @param {object} [config.healthCheck] - Optional health check config
 * @returns {Promise<IDatabase>} Initialized database client
 * @throws {ConfigurationError} If configuration is invalid
 * @throws {ConnectionError} If database cannot be initialized
 * @example
 * const db = await createDatabaseClient({
 *   backend: 'sqlite',
 *   databases: {
 *     default: { filename: ':memory:' }
 *   }
 * });
 * 
 * try {
 *   const users = await db.query('SELECT * FROM users', []);
 *   console.log(users);
 * } finally {
 *   await db.close();
 * }
 */
export async function createDatabaseClient(config) {
  // Implementation
}
```

### JSDoc Best Practices

1. **Always include @param and @returns**
   ```javascript
   /**
    * Good: Clear parameter and return types
    * @param {string} name - User name
    * @param {number} age - User age in years
    * @returns {Promise<User>} Created user object
    */
   ```

2. **Use @throws for errors**
   ```javascript
   /**
    * @throws {ValidationError} If input is invalid
    * @throws {ConnectionError} If database unavailable
    */
   ```

3. **Include @example for complex functions**
   ```javascript
   /**
    * @example
    * const result = await doSomething(arg1, arg2);
    * console.log(result);
    */
   ```

4. **Document async operations clearly**
   ```javascript
   /**
    * Note: This is async and must be awaited
    * @returns {Promise<ResultSet>}
    */
   async function query(sql, params) { }
   ```

---

## 4. Development Setup Guide

### Initial Setup

1. **Create directory structure**:
   ```bash
   mkdir -p packages/api-core/src/database/adapters
   mkdir -p packages/api-core/tests/database/adapters
   ```

2. **Create Phase 1 files** (in order):
   - `src/database/errors.js` - Error classes
   - `src/database/validation.js` - Configuration validation
   - `src/database/interface.js` - Interface definitions
   - `src/database/adapters/sqlite.js` - SQLite adapter
   - `src/database/connection-manager.js` - Connection manager
   - `src/database/index.js` - Factory function

### Running Tests

```bash
# Run all tests
npm test

# Run only database tests
npm test -- packages/api-core/tests/database

# Run with coverage
npm test -- --coverage packages/api-core

# Watch mode for development
npm test -- --watch
```

### Testing with SQLite

SQLite makes testing easy:

```javascript
// Create in-memory database for each test
beforeEach(async () => {
  db = await createDatabaseClient({
    backend: 'sqlite',
    databases: {
      default: { filename: ':memory:' }
    }
  });
});

afterEach(async () => {
  if (db) {
    await db.close();
  }
});

it('should query users', async () => {
  // Test code
});
```

### Debugging

1. **Enable debug logging**:
   ```bash
   DEBUG=api-core:* npm test
   ```

2. **Use Node debugger**:
   ```bash
   node --inspect-brk node_modules/.bin/mocha packages/api-core/tests/database/*.spec.js
   ```

3. **Log important operations**:
   ```javascript
   import debug from 'debug';
   const log = debug('api-core:database');
   
   log('Initializing SQLite adapter', { filename });
   ```

### Code Coverage

Target minimum coverage for Phase 1:
- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

View coverage report:
```bash
npm test -- --coverage packages/api-core
# Opens coverage/lcov-report/index.html
```

### Linting

```bash
# Lint database code
npm run lint packages/api-core/src/database

# Lint tests
npm run lint packages/api-core/tests/database
```

### Integration with Root Package

The api-core package is part of a monorepo with shared tooling:

- **ESLint config**: `eslint.config.js` (root)
- **Test framework**: Mocha + Chai + Sinon (shared)
- **Coverage tool**: c8 (shared)
- **Node version**: >=20.0.0 (required)

### Branch Management

All Phase 1 work should be on the `feature/database_abstraction` branch:

```bash
# Ensure you're on the right branch
git checkout feature/database_abstraction

# Keep it up to date
git pull origin feature/database_abstraction

# Push changes regularly
git push origin feature/database_abstraction
```

### Common Development Tasks

**Creating a test file**:
```bash
# tests/database/adapters/sqlite.spec.js
import { expect } from 'chai';
import { createDatabaseClient } from '../../../src/database/index.js';

describe('SQLite Adapter', () => {
  let db;

  beforeEach(async () => {
    db = await createDatabaseClient({
      backend: 'sqlite',
      databases: { default: { filename: ':memory:' } }
    });
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('should execute queries', async () => {
    // Your test
  });
});
```

**Adding a new error type**:
1. Add to `src/database/errors.js`
2. Update `src/database/validation.js` if needed
3. Document where it's thrown in JSDoc
4. Add test case for the error

**Running a single test**:
```bash
npm test -- --grep "should execute queries"
```

---

## Implementation Checklist

Use this checklist to track Phase 1 progress:

### Week 1

- [x] **Phase 1 Item 1: Interfaces & Error Handling (Days 1-2)** ✅ COMPLETE
  - [x] Create error hierarchy in `src/database/errors.js` (9 error classes + helpers)
  - [x] Create interface definitions in `src/database/interface.js` (IDatabase, IConnection, ITransaction)
  - [x] Write comprehensive JSDoc for all interfaces and errors
  - [x] Create documentation: DATABASE_ARCHITECTURE.md, ERROR_HANDLING.md
  - [x] Verify ESLint passes

- [ ] **Phase 1 Item 2: SQLite Adapter (Days 3-4)**
  - [ ] Implement `src/database/adapters/sqlite.js`
  - [ ] Implement `query()` method with parameter support
  - [ ] Implement `execute()` method with rowsAffected
  - [ ] Implement `getConnection()` and `releaseConnection()`
  - [ ] Implement `beginTransaction()` for transactions
  - [ ] Implement `isHealthy()` and `getStatus()` methods
  - [ ] Write comprehensive adapter tests
  - [ ] Achieve 90%+ code coverage for adapter

- [ ] **Phase 1 Item 3: Connection Manager & Factory (Day 5)**
  - [ ] Implement `src/database/connection-manager.js` (pool singleton per database)
  - [ ] Implement `src/database/index.js` factory function
  - [ ] Write integration tests
  - [ ] Verify all error cases handled correctly
  - [ ] Achieve 90%+ overall code coverage

- [ ] **End of Week**
  - [ ] All tests passing (unit + integration)
  - [ ] Code coverage 90%+ (statements, branches, functions, lines)
- Phase 2: MSSQL Adapter implementation
- Phase 3: Integration with `createApiApp()`
- Phase 4: Production hardening

