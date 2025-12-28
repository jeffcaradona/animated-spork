/**
 * SQLite database adapter for api-core.
 * 
 * Uses Node.js built-in node:sqlite module for zero external dependencies.
 * Suitable for development, testing, and lightweight production workloads.
 * 
 * @module database/adapters/sqlite
 */

import { DatabaseSync } from 'node:sqlite';
import {
  ConnectionError,
  QueryError,
  QueryTimeoutError,
  TransactionError,
  DatabaseNotFoundError,
  ConfigurationError
} from '../errors.js';

/**
 * Creates a SQLite database adapter.
 * 
 * @param {object} config - SQLite configuration
 * @param {object} config.databases - Named database configurations
 * @param {object} config.databases.default - Default database config
 * @param {string} [config.databases.default.filename=':memory:'] - Database file path or ':memory:'
 * @param {boolean} [config.databases.default.readonly=false] - Open in read-only mode
 * @param {number} [config.databases.default.timeout=10000] - Query timeout in milliseconds
 * @returns {object} Database adapter implementing IDatabase interface
 * @throws {ConfigurationError} If configuration is invalid
 * 
 * @example
 * const db = createSqliteAdapter({
 *   databases: {
 *     default: { filename: ':memory:' },
 *     test: { filename: './test.db' }
 *   }
 * });
 */
export function createSqliteAdapter(config) {
  // Validate configuration
  if (!config?.databases || typeof config.databases !== 'object') {
    throw new ConfigurationError(
      'SQLite adapter requires databases configuration',
      { config }
    );
  }

  if (Object.keys(config.databases).length === 0) {
    throw new ConfigurationError(
      'At least one database must be configured',
      { config }
    );
  }

  // Store database instances
  const databases = {};

  /**
   * Get or create database instance for a named database.
   * 
   * @param {string} databaseName - Name of database to access
   * @returns {DatabaseSync} SQLite database instance
   * @throws {DatabaseNotFoundError} If database name not configured
   * @throws {ConnectionError} If database cannot be opened
   */
  function getDatabase(databaseName = 'default') {
    if (!config.databases[databaseName]) {
      throw new DatabaseNotFoundError(
        databaseName,
        { configuredDatabases: Object.keys(config.databases) }
      );
    }

    // Return existing instance if already opened
    if (databases[databaseName]) {
      return databases[databaseName];
    }

    // Open new database instance
    const dbConfig = config.databases[databaseName];
    const filename = dbConfig.filename || ':memory:';
    const readonly = dbConfig.readonly || false;

    try {
      const db = new DatabaseSync(filename, {
        open: readonly ? DatabaseSync.OPEN_READONLY : undefined
      });
      databases[databaseName] = db;
      return db;
    } catch (err) {
      throw new ConnectionError(
        `Failed to open SQLite database '${databaseName}'`,
        { databaseName, filename, readonly },
        err
      );
    }
  }

  /**
   * Execute a SELECT query.
   * 
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} [params=[]] - Query parameters
   * @param {string} [databaseName='default'] - Named database
   * @returns {Promise<Array<object>>} Array of result objects
   * @throws {QueryError} If query execution fails
   */
  async function query(sql, params = [], databaseName = 'default') {
    const db = getDatabase(databaseName);
    const dbConfig = config.databases[databaseName];
    const timeout = dbConfig?.timeout || 10000;

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        globalThis.setTimeout(() => {
          reject(new QueryTimeoutError(
            `Query exceeded timeout of ${timeout}ms`,
            { sql, databaseName, timeoutMs: timeout }
          ));
        }, timeout);
      });

      // Execute query
      const queryPromise = Promise.resolve().then(() => {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      });

      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (err) {
      if (err instanceof QueryTimeoutError) {
        throw err;
      }

      throw new QueryError(
        `Query failed: ${err.message}`,
        { sql, params, databaseName },
        err
      );
    }
  }

  /**
   * Execute a non-query statement (INSERT, UPDATE, DELETE).
   * 
   * @param {string} sql - SQL statement with ? placeholders
   * @param {Array} [params=[]] - Statement parameters
   * @param {string} [databaseName='default'] - Named database
   * @returns {Promise<object>} Result with rowsAffected and lastInsertRowid
   * @throws {QueryError} If execution fails
   */
  async function execute(sql, params = [], databaseName = 'default') {
    const db = getDatabase(databaseName);
    const dbConfig = config.databases[databaseName];
    const timeout = dbConfig?.timeout || 10000;

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        globalThis.setTimeout(() => {
          reject(new QueryTimeoutError(
            `Statement exceeded timeout of ${timeout}ms`,
            { sql, databaseName, timeoutMs: timeout }
          ));
        }, timeout);
      });

      // Execute statement
      const executePromise = Promise.resolve().then(() => {
        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        
        return {
          rowsAffected: result.changes || 0,
          lastInsertRowid: result.lastInsertRowid
        };
      });

      return await Promise.race([executePromise, timeoutPromise]);
    } catch (err) {
      if (err instanceof QueryTimeoutError) {
        throw err;
      }

      throw new QueryError(
        `Statement execution failed: ${err.message}`,
        { sql, params, databaseName },
        err
      );
    }
  }

  /**
   * Get a connection from the database.
   * 
   * For SQLite, this returns a lightweight wrapper around the database instance
   * since SQLite doesn't use connection pooling.
   * 
   * @param {string} [databaseName='default'] - Named database
   * @returns {Promise<object>} Connection object implementing IConnection
   * @throws {ConnectionError} If connection cannot be acquired
   */
  async function getConnection(databaseName = 'default') {
    // Ensure database is opened
    getDatabase(databaseName);
    
    return {
      /**
       * Execute a SELECT query on this connection.
       * 
       * @param {string} sql - SQL query with ? placeholders
       * @param {Array} [params=[]] - Query parameters
       * @returns {Promise<Array<object>>} Result set
       */
      async query(sql, params = []) {
        return query(sql, params, databaseName);
      },

      /**
       * Execute a non-query statement on this connection.
       * 
       * @param {string} sql - SQL statement with ? placeholders
       * @param {Array} [params=[]] - Statement parameters
       * @returns {Promise<object>} Execution result
       */
      async execute(sql, params = []) {
        return execute(sql, params, databaseName);
      },

      /**
       * Release this connection.
       * 
       * For SQLite, this is a no-op since connections aren't pooled.
       * 
       * @returns {Promise<void>}
       */
      async release() {
        // No-op for SQLite
      }
    };
  }

  /**
   * Begin a transaction.
   * 
   * @param {object} [connection] - Existing connection (optional)
   * @param {string} [databaseName='default'] - Named database
   * @returns {Promise<object>} Transaction object implementing ITransaction
   * @throws {TransactionError} If transaction cannot be started
   */
  async function beginTransaction(connection, databaseName = 'default') {
    const db = getDatabase(databaseName);

    try {
      // Begin transaction
      db.exec('BEGIN TRANSACTION');

      const txn = {
        /**
         * Execute a SELECT query within this transaction.
         * 
         * @param {string} sql - SQL query
         * @param {Array} [params=[]] - Parameters
         * @returns {Promise<Array<object>>} Result set
         */
        async query(sql, params = []) {
          return query(sql, params, databaseName);
        },

        /**
         * Execute a non-query statement within this transaction.
         * 
         * @param {string} sql - SQL statement
         * @param {Array} [params=[]] - Parameters
         * @returns {Promise<object>} Execution result
         */
        async execute(sql, params = []) {
          return execute(sql, params, databaseName);
        },

        /**
         * Commit the transaction.
         * 
         * @returns {Promise<void>}
         * @throws {TransactionError} If commit fails
         */
        async commit() {
          try {
            db.exec('COMMIT');
          } catch (err) {
            throw new TransactionError(
              'Failed to commit transaction',
              { databaseName },
              err
            );
          }
        },

        /**
         * Rollback the transaction.
         * 
         * @returns {Promise<void>}
         * @throws {TransactionError} If rollback fails
         */
        async rollback() {
          try {
            db.exec('ROLLBACK');
          } catch (err) {
            throw new TransactionError(
              'Failed to rollback transaction',
              { databaseName },
              err
            );
          }
        }
      };

      return txn;
    } catch (err) {
      throw new TransactionError(
        'Failed to begin transaction',
        { databaseName },
        err
      );
    }
  }

  /**
   * Check if all databases are accessible.
   * 
   * @returns {Promise<boolean>} True if all databases are healthy
   */
  async function isHealthy() {
    try {
      // Try to access each configured database
      for (const name of Object.keys(config.databases)) {
        const db = getDatabase(name);
        // Execute a simple query to verify accessibility
        db.prepare('SELECT 1').get();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get detailed status of all databases.
   * 
   * @returns {Promise<object>} Status object with database information
   */
  async function getStatus() {
    const status = {
      healthy: true,
      backend: 'sqlite',
      databases: {}
    };

    for (const [name, dbConfig] of Object.entries(config.databases)) {
      try {
        const db = getDatabase(name);
        db.prepare('SELECT 1').get();
        
        status.databases[name] = {
          connected: true,
          filename: dbConfig.filename || ':memory:',
          readonly: dbConfig.readonly || false
        };
      } catch (err) {
        status.healthy = false;
        status.databases[name] = {
          connected: false,
          error: err.message,
          filename: dbConfig.filename || ':memory:'
        };
      }
    }

    return status;
  }

  /**
   * Close all database connections.
   * 
   * @returns {Promise<void>}
   */
  async function close() {
    for (const [name, db] of Object.entries(databases)) {
      try {
        db.close();
        delete databases[name];
      } catch (err) {
        // Log error but continue closing other databases
        globalThis.process?.stderr?.write(`Error closing database '${name}': ${err.message}\n`);
      }
    }
  }

  // Return adapter implementing IDatabase interface
  return {
    query,
    execute,
    getConnection,
    // No-op for SQLite - connections aren't pooled
    // eslint-disable-next-line no-unused-vars
    async releaseConnection(connection) {},
    beginTransaction,
    isHealthy,
    getStatus,
    close
  };
}
