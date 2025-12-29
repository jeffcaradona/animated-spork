/**
 * Database abstraction interfaces for api-core.
 * 
 * This module defines the contract that all database adapters must implement.
 * Adapters for SQLite, MSSQL, and other backends implement these interfaces
 * to provide a consistent API regardless of the underlying database.
 * 
 * @module database/interface
 */

/**
 * Result set from a query - an array of objects where each object
 * represents one row from the result set.
 * 
 * @typedef {Array<object>} ResultSet
 * @example
 * [
 *   { id: 1, name: 'Alice', email: 'alice@example.com' },
 *   { id: 2, name: 'Bob', email: 'bob@example.com' }
 * ]
 */

/**
 * Execution result from a non-query statement (INSERT, UPDATE, DELETE, EXEC).
 * 
 * @typedef {object} ExecutionResult
 * @property {number} rowsAffected - Number of rows affected by the operation
 * @property {number} [lastInsertRowid] - Last inserted row ID (SQLite only)
 * @property {ResultSet} [recordset] - First result set from stored procedure (MSSQL)
 * @property {Array<ResultSet>} [recordsets] - All result sets from stored procedure (MSSQL)
 * @property {object} [output] - OUTPUT parameter values from stored procedure (MSSQL)
 * @example
 * // Simple insert result
 * { rowsAffected: 1 }
 * 
 * @example
 * // SQLite insert with lastInsertRowid
 * { rowsAffected: 1, lastInsertRowid: 42 }
 * 
 * @example
 * // MSSQL stored procedure with OUTPUT parameters
 * {
 *   rowsAffected: 1,
 *   recordset: [{ userId: 42, name: 'Alice' }],
 *   recordsets: [[{ userId: 42, name: 'Alice' }]],
 *   output: { userId: 42, transactionId: 'abc-123' }
 * }
 */

/**
 * Database status information.
 * 
 * @typedef {object} DatabaseStatus
 * @property {boolean} healthy - Whether all configured databases are accessible
 * @property {string} backend - Backend type ('mssql' or 'sqlite')
 * @property {object} databases - Status of each named database
 * @property {DatabaseInfo} databases.default - Status object for default database
 * @property {DatabaseInfo} [databases.secondary] - Status object for secondary database (if configured)
 * @property {DatabaseInfo} [databases.reporting] - Status object for reporting database (if configured)
 */

/**
 * Information about a specific named database.
 * 
 * @typedef {object} DatabaseInfo
 * @property {boolean} connected - Whether the database is currently connected
 * @property {string} [error] - Error message if connection failed
 * @property {number} [poolSize] - Number of active connections in pool (MSSQL only)
 * @property {number} [idleConnections] - Number of idle connections in pool (MSSQL only)
 */

/**
 * OUTPUT parameter definition for MSSQL stored procedures.
 * 
 * @typedef {object} OutputParameter
 * @property {string} [type] - SQL Server data type (INT, VARCHAR, DECIMAL, etc.)
 * @property {*} [value] - Initial value for INPUT/OUTPUT parameters
 * @property {boolean} output - Must be true to indicate OUTPUT parameter
 * @example
 * // Simple OUTPUT (type inferred)
 * { output: true }
 * 
 * @example
 * // Explicit type OUTPUT
 * { type: 'INT', output: true }
 * 
 * @example
 * // INPUT/OUTPUT (provide value, receive modified value)
 * { type: 'INT', value: 100, output: true }
 */

/**
 * Parameters for query/execute operations.
 * 
 * For SQLite: Use positional array with ? placeholders.
 * For MSSQL: Use named object with @param placeholders.
 * 
 * @typedef {Array|object} QueryParams
 * @example
 * // Positional parameters (SQLite)
 * ['Alice', 'alice@example.com']
 * 
 * @example
 * // Named parameters (MSSQL)
 * { name: 'Alice', email: 'alice@example.com' }
 * 
 * @example
 * // Named parameters with OUTPUT (MSSQL stored procedures)
 * {
 *   name: 'Alice',
 *   email: 'alice@example.com',
 *   userId: { type: 'INT', output: true }
 * }
 */

/**
 * Core database interface.
 * All database adapters must implement these methods.
 * 
 * This interface provides:
 * - Query execution (SELECT)
 * - Statement execution (INSERT, UPDATE, DELETE)
 * - Connection management for manual transactions
 * - Transaction support
 * - Health monitoring
 * 
 * @interface IDatabase
 */
export class IDatabase {
  /**
   * Execute a SELECT query.
   * 
   * Parameters can be passed as:
   * - Positional array with ? placeholders (SQLite, MSSQL)
   * - Named object with @param placeholders (MSSQL)
   * 
   * The query is executed against the specified named database,
   * or the default database if no name is provided.
   * 
   * @param {string} sql - SQL query string with ? or @param placeholders
   * @param {QueryParams} [params=[]] - Query parameters (positional array or named object)
   * @param {string} [databaseName='default'] - Named database to query
   * @returns {Promise<ResultSet>} Array of result objects
   * @throws {ConnectionError} If database connection fails
   * @throws {QueryTimeoutError} If query exceeds timeout
   * @throws {QueryError} If SQL is invalid or execution fails
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * // Simple query
   * const users = await db.query('SELECT * FROM users');
   * 
   * @example
   * // Query with positional parameters (SQLite)
   * const user = await db.query('SELECT * FROM users WHERE id = ?', [123]);
   * 
   * @example
   * // Query with named parameters (MSSQL)
   * const user = await db.query(
   *   'SELECT * FROM users WHERE id = @id',
   *   { id: 123 }
   * );
   * 
   * @example
   * // Query against named database
   * const reports = await db.query('SELECT * FROM reports', [], 'reporting');
   */
  // eslint-disable-next-line no-unused-vars
  async query(sql, params = [], databaseName = 'default') {
    throw new Error('IDatabase.query() must be implemented by adapter');
  }

  /**
   * Execute a non-query statement (INSERT, UPDATE, DELETE) or stored procedure.
   * 
   * Parameters can be passed as:
   * - Positional array with ? placeholders (SQLite, MSSQL)
   * - Named object with @param placeholders (MSSQL)
   * - Named object with OUTPUT parameters (MSSQL stored procedures)
   * 
   * For MSSQL stored procedures, use named parameters with OUTPUT support
   * for chained input/output parameter patterns.
   * 
   * @param {string} sql - SQL statement with ? or @param placeholders
   * @param {QueryParams} [params=[]] - Statement parameters (positional array or named object)
   * @param {string} [databaseName='default'] - Named database to execute against
   * @returns {Promise<ExecutionResult>} Result with rowsAffected, recordsets, and output
   * @throws {ConnectionError} If database connection fails
   * @throws {QueryTimeoutError} If statement exceeds timeout
   * @throws {QueryError} If SQL is invalid or execution fails
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * // Insert with positional parameters (SQLite)
   * const result = await db.execute(
   *   'INSERT INTO users (name, email) VALUES (?, ?)',
   *   ['Alice', 'alice@example.com']
   * );
   * console.log(`Inserted ${result.rowsAffected} row(s)`);
   * console.log(`New ID: ${result.lastInsertRowid}`); // SQLite only
   * 
   * @example
   * // MSSQL stored procedure with named parameters
   * const result = await db.execute(
   *   'EXEC usp_CreateUser @name = @name, @email = @email',
   *   { name: 'Alice', email: 'alice@example.com' }
   * );
   * 
   * @example
   * // MSSQL stored procedure with OUTPUT parameters
   * const result = await db.execute(
   *   'EXEC usp_CreateUser @name = @name, @email = @email, @userId = @userId OUTPUT',
   *   {
   *     name: 'Alice',
   *     email: 'alice@example.com',
   *     userId: { type: 'INT', output: true }
   *   }
   * );
   * console.log(`Created user ID: ${result.output.userId}`);
   * 
   * @example
   * // MSSQL stored procedure with multiple OUTPUT parameters
   * const result = await db.execute(
   *   `EXEC usp_TransferFunds
   *      @fromAccount = @fromAccount,
   *      @toAccount = @toAccount,
   *      @amount = @amount,
   *      @newFromBalance = @newFromBalance OUTPUT,
   *      @newToBalance = @newToBalance OUTPUT`,
   *   {
   *     fromAccount: 1001,
   *     toAccount: 1002,
   *     amount: 250.00,
   *     newFromBalance: { type: 'DECIMAL', output: true },
   *     newToBalance: { type: 'DECIMAL', output: true }
   *   }
   * );
   * console.log(`From balance: ${result.output.newFromBalance}`);
   * console.log(`To balance: ${result.output.newToBalance}`);
   * 
   * @example
   * // MSSQL stored procedure returning multiple result sets
   * const result = await db.execute(
   *   'EXEC usp_GetUserDashboard @userId = @userId',
   *   { userId: 123 }
   * );
   * const profile = result.recordsets[0];      // User profile
   * const orders = result.recordsets[1];       // Recent orders
   * const notifications = result.recordsets[2]; // Notifications
   */
  // eslint-disable-next-line no-unused-vars
  async execute(sql, params = [], databaseName = 'default') {
    throw new Error('IDatabase.execute() must be implemented by adapter');
  }

  /**
   * Acquire a connection from the pool for manual transaction management.
   * 
   * The connection must be manually released by calling connection.release()
   * or by passing it to releaseConnection(). Failure to release connections
   * will exhaust the pool.
   * 
   * For SQLite adapters, this returns a lightweight connection wrapper.
   * For MSSQL adapters, this acquires a connection from the pool.
   * 
   * @param {string} [databaseName='default'] - Named database to connect to
   * @returns {Promise<IConnection>} Connection object for manual operations
   * @throws {ConnectionError} If connection cannot be acquired
   * @throws {PoolExhaustedError} If pool has no available connections (MSSQL)
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * const conn = await db.getConnection();
   * try {
   *   const users = await conn.query('SELECT * FROM users', []);
   *   const orders = await conn.query('SELECT * FROM orders WHERE user_id = ?', [users[0].id]);
   *   await conn.release();
   * } catch (err) {
   *   await conn.release();
   *   throw err;
   * }
   * 
   * @example
   * // Using named database
   * const reportingConn = await db.getConnection('reporting');
   * try {
   *   const data = await reportingConn.query('SELECT * FROM analytics', []);
   *   // ... process data
   * } finally {
   *   await reportingConn.release();
   * }
   */
  // eslint-disable-next-line no-unused-vars
  async getConnection(databaseName = 'default') {
    throw new Error('IDatabase.getConnection() must be implemented by adapter');
  }

  /**
   * Release a connection back to the pool.
   * 
   * This is a convenience method that calls connection.release() internally.
   * Prefer using connection.release() directly for clarity.
   * 
   * @param {IConnection} connection - Connection to release
   * @returns {Promise<void>}
   * @throws {Error} If connection is invalid or already released
   * @example
   * const conn = await db.getConnection();
   * try {
   *   await conn.query('SELECT * FROM users', []);
   * } finally {
   *   await db.releaseConnection(conn);
   * }
   */
  // eslint-disable-next-line no-unused-vars
  async releaseConnection(connection) {
    throw new Error('IDatabase.releaseConnection() must be implemented by adapter');
  }

  /**
   * Begin a transaction.
   * 
   * If a connection is provided, the transaction uses that connection.
   * If no connection is provided, a new connection is acquired from the pool.
   * 
   * The transaction must be committed or rolled back. Failure to do so
   * will leave the connection in an uncommitted state and may exhaust the pool.
   * 
   * @param {IConnection} [connection] - Existing connection for transaction
   *                                     (if omitted, new connection acquired)
   * @param {string} [databaseName='default'] - Named database (used if no connection provided)
   * @returns {Promise<ITransaction>} Transaction object
   * @throws {TransactionError} If transaction cannot be started
   * @throws {ConnectionError} If connection cannot be acquired
   * @throws {DatabaseNotFoundError} If databaseName is not configured
   * @example
   * // Auto-acquire connection
   * const txn = await db.beginTransaction();
   * try {
   *   await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
   *   await txn.execute('INSERT INTO audit_log (action) VALUES (?)', ['user_created']);
   *   await txn.commit();
   * } catch (err) {
   *   await txn.rollback();
   *   throw err;
   * }
   * 
   * @example
   * // Use existing connection
   * const conn = await db.getConnection();
   * const txn = await db.beginTransaction(conn);
   * try {
   *   await txn.execute('UPDATE balance SET amount = amount - ? WHERE user_id = ?', [100, 1]);
   *   await txn.execute('UPDATE balance SET amount = amount + ? WHERE user_id = ?', [100, 2]);
   *   await txn.commit();
   * } catch (err) {
   *   await txn.rollback();
   *   throw err;
   * } finally {
   *   await conn.release();
   * }
   */
  // eslint-disable-next-line no-unused-vars
  async beginTransaction(connection, databaseName = 'default') {
    throw new Error('IDatabase.beginTransaction() must be implemented by adapter');
  }

  /**
   * Check if the database is currently accessible.
   * 
   * This performs a lightweight connectivity check against all configured
   * databases. Returns true only if all databases are accessible.
   * 
   * This is useful for health check endpoints and readiness probes.
   * 
   * @returns {Promise<boolean>} True if all databases are accessible
   * @example
   * if (await db.isHealthy()) {
   *   console.log('Database is ready');
   * } else {
   *   console.error('Database is not accessible');
   * }
   * 
   * @example
   * // In an Express health check endpoint
   * app.get('/health', async (req, res) => {
   *   const healthy = await db.isHealthy();
   *   res.status(healthy ? 200 : 503).json({ healthy });
   * });
   */
  async isHealthy() {
    throw new Error('IDatabase.isHealthy() must be implemented by adapter');
  }

  /**
   * Get detailed status information about the database.
   * 
   * Returns comprehensive status including connection state, pool metrics
   * (for MSSQL), and any error messages for failed connections.
   * 
   * @returns {Promise<DatabaseStatus>} Status object with detailed information
   * @example
   * const status = await db.getStatus();
   * console.log(`Backend: ${status.backend}`);
   * console.log(`Default DB connected: ${status.databases.default.connected}`);
   * if (status.databases.default.poolSize) {
   *   console.log(`Pool size: ${status.databases.default.poolSize}`);
   * }
   * 
   * @example
   * // Check specific database status
   * const status = await db.getStatus();
   * if (!status.databases.reporting.connected) {
   *   console.error(`Reporting DB error: ${status.databases.reporting.error}`);
   * }
   */
  async getStatus() {
    throw new Error('IDatabase.getStatus() must be implemented by adapter');
  }

  /**
   * Close all database connections and cleanup resources.
   * 
   * This must be called before application shutdown to ensure:
   * - All connections are properly closed
   * - Connection pools are drained (MSSQL)
   * - File handles are released (SQLite)
   * - Background health checks are stopped
   * 
   * After calling close(), the database client cannot be used again.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If errors occur during shutdown (logged but not thrown)
   * @example
   * // At application shutdown
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down...');
   *   await db.close();
   *   process.exit(0);
   * });
   * 
   * @example
   * // In tests
   * afterEach(async () => {
   *   if (db) {
   *     await db.close();
   *   }
   * });
   */
  async close() {
    throw new Error('IDatabase.close() must be implemented by adapter');
  }
}

/**
 * Connection interface for manual connection management.
 * 
 * Represents a single database connection that can be used for
 * multiple operations. Must be released when done to return
 * the connection to the pool.
 * 
 * @interface IConnection
 */
export class IConnection {
  /**
   * Execute a SELECT query on this connection.
   * 
   * The query is executed on the same database that this connection
   * was acquired from.
   * 
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} [params=[]] - Query parameters
   * @returns {Promise<ResultSet>} Array of result objects
   * @throws {QueryError} If query fails
   * @throws {QueryTimeoutError} If query exceeds timeout
   * @example
   * const conn = await db.getConnection();
   * const users = await conn.query('SELECT * FROM users WHERE active = ?', [true]);
   * await conn.release();
   */
  // eslint-disable-next-line no-unused-vars
  async query(sql, params = []) {
    throw new Error('IConnection.query() must be implemented by adapter');
  }

  /**
   * Execute a non-query statement on this connection.
   * 
   * The statement is executed on the same database that this connection
   * was acquired from.
   * 
   * @param {string} sql - SQL statement with ? placeholders
   * @param {Array} [params=[]] - Statement parameters
   * @returns {Promise<ExecutionResult>} Result with rowsAffected
   * @throws {QueryError} If statement fails
   * @throws {QueryTimeoutError} If statement exceeds timeout
   * @example
   * const conn = await db.getConnection();
   * const result = await conn.execute(
   *   'UPDATE users SET last_login = ? WHERE id = ?',
   *   [new Date().toISOString(), 123]
   * );
   * console.log(`Updated ${result.rowsAffected} user(s)`);
   * await conn.release();
   */
  // eslint-disable-next-line no-unused-vars
  async execute(sql, params = []) {
    throw new Error('IConnection.execute() must be implemented by adapter');
  }

  /**
   * Release this connection back to the pool.
   * 
   * After releasing, this connection object should not be used again.
   * For SQLite, this is a no-op. For MSSQL, this returns the connection
   * to the pool for reuse.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If connection is already released
   * @example
   * const conn = await db.getConnection();
   * try {
   *   await conn.query('SELECT * FROM users', []);
   * } finally {
   *   await conn.release();
   * }
   */
  async release() {
    throw new Error('IConnection.release() must be implemented by adapter');
  }
}

/**
 * Transaction interface for transaction management.
 * 
 * Represents a database transaction that can execute multiple
 * operations atomically. Must be committed or rolled back.
 * 
 * @interface ITransaction
 */
export class ITransaction {
  /**
   * Execute a SELECT query within this transaction.
   * 
   * The query participates in the transaction and will be rolled back
   * if the transaction is rolled back.
   * 
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} [params=[]] - Query parameters
   * @returns {Promise<ResultSet>} Array of result objects
   * @throws {QueryError} If query fails
   * @throws {QueryTimeoutError} If query exceeds timeout
   * @throws {TransactionError} If transaction is no longer active
   * @example
   * const txn = await db.beginTransaction();
   * const user = await txn.query('SELECT * FROM users WHERE id = ?', [123]);
   * await txn.commit();
   */
  // eslint-disable-next-line no-unused-vars
  async query(sql, params = []) {
    throw new Error('ITransaction.query() must be implemented by adapter');
  }

  /**
   * Execute a non-query statement within this transaction.
   * 
   * The statement participates in the transaction and will be rolled back
   * if the transaction is rolled back.
   * 
   * @param {string} sql - SQL statement with ? placeholders
   * @param {Array} [params=[]] - Statement parameters
   * @returns {Promise<ExecutionResult>} Result with rowsAffected
   * @throws {QueryError} If statement fails
   * @throws {QueryTimeoutError} If statement exceeds timeout
   * @throws {TransactionError} If transaction is no longer active
   * @example
   * const txn = await db.beginTransaction();
   * await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
   * await txn.execute('INSERT INTO audit_log (action) VALUES (?)', ['user_created']);
   * await txn.commit();
   */
  // eslint-disable-next-line no-unused-vars
  async execute(sql, params = []) {
    throw new Error('ITransaction.execute() must be implemented by adapter');
  }

  /**
   * Commit the transaction.
   * 
   * Makes all changes permanent. After committing, the transaction
   * cannot be used again and the underlying connection is released.
   * 
   * @returns {Promise<void>}
   * @throws {TransactionError} If commit fails or transaction is not active
   * @example
   * const txn = await db.beginTransaction();
   * try {
   *   await txn.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
   *   await txn.commit();
   * } catch (err) {
   *   await txn.rollback();
   *   throw err;
   * }
   */
  async commit() {
    throw new Error('ITransaction.commit() must be implemented by adapter');
  }

  /**
   * Rollback the transaction.
   * 
   * Discards all changes made in the transaction. After rolling back,
   * the transaction cannot be used again and the underlying connection
   * is released.
   * 
   * @returns {Promise<void>}
   * @throws {TransactionError} If rollback fails
   * @example
   * const txn = await db.beginTransaction();
   * try {
   *   await txn.execute('UPDATE balance SET amount = amount - ? WHERE user_id = ?', [100, 1]);
   *   await txn.execute('UPDATE balance SET amount = amount + ? WHERE user_id = ?', [100, 2]);
   *   await txn.commit();
   * } catch (err) {
   *   await txn.rollback(); // Undo all changes
   *   throw err;
   * }
   */
  async rollback() {
    throw new Error('ITransaction.rollback() must be implemented by adapter');
  }
}
