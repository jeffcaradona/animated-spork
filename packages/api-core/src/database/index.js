/**
 * Database abstraction layer for api-core.
 * 
 * This module provides a configurable database client that supports multiple backends.
 * MSSQL is the primary production backend; SQLite is used for development and testing.
 * 
 * @module database
 * 
 * @example
 * import { createDatabaseClient } from '@animated-spork/api-core/database';
 * 
 * const db = await createDatabaseClient({
 *   backend: 'sqlite',
 *   databases: {
 *     default: { filename: ':memory:' }
 *   }
 * });
 * 
 * try {
 *   const users = await db.query('SELECT * FROM users');
 *   console.log(users);
 * } finally {
 *   await db.close();
 * }
 */

import { validateDatabaseConfig } from './validation.js';
import { createConnectionManager } from './connection-manager.js';

// Re-export error classes for consumers
export {
  DatabaseError,
  ConnectionError,
  QueryError,
  QueryTimeoutError,
  ConfigurationError,
  PoolExhaustedError,
  DatabaseNotFoundError,
  TransactionError,
  PermissionError,
  InternalDatabaseError,
  isDatabaseError,
  isClientError,
  isServerError
} from './errors.js';

// Re-export validation utilities
export {
  validateDatabaseConfig,
  validateDatabaseConfigForBackend,
  validateHealthCheckConfig,
  SUPPORTED_BACKENDS
} from './validation.js';

/**
 * Create a database client for the given configuration.
 * 
 * This is the main entry point for the database abstraction layer.
 * It validates configuration, instantiates the appropriate adapter,
 * and returns a ready-to-use database client implementing the IDatabase interface.
 * 
 * Per design decision #12, configuration validation errors are caught here,
 * while adapter initialization errors (connection failures, etc.) propagate directly.
 * 
 * @param {object} config - Database configuration object
 * @param {string} config.backend - Backend type: 'mssql' or 'sqlite'
 * @param {object} config.databases - Map of named database configurations
 * @param {object} [config.databases.default] - Default database configuration
 * @param {object} [config.healthCheck] - Optional health check configuration
 * @param {boolean} [config.healthCheck.enabled=false] - Enable periodic health checks (opt-in)
 * @param {number} [config.healthCheck.intervalMs=30000] - Health check interval in milliseconds
 * @param {number} [config.healthCheck.queryMs=5000] - Health check query timeout
 * @returns {Promise<object>} Initialized database client implementing IDatabase interface
 * @throws {ConfigurationError} If configuration is invalid
 * @throws {ConnectionError} If database cannot be initialized
 * 
 * @example
 * // SQLite for development/testing
 * const db = await createDatabaseClient({
 *   backend: 'sqlite',
 *   databases: {
 *     default: { filename: ':memory:' }
 *   }
 * });
 * 
 * @example
 * // MSSQL for production
 * const db = await createDatabaseClient({
 *   backend: 'mssql',
 *   databases: {
 *     default: {
 *       server: 'localhost',
 *       database: 'myapp',
 *       authentication: {
 *         type: 'default',
 *         options: {
 *           userName: process.env.DB_USER,
 *           password: process.env.DB_PASSWORD
 *         }
 *       }
 *     }
 *   },
 *   healthCheck: {
 *     enabled: true,
 *     intervalMs: 30000
 *   }
 * });
 * 
 * @example
 * // Multi-database configuration
 * const db = await createDatabaseClient({
 *   backend: 'sqlite',
 *   databases: {
 *     default: { filename: './data/main.db' },
 *     reporting: { filename: './data/reporting.db', readonly: true }
 *   }
 * });
 * 
 * // Query default database
 * const users = await db.query('SELECT * FROM users');
 * 
 * // Query named database
 * const reports = await db.query('SELECT * FROM reports', [], 'reporting');
 */
export async function createDatabaseClient(config) {
  // Validate configuration (throws ConfigurationError if invalid)
  validateDatabaseConfig(config);

  // Create and return connection manager
  // Adapter initialization errors propagate directly per design decision #12
  return createConnectionManager(config);
}

/**
 * Default export for convenience.
 */
export default createDatabaseClient;
