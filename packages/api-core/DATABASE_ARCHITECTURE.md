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

**Location**: `src/database/interface.js`

Defines the contract that all database adapters must implement:

```
IDatabase {
  // Core operations
  query(sql, params) → Promise<ResultSet[]>
  execute(sql, params) → Promise<ExecutionResult>
  
  // Connection management
  getConnection(databaseName?) → Promise<IConnection>
  releaseConnection(connection) → Promise<void>
  
  // Transactions
  beginTransaction(connection?) → Promise<ITransaction>
  
  // Health/status
  isHealthy() → Promise<boolean>
  getStatus() → Promise<DatabaseStatus>
  
  // Cleanup
  close() → Promise<void>
}

IConnection {
  query(sql, params) → Promise<ResultSet[]>
  execute(sql, params) → Promise<ExecutionResult>
  release() → Promise<void>
}

ITransaction {
  query(sql, params) → Promise<ResultSet[]>
  execute(sql, params) → Promise<ExecutionResult>
  commit() → Promise<void>
  rollback() → Promise<void>
}
```

---

### 2. Connection Manager

**Location**: `src/database/connection-manager.js`

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

**Location**: `src/database/adapters/sqlite.js`

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

### Phase 1: Database Abstraction (Week 1)
- [ ] Define IDatabase, IConnection, ITransaction interfaces
- [ ] Implement SQLite adapter with basic CRUD operations
- [ ] Implement connection manager
- [ ] Create factory function `createDatabaseClient()`

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

---

## Future Considerations

- Schema migration tools (Flyway, Liquibase, or custom)
- Query builders or ORM integration (optional)
- Additional adapters (PostgreSQL, MySQL) if future needs arise
- Connection metrics and monitoring
- Audit logging for database operations
