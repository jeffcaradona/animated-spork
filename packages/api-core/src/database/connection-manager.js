/**
 * Connection manager for api-core database layer.
 * 
 * Central manager for all database connections. Routes requests to named databases,
 * coordinates adapter lifecycle, and aggregates health/status information.
 * 
 * The connection manager is backend-agnostic: it delegates all pooling and connection
 * management decisions to individual adapters (per design decision #14).
 * 
 * @module database/connection-manager
 */

import { createSqliteAdapter } from './adapters/sqlite.js';
import { 
  ConfigurationError,
  ConnectionError 
} from './errors.js';

/**
 * Creates a connection manager that routes requests to named database adapters.
 * 
 * The connection manager:
 * - Instantiates the appropriate adapter based on backend type
 * - Routes queries to the correct named database
 * - Provides unified health/status aggregation across all databases
 * - Coordinates shutdown across all adapters
 * - Optionally runs periodic health checks (opt-in per design decision #13)
 * 
 * @param {object} config - Validated database configuration
 * @param {string} config.backend - Backend type: 'mssql' or 'sqlite'
 * @param {object} config.databases - Map of named database configurations
 * @param {object} [config.healthCheck] - Optional health check configuration
 * @returns {Promise<object>} Connection manager implementing IDatabase interface
 * @throws {ConfigurationError} If MSSQL backend selected but package not installed
 * @throws {ConnectionError} If adapter initialization fails
 * 
 * @example
 * const manager = await createConnectionManager({
 *   backend: 'sqlite',
 *   databases: {
 *     default: { filename: ':memory:' },
 *     reporting: { filename: './reporting.db' }
 *   }
 * });
 * 
 * // Query default database
 * const users = await manager.query('SELECT * FROM users');
 * 
 * // Query named database
 * const reports = await manager.query('SELECT * FROM reports', [], 'reporting');
 */
export async function createConnectionManager(config) {
  /** @type {object} The database adapter instance */
  let adapter = null;
  
  /** @type {NodeJS.Timeout|null} Health check interval timer */
  let healthCheckInterval = null;

  /**
   * Initialize the appropriate adapter based on backend type.
   */
  async function initializeAdapter() {
    if (config.backend === 'sqlite') {
      adapter = createSqliteAdapter(config);
    } else if (config.backend === 'mssql') {
      // MSSQL adapter is loaded dynamically to avoid requiring the package
      // when using SQLite (per design decision #1)
      try {
        const mssqlModule = await import('./adapters/mssql.js');
        adapter = await mssqlModule.createMssqlAdapter(config);
      } catch (err) {
        if (err.code === 'ERR_MODULE_NOT_FOUND') {
          throw new ConfigurationError(
            "MSSQL backend requires the 'mssql' package. Install it with: npm install mssql",
            { backend: config.backend }
          );
        }
        throw new ConnectionError(
          'Failed to initialize MSSQL adapter',
          { backend: config.backend },
          err
        );
      }
    } else {
      throw new ConfigurationError(
        `Unsupported backend: '${config.backend}'`,
        { backend: config.backend }
      );
    }
  }

  /**
   * Start periodic health checks if enabled in configuration.
   * Per design decision #13, health checks are opt-in to avoid background tasks.
   */
  function startHealthChecks() {
    const healthConfig = config.healthCheck;
    if (!healthConfig?.enabled) {
      return;
    }

    const intervalMs = healthConfig.intervalMs || 30000;
    
    healthCheckInterval = globalThis.setInterval(async () => {
      try {
        const healthy = await adapter.isHealthy();
        if (!healthy) {
          // Log health check failure (adapter status has details)
          const status = await adapter.getStatus();
          globalThis.process?.stderr?.write(
            `[api-core] Health check failed: ${JSON.stringify(status.databases)}\n`
          );
        }
      } catch (err) {
        globalThis.process?.stderr?.write(
          `[api-core] Health check error: ${err.message}\n`
        );
      }
    }, intervalMs);

    // Ensure timer doesn't prevent process exit
    if (healthCheckInterval.unref) {
      healthCheckInterval.unref();
    }
  }

  /**
   * Stop periodic health checks.
   */
  function stopHealthChecks() {
    if (healthCheckInterval) {
      globalThis.clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  }

  // Initialize adapter
  await initializeAdapter();

  // Start health checks if configured
  startHealthChecks();

  // Return connection manager implementing IDatabase interface
  return {
    /**
     * Execute a SELECT query.
     * 
     * @param {string} sql - SQL query with ? placeholders
     * @param {Array} [params=[]] - Query parameters
     * @param {string} [databaseName='default'] - Named database
     * @returns {Promise<Array<object>>} Result set
     * @throws {QueryError} If query fails
     * @throws {DatabaseNotFoundError} If database name not configured
     */
    async query(sql, params = [], databaseName = 'default') {
      return adapter.query(sql, params, databaseName);
    },

    /**
     * Execute a non-query statement (INSERT, UPDATE, DELETE).
     * 
     * @param {string} sql - SQL statement with ? placeholders
     * @param {Array} [params=[]] - Statement parameters
     * @param {string} [databaseName='default'] - Named database
     * @returns {Promise<object>} Execution result with rowsAffected
     * @throws {QueryError} If statement fails
     * @throws {DatabaseNotFoundError} If database name not configured
     */
    async execute(sql, params = [], databaseName = 'default') {
      return adapter.execute(sql, params, databaseName);
    },

    /**
     * Acquire a connection from the pool for manual management.
     * 
     * @param {string} [databaseName='default'] - Named database
     * @returns {Promise<object>} Connection object implementing IConnection
     * @throws {ConnectionError} If connection cannot be acquired
     * @throws {DatabaseNotFoundError} If database name not configured
     */
    async getConnection(databaseName = 'default') {
      return adapter.getConnection(databaseName);
    },

    /**
     * Release a connection back to the pool.
     * 
     * @param {object} connection - Connection to release
     * @returns {Promise<void>}
     */
    async releaseConnection(connection) {
      return adapter.releaseConnection(connection);
    },

    /**
     * Begin a transaction.
     * 
     * @param {object} [connection] - Existing connection (optional)
     * @param {string} [databaseName='default'] - Named database
     * @returns {Promise<object>} Transaction object implementing ITransaction
     * @throws {TransactionError} If transaction cannot be started
     */
    async beginTransaction(connection, databaseName = 'default') {
      return adapter.beginTransaction(connection, databaseName);
    },

    /**
     * Check if all databases are currently accessible.
     * 
     * @returns {Promise<boolean>} True if all databases are healthy
     */
    async isHealthy() {
      return adapter.isHealthy();
    },

    /**
     * Get detailed status of all databases.
     * 
     * @returns {Promise<object>} Status object with database information
     */
    async getStatus() {
      return adapter.getStatus();
    },

    /**
     * Close all database connections and cleanup resources.
     * Stops health check timers and closes all adapter connections.
     * 
     * @returns {Promise<void>}
     */
    async close() {
      stopHealthChecks();
      return adapter.close();
    },

    /**
     * Get the backend type.
     * 
     * @returns {string} Backend type ('sqlite' or 'mssql')
     */
    get backend() {
      return config.backend;
    },

    /**
     * Get list of configured database names.
     * 
     * @returns {string[]} Array of configured database names
     */
    get databaseNames() {
      return Object.keys(config.databases);
    }
  };
}
