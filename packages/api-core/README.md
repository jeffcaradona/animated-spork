# @animated-spork/api-core

Core utilities and database abstraction layer for building Express-based API services.

## Overview

`api-core` provides a production-ready database abstraction layer with multi-backend support:

- **SQLite** for local development and testing (zero external dependencies)
- **MSSQL** for production deployments (connection pooling, multi-database support)
- **Unified interface** for backend-agnostic application code
- **Comprehensive error handling** with Express middleware compatibility
- **Configuration validation** with detailed error messages

## Current Status (as of 2025-12-29)

**The api-core package has multiple phases. Currently:**

**Phase 1: Database Abstraction Layer** - ✅ **COMPLETE**

- ✅ Database interfaces and contracts (`IDatabase`, `IConnection`, `ITransaction`)
- ✅ Comprehensive error hierarchy (10 custom error types)
- ✅ SQLite adapter with full feature support
- ✅ Connection manager for multi-database routing
- ✅ Configuration validation with detailed messages
- ✅ Health check infrastructure
- ✅ 110 passing tests with 94.46% code coverage

**Phase 2: MSSQL Adapter** - 🔴 **NOT STARTED**

- 🔴 MSSQL adapter implementation
- 🔴 Connection pooling for production
- 🔴 Stored procedure helpers
- 🔴 Multi-database routing for MSSQL

**Phase 3: Integration & Testing** - 🔴 **NOT STARTED**

- 🔴 Integration with `createApiApp()` factory
- 🔴 Health check endpoints
- 🔴 Configuration patterns documentation

**Phase 4: JWT & Authentication** - 🔴 **NOT STARTED**

- 🔴 JWT signing and verification utilities
- 🔴 `/auth/exchange` endpoint for token issuance
- 🔴 Role-based authorization middleware

See [documentation/PHASE_1_GUIDE.md](./documentation/PHASE_1_GUIDE.md) for implementation details.

## Installation

Since this is a workspace package, dependencies are managed at the root:

```bash
npm install
```

For production MSSQL support, install the peer dependency:

```bash
npm install mssql
```

## Quick Start

### SQLite (Development/Testing)

```javascript
import { createDatabaseClient } from '@animated-spork/api-core/database';

// Create an in-memory database for testing
const db = await createDatabaseClient({
  backend: 'sqlite',
  databases: {
    default: { filename: ':memory:' }
  }
});

// Execute a query
const users = await db.query('SELECT * FROM users WHERE active = ?', [true]);
console.log(users);

// Execute a statement (INSERT, UPDATE, DELETE)
const result = await db.execute(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['Alice', 'alice@example.com']
);
console.log(`Inserted ${result.rowsAffected} row(s)`);

// Clean shutdown
await db.close();
```

### Multi-Database Configuration

```javascript
const db = await createDatabaseClient({
  backend: 'sqlite',
  databases: {
    default: { filename: './data/app.db' },
    analytics: { filename: './data/analytics.db' },
    reporting: { filename: './data/reports.db' }
  }
});

// Query different databases
const users = await db.query('default', 'SELECT * FROM users');
const metrics = await db.query('analytics', 'SELECT * FROM metrics');
const reports = await db.query('reporting', 'SELECT * FROM monthly_reports');
```

### Transactions

```javascript
const tx = await db.beginTransaction();

try {
  await tx.execute('UPDATE accounts SET balance = balance - ? WHERE id = ?', [100, 1]);
  await tx.execute('UPDATE accounts SET balance = balance + ? WHERE id = ?', [100, 2]);
  await tx.commit();
  console.log('Transfer successful');
} catch (error) {
  await tx.rollback();
  console.error('Transfer failed:', error);
}
```

### Health Checks

```javascript
const db = await createDatabaseClient({
  backend: 'sqlite',
  databases: {
    default: { filename: './data/app.db' }
  },
  healthCheck: {
    enabled: true,
    intervalMs: 30000,  // Check every 30 seconds
    queryMs: 5000       // Query timeout: 5 seconds
  }
});

// Check health status
const healthy = await db.isHealthy();
console.log(`Database is ${healthy ? 'healthy' : 'unhealthy'}`);

// Get detailed health info
const info = await db.getHealthInfo();
console.log(info);
// {
//   healthy: true,
//   databases: {
//     default: { healthy: true, latencyMs: 2 }
//   }
// }
```

## Error Handling

All database operations throw typed errors that are compatible with Express error middleware:

```javascript
import { 
  DatabaseError,
  ConnectionError,
  QueryError,
  QueryTimeoutError,
  DatabaseNotFoundError,
  isDatabaseError
} from '@animated-spork/api-core/database';

try {
  const result = await db.query('SELECT * FROM users');
} catch (error) {
  if (isDatabaseError(error)) {
    console.error(`Database error [${error.code}]:`, error.message);
    console.error('Status code:', error.statusCode);
    console.error('Context:', error.context);
    
    // Error has statusCode for Express middleware
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
  }
}
```

### Error Types

| Error | Status Code | When Thrown |
|-------|-------------|-------------|
| `ConfigurationError` | 400 | Invalid configuration |
| `DatabaseNotFoundError` | 400 | Unknown database name |
| `QueryError` | 400 | Invalid SQL or execution failure |
| `PermissionError` | 403 | Insufficient permissions |
| `ConnectionError` | 503 | Connection failure |
| `PoolExhaustedError` | 503 | No available connections |
| `QueryTimeoutError` | 504 | Query timeout |
| `TransactionError` | 500 | Transaction operation failure |
| `InternalDatabaseError` | 500 | Unexpected database error |

See [documentation/ERROR_HANDLING.md](./documentation/ERROR_HANDLING.md) for comprehensive error handling patterns.

## Architecture

The database layer follows a clean architecture with clear separation of concerns:

```
src/database/
├── index.js              # Public API and factory function
├── interface.js          # IDatabase, IConnection, ITransaction contracts
├── errors.js             # Error hierarchy
├── validation.js         # Configuration validation
├── connection-manager.js # Multi-database routing and connection pooling
└── adapters/
    └── sqlite.js         # SQLite adapter implementation
```

Key design principles:

1. **Interface-driven**: All adapters implement `IDatabase` interface
2. **Backend-agnostic**: Application code never imports adapter-specific modules
3. **Configuration-driven**: Database selection determined at runtime
4. **Fail-fast validation**: Configuration errors caught at startup, not at query time
5. **Express-compatible**: All errors include `statusCode` for middleware routing

See [documentation/DATABASE_ARCHITECTURE.md](./documentation/DATABASE_ARCHITECTURE.md) for detailed architecture documentation.

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run coverage

# Watch mode
npm run test:watch
```

**Current Coverage:**
- **Statements:** 94.46% (1417/1500)
- **Branches:** 92.47% (172/186)
- **Functions:** 98.11% (52/53)
- **Lines:** 94.46% (1417/1500)

Test suites include:
- Error hierarchy tests (`tests/database/errors.spec.js`)
- Configuration validation tests (`tests/database/validation.spec.js`)
- Connection manager tests (`tests/database/connection-manager.spec.js`)
- SQLite adapter tests (`tests/database/adapters/sqlite.spec.js`)

## API Reference

### `createDatabaseClient(config)`

Factory function for creating a database client.

**Parameters:**

- `config.backend` (string, required): Backend type (`'sqlite'` or `'mssql'`)
- `config.databases` (object, required): Map of named database configurations
- `config.databases.default` (object, required): Default database configuration
- `config.healthCheck` (object, optional): Health check configuration
  - `enabled` (boolean, default: false): Enable periodic health checks
  - `intervalMs` (number, default: 30000): Check interval in milliseconds
  - `queryMs` (number, default: 5000): Query timeout in milliseconds

**Returns:** `Promise<IDatabase>` - Initialized database client

**Throws:**
- `ConfigurationError` - Invalid configuration
- `ConnectionError` - Cannot initialize database

### IDatabase Interface

```javascript
// Query methods
db.query(sql, params?)           // Query default database
db.query(name, sql, params?)     // Query named database
db.execute(sql, params?)         // Execute statement (INSERT/UPDATE/DELETE)
db.execute(name, sql, params?)   // Execute on named database

// Connection and transaction management
db.getConnection(name?)          // Get raw connection object
db.beginTransaction(name?)       // Begin transaction

// Health and lifecycle
db.isHealthy()                   // Check all databases are healthy
db.getHealthInfo()               // Get detailed health information
db.close()                       // Close all connections
```

## Documentation

- **[PHASE_1_GUIDE.md](./documentation/PHASE_1_GUIDE.md)** - Complete Phase 1 implementation guide
- **[DATABASE_ARCHITECTURE.md](./documentation/DATABASE_ARCHITECTURE.md)** - Architecture overview and design decisions
- **[ERROR_HANDLING.md](./documentation/ERROR_HANDLING.md)** - Error handling patterns and Express integration

## Roadmap

### Phase 1 ✅ COMPLETE
- Database abstraction layer
- SQLite adapter
- Error handling
- Configuration validation

### Phase 2 (Next) - MSSQL Adapter
- MSSQL adapter implementation
- Connection pooling
- Stored procedure helpers
- Multi-database support

### Phase 3 - Integration & Testing
- API factory function (`createApiApp`)
- Health check endpoints
- Request logging middleware
- Configuration patterns

### Phase 4 - JWT & Authentication
- JWT signing and verification
- Authentication endpoint (`/auth/exchange`)
- Authorization middleware
- Role-based access control

## License

ISC

---

**Part of the [animated-spork](../../README.md) monorepo** - Building composable, production-ready Express applications.
