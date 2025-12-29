# api-core Database Architecture Plan

## Overview

The api-core package provides a configurable database abstraction layer that supports multiple database backends. **MSSQL is the primary production backend** with opinionated connection pooling and multi-database support. **SQLite is used for development and testing** without requiring external dependencies.

This design enables:
- Development/testing without MSSQL setup
- Production deployments with enterprise-grade MSSQL connection management
- Multi-database scenarios within a single API instance
- Clean separation of concerns between database I/O and business logic

---

## Design Principles

1. **Factory Pattern**: All database components are created via factory functions, not singletons (except connection pools)
2. **Abstraction**: Database adapters implement a common interface; route handlers are backend-agnostic
3. **Configuration-Driven**: Database backend selection and multi-database routing are determined by configuration
4. **Opinionated for MSSQL**: Connection pooling, timeout handling, and multi-database management follow best practices established for MSSQL
5. **Zero Dependencies for SQLite**: Development/testing requires no external packages beyond Node.js built-ins
6. **Connection Pool Singletons**: Each MSSQL named database connection maintains exactly one connection pool instance for its lifetime, ensuring optimal resource management and query queuing

---

## Architecture Components

### 1. Database Abstraction Interface

**Location**: `src/database/interface.js` ✅ COMPLETE

Defines the contract that all database adapters must implement. Full JSDoc with examples in [interface.js](../../src/database/interface.js).

---

### 2. Error Handling

**Location**: `src/database/errors.js` ✅ COMPLETE

Custom error hierarchy with Express middleware compatibility:

- **DatabaseError** (base class) - All database errors extend this
- **ConnectionError** (503) - Connection failures
- **QueryTimeoutError** (504) - Query timeout
- **QueryError** (400) - Invalid SQL or execution failure
- **ConfigurationError** (400) - Invalid configuration
- **PoolExhaustedError** (503) - No available connections
- **DatabaseNotFoundError** (400) - Unknown database name
- **TransactionError** (500) - Transaction operation failure
- **PermissionError** (403) - Insufficient permissions
- **InternalDatabaseError** (500) - Driver/database error

All errors include `statusCode` for Express middleware routing and `context` for debugging without exposing credentials.

Helper functions: `isDatabaseError()`, `isClientError()`, `isServerError()`

**For comprehensive error handling patterns and Express integration, see [ERROR_HANDLING.md](ERROR_HANDLING.md)**.

---

### 3. Connection Manager

**Location**: `src/database/connection-manager.js` (Phase 1 Item 3)

Central manager for all database connections. Handles:

- **Multi-database routing**: Named database connections (e.g., `default`, `secondary`, `reporting`)
- **Connection pooling**: Acquires and releases connections from pools (implementation varies by adapter)
- **Pool singleton lifecycle**: Ensures one connection pool per named MSSQL database for application lifetime
- **Health monitoring**: Periodic connection validation across all pools
- **Configuration validation**: Ensures required settings at startup
- **Lifecycle management**: Clean shutdown of all connection pools

**Responsibilities**:
- Accept configuration for multiple named databases
- Instantiate the appropriate adapter based on backend type
- Route `query(name, sql, params)` calls to the named database via its singleton pool
- Provide fallback to default database if name not specified
- Expose health check and status endpoints
- Ensure pool singletons are created once and reused for application lifetime
- Coordinate shutdown of all pools on application termination

**Configuration Structure**:

```javascript
{
  backend: 'mssql' | 'sqlite', // Required
  databases: {
    default: { /* backend-specific config */ },
    secondary: { /* backend-specific config */ },
    reporting: { /* backend-specific config */ }
  },
  healthCheck: {
    enabled: true,
    intervalMs: 30000,
    queryMs: 5000
  }
}
```

---

### 3. SQLite Adapter (Development/Testing)

**Location**: `src/database/adapters/sqlite.js` ✅ COMPLETE

A lightweight adapter using Node.js built-in `node:sqlite` module.

**Features**:
- Single or multiple file-based databases
- In-memory database option (`:memory:`) for isolated tests
- No external dependencies
- Simple query execution without pooling (SQLite single-file model doesn't require it)
- Synchronous operations wrapped in promises
- Each named database is an independent instance (no pooling singleton needed)

**Configuration Options**:

```javascript
{
  backend: 'sqlite',
  databases: {
    default: {
      filename: ':memory:' // or './data/dev.db'
    },
    test: {
      filename: ':memory:'
    }
  }
}
```

**Behavior**:
- Creates in-memory database for each test run by default
- Optional file persistence for development
- No connection pooling (SQLite's write-lock model doesn't require it)
- All operations treated as independent connections

---

### 4. MSSQL Adapter (Production)

**Location**: `src/database/adapters/mssql.js` (template)

Reference implementation using the `mssql` npm package (peer dependency).

**Features**:
- **Connection pool singletons**: One connection pool instance per named MSSQL database for entire application lifetime
- Multi-database support via named connections (each maintains its own pool singleton)
- Stored procedure execution helpers
- Transaction support
- Connection validation and retry logic
- Configurable timeout handling

**Connection Pool Singleton Pattern**:

Each named database connection creates a single connection pool instance upon first use, which persists for the application lifetime:

```javascript
// Internal pool management (singleton per database name)
const pools = {}; // { 'default': Pool, 'secondary': Pool, 'reporting': Pool }

function getPool(databaseName) {
  if (!pools[databaseName]) {
    // Create pool on first access - singleton for this database
    pools[databaseName] = createMssqlPool(config.databases[databaseName]);
  }
  return pools[databaseName];
}
```

**Benefits**:
- All queries to same database reuse same pool, avoiding connection creation overhead
- Query queuing is consistent and predictable
- Pool metrics and monitoring are per-database
- Resource management is efficient across application lifetime
- Clean shutdown releases all pools together

**Opinionated Pooling Defaults**:

```javascript
{
  min: 5,              // Minimum pool size
  max: 20,             // Maximum pool size
  idleTimeoutMillis: 30000,  // Connection timeout
  acquireTimeoutMillis: 10000, // Acquire timeout
  reapIntervalMillis: 1000,    // Reaping interval
  createTimeoutMillis: 30000
}
```

**Configuration Structure**:

```javascript
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
    },
    reporting: {
      // Separate connection pool for reporting database
      server: 'reporting-server',
      database: 'analytics',
      // ... other config
    }
  }
}
```

**Multi-Database Routing**:
- Each named database maintains its own connection pool
- Queries routed to correct database by name
- Default database used if name not specified
- Enables queries against multiple MSSQL databases from single API instance

**Stored Procedure Helpers** (implemented in adapter):

```javascript
execStoredProc(name, params, databaseName?) 
  → { inputs, outputs, recordsets }
```

---

## Why Singleton Pools?

This section explains the rationale behind enforcing singleton connection pools per named database in MSSQL environments.

### The Problem: Multiple Pools Per Database

If each controller (or route handler, or service) creates its own connection pool to the same database, serious problems arise:

```javascript
// ❌ BAD: Each controller creates its own pool
// users-controller.js
const pool = new sql.ConnectionPool(config);
await pool.connect();

// orders-controller.js
const pool = new sql.ConnectionPool(config);
await pool.connect();

// products-controller.js
const pool = new sql.ConnectionPool(config);
await pool.connect();
```

### Consequences of Multiple Pools

| Issue | Impact |
|-------|--------|
| **Connection exhaustion** | Each pool maintains `min` connections. 3 pools × 5 min = 15 idle connections. With 20 controllers, you're at 100+ connections before any traffic. MSSQL has hard limits (default ~32,767, but often capped lower by licensing/resources). |
| **No query queuing across pools** | Pool A has 10 busy connections while Pool B sits idle. Work isn't distributed—each pool queues independently. |
| **Memory overhead** | Each pool allocates buffers, maintains state, runs health checks. Multiply by number of pools. |
| **Unpredictable behavior under load** | Some controllers starve while others have excess capacity. No global backpressure. |
| **Connection thrashing** | Pools scale up/down independently, causing constant connect/disconnect churn on the database server. |
| **Monitoring blind spots** | Can't get accurate metrics on "how many connections to database X?" when spread across pools. |
| **Shutdown complexity** | Must track and close every pool. Miss one and connections leak, preventing graceful shutdown. |

### Real-World Example

An API with 15 controllers, each hitting the same database:

| Approach | Min Connections | Max Connections | Pools to Manage |
|----------|-----------------|-----------------|-----------------|
| Pool per controller | 75 (15 × 5) | 150 (15 × 10) | 15 |
| Singleton pool | 5 | 10 | 1 |

The singleton approach uses **93% fewer idle connections** and has a single point of monitoring and control.

### Why Module Caching Doesn't Help

A common misconception is that using the same variable name `pool` in each controller will result in sharing the same instance due to Node.js module caching. **This is incorrect.**

```javascript
// ❌ STILL BAD: Same variable name, different instances
// users-controller.js
const pool = new sql.ConnectionPool(config);

// orders-controller.js
const pool = new sql.ConnectionPool(config);
```

**Why it doesn't work:**

1. **Each file is a separate module** with its own scope
2. **`new` always creates a new instance** regardless of variable name
3. **Module caching only caches the module's exports**, not internal variables

When Node.js loads `users-controller.js`, it caches that module. But the `const pool = new sql.ConnectionPool(config)` line **executes fresh** when the module loads—creating a brand new pool instance in that module's scope.

### What Module Caching Actually Does

```javascript
// database.js
import sql from 'mssql';
const pool = new sql.ConnectionPool(config);
export { pool };

// users-controller.js
import { pool } from './database.js'; // Gets cached export

// orders-controller.js
import { pool } from './database.js'; // Gets SAME cached export
```

**This works** because:
1. `database.js` loads once, creates one pool, exports it
2. Subsequent `import` statements return the **cached exports**
3. All controllers reference the **same pool instance**

### Our Architecture's Approach

The connection manager uses an explicit singleton pattern rather than relying on module caching behavior (which can break in edge cases like different paths to same file, ESM vs CJS, bundlers, etc.):

```javascript
// connection-manager.js
const pools = new Map();

export function getPool(databaseName) {
  if (!pools.has(databaseName)) {
    pools.set(databaseName, new sql.ConnectionPool(config));
  }
  return pools.get(databaseName); // Always same instance for same name
}
```

This explicit check-before-create pattern guarantees singleton behavior regardless of how modules are imported or bundled.

---

### 5. Database Factory Function

**Location**: `src/database/index.js`

Main entry point for creating a database connection manager:

```javascript
createDatabaseClient(config) → Promise<IDatabase>
```

**Responsibilities**:
- Validate configuration
- Instantiate correct adapter based on `config.backend`
- Validate all named databases are accessible
- Return configured connection manager
- Handle errors during initialization

**Usage**:

```javascript
const db = await createDatabaseClient({
  backend: process.env.DB_BACKEND || 'sqlite',
  databases: {
    default: { /* config */ }
  }
});

// Later in route handlers:
const results = await db.query('SELECT * FROM users');
const connection = await db.getConnection('reporting');
```

---

### 6. Integration with createApiApp

**Location**: `src/app.js`

The existing `createApiApp(config)` factory accepts database configuration:

```javascript
createApiApp(config) → { router, health }
```

**Integration approach**:
- Accept `database` property in `config`
- Initialize connection manager at app creation time
- Attach to request context or provide factory function to route handlers
- Provide health check endpoint that includes database status

**Example**:

```javascript
const app = await createApiApp({
  database: {
    backend: 'mssql',
    databases: { /* ... */ }
  },
  jwt: { /* ... */ },
  // ... other config
});
```

---

## Development Workflow

### Local Development (SQLite)

```javascript
// .env
DB_BACKEND=sqlite

// config.js
const dbConfig = {
  backend: 'sqlite',
  databases: {
    default: { filename: ':memory:' } // Or ./data/dev.db
  }
};
```

- No external database setup required
- Fast test cycles
- Data persists in file if desired

### Production Deployment (MSSQL)

```javascript
// .env
DB_BACKEND=mssql
MSSQL_SERVER=prod-server
MSSQL_DATABASE=api
MSSQL_USER=sa
MSSQL_PASSWORD=***

// config.js
const dbConfig = {
  backend: 'mssql',
  databases: {
    default: {
      server: process.env.MSSQL_SERVER,
      database: process.env.MSSQL_DATABASE,
      authentication: { /* ... */ },
      pool: { /* opinionated defaults */ }
    }
  }
};
```

- MSSQL package is required as peer dependency
- Connection pooling managed by mssql library
- Health checks validate pool availability
- Multi-database support for complex deployments

---

## Testing Strategy

### Unit Tests (SQLite)

- Use in-memory databases (`:memory:`)
- Each test gets isolated database
- Fast execution, no cleanup delays
- No external dependencies

### Integration Tests

- Use file-based SQLite databases
- Schema initialization before each test
- Optional: parallel test isolation via separate database files

### Schema Management

- Separate concern from database abstraction
- Migrations handled by consuming applications
- api-core provides helper utilities for initialization if needed
- SQLite and MSSQL schemas defined by implementers

---

## Peer Dependencies

`api-core` declares in `package.json`:

```json
{
  "peerDependencies": {
    "mssql": "^9.0.0 or compatible version"
  }
}
```

- **mssql** is optional; only required if using MSSQL backend in production
- Development/testing uses only Node.js built-ins (sqlite)
- Clear error message if MSSQL backend is selected but package not installed

---

## File Structure

```
packages/api-core/
├── src/
│   ├── app.js                    (existing: main factory)
│   ├── database/
│   │   ├── index.js              (createDatabaseClient factory)
│   │   ├── interface.js          (IDatabase, IConnection, ITransaction)
│   │   ├── connection-manager.js (routes to named databases)
│   │   └── adapters/
│   │       ├── sqlite.js         (SQLite implementation)
│   │       └── mssql.js          (MSSQL reference template)
│   └── middleware/               (existing/future)
├── tests/
│   ├── database/
│   │   ├── connection-manager.spec.js
│   │   ├── adapters/
│   │   │   ├── sqlite.spec.js
│   │   │   └── mssql.spec.js
│   │   └── helpers/
│   └── app.spec.js
├── DATABASE_ARCHITECTURE.md      (this file)
├── package.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Database Abstraction (Week 1) ✅ COMPLETE

**Phase 1 Item 1: Interfaces & Error Handling** ✅ COMPLETE
- [x] Define IDatabase, IConnection, ITransaction interfaces in `src/database/interface.js`
- [x] Implement error hierarchy with HTTP status codes in `src/database/errors.js`
- [x] Create comprehensive documentation (PHASE_1_GUIDE.md, ERROR_HANDLING.md)
- [x] Verify all code passes ESLint

**Phase 1 Item 2: SQLite Adapter** ✅ COMPLETE
- [x] Implement `src/database/adapters/sqlite.js`
- [x] Implement connection acquisition and release
- [x] Implement transaction management
- [x] Write comprehensive tests (32 tests, 94.49% statement coverage)

**Phase 1 Item 3: Connection Manager & Factory** ✅ COMPLETE
- [x] Implement `src/database/validation.js` (configuration validation)
- [x] Implement `src/database/connection-manager.js` (backend-agnostic multi-database routing)
- [x] Create factory function `createDatabaseClient()` in `src/database/index.js`
- [x] Write integration tests (110 tests total, 94.46% statement coverage)
- [x] Achieve 90%+ code coverage (94.46% statements, 92.47% branches, 98.11% functions)

### Phase 2: MSSQL Adapter (Week 2)
- [ ] Create MSSQL adapter reference implementation
- [ ] Implement connection pooling
- [ ] Implement multi-database routing
- [ ] Add stored procedure helpers

### Phase 3: Integration & Testing (Week 3)
- [ ] Integrate database client into `createApiApp()`
- [ ] Write comprehensive test suite using SQLite
- [ ] Add health check endpoints
- [ ] Document configuration patterns

### Phase 4: Production Readiness (Week 4)
- [ ] Finalize peer dependency handling
- [ ] Error handling and retry logic
- [ ] Documentation for implementers
- [ ] Example configurations

---

## Key Decisions

1. **MSSQL is production-only**: Not included as dependency; implementers must install
2. **SQLite for all development**: Zero-config, no external services
3. **Factory pattern throughout**: Composability and testability (except connection pools, which are singletons)
4. **Configuration-driven routing**: Multi-database support via named connections
5. **Opinionated pooling**: MSSQL defaults follow best practices
6. **Connection pool singletons**: Each named MSSQL database maintains exactly one pool for application lifetime, preventing resource exhaustion and ensuring consistent query queuing
7. **Separation of concerns**: Database layer is independent of HTTP/Express layer
8. **Stored procedures first**: MSSQL stored procedures with chained input/output parameters are the primary data access pattern
9. **Error-first design**: All errors extend Error with statusCode for Express middleware; client errors (4xx) vs server errors (5xx) clearly distinguished
10. **OOP/functional hybrid**: Interfaces document contracts; factory functions provide composition; Error inheritance for idiomatic JavaScript

### Phase 1 Item 3: Connection Manager & Factory Design Decisions

The following decisions were made for implementing the connection manager and factory function:

11. **Validation module separation**: Configuration validation is implemented in a dedicated `src/database/validation.js` module rather than inline within the connection manager. This promotes:
    - Single responsibility: Validation logic is isolated and testable
    - Reusability: Validators can be called from factory, adapters, or CLI tools
    - Clarity: Validation rules are documented in one place

12. **Error propagation from adapters**: The factory function (`createDatabaseClient`) catches only configuration validation errors. Adapter initialization errors (connection failures, permission issues) propagate directly to the caller. This ensures:
    - Clear error attribution: Errors identify their source (validation vs adapter)
    - No error masking: Original stack traces and error types are preserved
    - Consistent handling: All adapter errors follow the same error hierarchy

13. **Opt-in health monitoring**: Periodic health checks (via `setInterval`) are opt-in via configuration (`healthCheck.enabled: true`). By default, no background tasks are started. This prevents:
    - Test pollution: Unit tests don't have dangling timers
    - Resource waste: Applications that don't need periodic checks don't pay for them
    - Shutdown complexity: Fewer background processes to coordinate during cleanup

14. **Backend-agnostic connection manager**: The connection manager delegates all pooling decisions to individual adapters. SQLite adapters manage database file handles directly; MSSQL adapters maintain pool singletons internally. The connection manager only:
    - Routes requests to the correct named database
    - Validates database names exist in configuration
    - Coordinates shutdown across all adapters
    - Exposes unified health/status aggregation

---

## MSSQL Stored Procedure Support

### First-Class Citizen

The api-core database layer is designed with **MSSQL stored procedures as the primary data access pattern**. While `query()` and `execute()` support ad-hoc SQL for flexibility and testing, production applications should leverage stored procedures for:

- **Performance**: Compiled execution plans, reduced network round-trips
- **Security**: Parameterized by design, reduced SQL injection surface
- **Maintainability**: Business logic in the database, versioned with schema
- **Separation of concerns**: API handles HTTP, database handles data logic

### Chained Input/Output Parameters

MSSQL stored procedures with **named parameters** and **OUTPUT chaining** work natively—no string manipulation or parameter rewriting:

```javascript
// MSSQL adapter passes parameters directly to mssql package
// Full support for INPUT, OUTPUT, and INPUT/OUTPUT parameters

// Example: Create user and return generated ID via OUTPUT
const result = await db.execute(
  'EXEC usp_CreateUser @name = @name, @email = @email, @userId = @userId OUTPUT',
  { 
    name: 'Alice', 
    email: 'alice@example.com',
    userId: { type: 'INT', output: true }  // OUTPUT parameter
  }
);
console.log(`Created user ID: ${result.output.userId}`);

// Example: Transfer funds with multiple OUTPUT values
const result = await db.execute(
  `EXEC usp_TransferFunds 
     @fromAccount = @fromAccount, 
     @toAccount = @toAccount, 
     @amount = @amount,
     @newFromBalance = @newFromBalance OUTPUT,
     @newToBalance = @newToBalance OUTPUT,
     @transactionId = @transactionId OUTPUT`,
  {
    fromAccount: 1001,
    toAccount: 1002,
    amount: 250.00,
    newFromBalance: { type: 'DECIMAL', output: true },
    newToBalance: { type: 'DECIMAL', output: true },
    transactionId: { type: 'UNIQUEIDENTIFIER', output: true }
  }
);
console.log(`Transfer ${result.output.transactionId} complete`);
console.log(`From balance: ${result.output.newFromBalance}`);
console.log(`To balance: ${result.output.newToBalance}`);

// Example: Stored procedure returning multiple result sets
const result = await db.execute(
  'EXEC usp_GetUserDashboard @userId = @userId',
  { userId: 123 }
);
// result.recordsets[0] = user profile
// result.recordsets[1] = recent orders
// result.recordsets[2] = notifications
```

### Parameter Types

The MSSQL adapter supports all SQL Server data types for parameters:

| Type | JavaScript | Notes |
|------|------------|-------|
| `INT`, `BIGINT` | `number` | Integer values |
| `DECIMAL`, `MONEY` | `number` | Decimal values |
| `VARCHAR`, `NVARCHAR` | `string` | Text (NVARCHAR for Unicode) |
| `BIT` | `boolean` | True/false |
| `DATETIME`, `DATE` | `Date` or `string` | ISO 8601 strings accepted |
| `UNIQUEIDENTIFIER` | `string` | UUID/GUID format |
| `VARBINARY` | `Buffer` | Binary data |
| `TABLE` | `Array<object>` | Table-valued parameters |

### OUTPUT Parameter Syntax

```javascript
// Simple OUTPUT (type inferred from stored procedure)
{ paramName: { output: true } }

// Explicit type OUTPUT
{ paramName: { type: 'INT', output: true } }

// INPUT/OUTPUT (provide value, receive modified value)
{ paramName: { type: 'INT', value: 100, output: true } }
```

### SQLite Equivalent: Pseudo-Procedures

For development and testing with SQLite, create JavaScript modules that mirror stored procedure behavior:

```javascript
// src/database/procedures/usp_CreateUser.js
/**
 * Pseudo stored procedure: Create user with audit logging
 * Mirrors MSSQL usp_CreateUser behavior for SQLite testing
 * 
 * @param {IDatabase} db - Database client
 * @param {object} params - Named parameters matching MSSQL signature
 * @param {string} params.name - User name
 * @param {string} params.email - User email
 * @returns {Promise<{output: {userId: number}}>}
 */
export async function usp_CreateUser(db, { name, email }) {
  const txn = await db.beginTransaction();
  
  try {
    const userResult = await txn.execute(
      'INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)',
      [name, email, new Date().toISOString()]
    );
    
    const userId = userResult.lastInsertRowid;
    
    await txn.execute(
      'INSERT INTO audit_log (entity_type, entity_id, action, created_at) VALUES (?, ?, ?, ?)',
      ['user', userId, 'created', new Date().toISOString()]
    );
    
    await txn.commit();
    
    return {
      output: { userId },
      recordset: [{ userId, name, email }]
    };
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}
```

```javascript
// Usage in tests (SQLite)
import { usp_CreateUser } from './database/procedures/usp_CreateUser.js';

const result = await usp_CreateUser(db, { name: 'Alice', email: 'alice@example.com' });
console.log(`Created user ID: ${result.output.userId}`);
```

### Why This Matters

Developers familiar with MSSQL stored procedures can:

1. **Use familiar patterns** - Named parameters, OUTPUT chaining, multiple result sets
2. **No performance penalty** - Parameters pass directly to `mssql` package, no string manipulation
3. **Test without MSSQL** - Pseudo-procedures in SQLite mirror production behavior
4. **Gradual migration** - Start with pseudo-procedures, deploy with real stored procedures

---

## Future Considerations

- Schema migration tools (Flyway, Liquibase, or custom)
- Query builders or ORM integration (optional)
- Additional adapters (PostgreSQL, MySQL) if future needs arise
- Connection metrics and monitoring
- Audit logging for database operations
