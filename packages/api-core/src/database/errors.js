/**
 * Database error classes for api-core.
 * 
 * All errors extend Error and include statusCode for Express middleware compatibility.
 * Errors are categorized as client errors (4xx) or server errors (5xx).
 * 
 * @module database/errors
 */

/**
 * Base database error class.
 * All database-related errors inherit from this.
 * 
 * Compatible with Express error middleware via next(error).
 * 
 * @class DatabaseError
 * @extends Error
 */
export class DatabaseError extends Error {
  /**
   * @param {string} message - Error message for logging/display
   * @param {string} code - Machine-readable error code (e.g., 'CONNECTION_ERROR')
   * @param {number} [statusCode=500] - HTTP status code (default: 500 Server Error)
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
    
    // Preserve stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * **Server Error (503 Service Unavailable)**
 * 
 * Thrown when a database connection cannot be established or maintained.
 * Indicates the database server is unreachable or temporarily unavailable.
 * 
 * @class ConnectionError
 * @extends DatabaseError
 * @example
 * throw new ConnectionError(
 *   'Failed to connect to MSSQL server',
 *   { databaseName: 'default', server: 'localhost' },
 *   originalError
 * );
 */
export class ConnectionError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'CONNECTION_ERROR',
      503, // Service Unavailable
      context,
      originalError
    );
    this.name = 'ConnectionError';
  }
}

/**
 * **Server Error (504 Gateway Timeout)**
 * 
 * Thrown when a database query/connection attempt times out.
 * The server exists but didn't respond within the configured timeout.
 * 
 * @class QueryTimeoutError
 * @extends DatabaseError
 * @example
 * throw new QueryTimeoutError(
 *   'Query exceeded 30000ms timeout',
 *   { databaseName: 'default', timeoutMs: 30000, sql: 'SELECT...' }
 * );
 */
export class QueryTimeoutError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'QUERY_TIMEOUT',
      504, // Gateway Timeout
      context,
      originalError
    );
    this.name = 'QueryTimeoutError';
  }
}

/**
 * **Client Error (400 Bad Request)**
 * 
 * Thrown when a SQL query has invalid syntax or is rejected by the database.
 * This is typically a programmer error (bad SQL), not a runtime issue.
 * 
 * @class QueryError
 * @extends DatabaseError
 * @example
 * throw new QueryError(
 *   'Column "nonexistent" does not exist',
 *   { databaseName: 'default', sql: 'SELECT nonexistent FROM users' },
 *   originalError
 * );
 */
export class QueryError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'QUERY_ERROR',
      400, // Bad Request
      context,
      originalError
    );
    this.name = 'QueryError';
  }
}

/**
 * **Client Error (400 Bad Request)**
 * 
 * Thrown when a required configuration is missing or invalid.
 * Indicates the api-core cannot be initialized with provided config.
 * 
 * @class ConfigurationError
 * @extends DatabaseError
 * @example
 * throw new ConfigurationError(
 *   'backend must be "mssql" or "sqlite", got "postgres"',
 *   { backend: 'postgres', validOptions: ['mssql', 'sqlite'] }
 * );
 */
export class ConfigurationError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'CONFIGURATION_ERROR',
      400, // Bad Request
      context,
      originalError
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * **Server Error (503 Service Unavailable)**
 * 
 * Thrown when attempting to acquire a connection and the pool is exhausted.
 * All available connections are in use; cannot acquire new connection.
 * 
 * @class PoolExhaustedError
 * @extends DatabaseError
 * @example
 * throw new PoolExhaustedError(
 *   'Connection pool exhausted; cannot acquire connection',
 *   { databaseName: 'default', poolSize: 20, waitTime: 10000 }
 * );
 */
export class PoolExhaustedError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'POOL_EXHAUSTED',
      503, // Service Unavailable
      context,
      originalError
    );
    this.name = 'PoolExhaustedError';
  }
}

/**
 * **Client Error (400 Bad Request)**
 * 
 * Thrown when attempting to query/execute against a database name that is not configured.
 * Indicates a programming error (typo in database name).
 * 
 * @class DatabaseNotFoundError
 * @extends DatabaseError
 * @example
 * throw new DatabaseNotFoundError(
 *   'reporting',
 *   { configuredDatabases: ['default', 'secondary'] }
 * );
 */
export class DatabaseNotFoundError extends DatabaseError {
  constructor(databaseName, context = {}, originalError = null) {
    super(
      `Database '${databaseName}' is not configured`,
      'DATABASE_NOT_FOUND',
      400, // Bad Request
      { ...context, databaseName },
      originalError
    );
    this.name = 'DatabaseNotFoundError';
  }
}

/**
 * **Server Error (500 Internal Server Error)**
 * 
 * Thrown when a transaction operation fails (BEGIN, COMMIT, ROLLBACK).
 * Indicates an unexpected issue during transaction management.
 * 
 * @class TransactionError
 * @extends DatabaseError
 * @example
 * throw new TransactionError(
 *   'Failed to commit transaction',
 *   { databaseName: 'default', operations: 3 },
 *   originalError
 * );
 */
export class TransactionError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'TRANSACTION_ERROR',
      500, // Internal Server Error
      context,
      originalError
    );
    this.name = 'TransactionError';
  }
}

/**
 * **Client Error (403 Forbidden)**
 * 
 * Thrown when a query is rejected due to permission issues.
 * User/role does not have sufficient privileges for the operation.
 * 
 * @class PermissionError
 * @extends DatabaseError
 * @example
 * throw new PermissionError(
 *   'User does not have INSERT permission on users table',
 *   { databaseName: 'default', operation: 'INSERT', table: 'users' }
 * );
 */
export class PermissionError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'PERMISSION_DENIED',
      403, // Forbidden
      context,
      originalError
    );
    this.name = 'PermissionError';
  }
}

/**
 * **Server Error (500 Internal Server Error)**
 * 
 * Thrown when an unexpected error occurs that doesn't fit other categories.
 * Used as a fallback for unexpected database driver errors.
 * 
 * @class InternalDatabaseError
 * @extends DatabaseError
 * @example
 * throw new InternalDatabaseError(
 *   'Unexpected error during query execution',
 *   { databaseName: 'default' },
 *   originalError
 * );
 */
export class InternalDatabaseError extends DatabaseError {
  constructor(message, context = {}, originalError = null) {
    super(
      message,
      'INTERNAL_DATABASE_ERROR',
      500, // Internal Server Error
      context,
      originalError
    );
    this.name = 'InternalDatabaseError';
  }
}

/**
 * Check if an error is a database error.
 * 
 * Useful in Express error middleware to distinguish database errors from others.
 * 
 * @param {*} err - Error to check
 * @returns {boolean} True if err is a DatabaseError instance
 * @example
 * if (isDatabaseError(err)) {
 *   res.status(err.statusCode).json({ error: err.code, message: err.message });
 * }
 */
export function isDatabaseError(err) {
  return err instanceof DatabaseError;
}

/**
 * Check if an error is a client error (4xx).
 * 
 * Client errors indicate programming errors or invalid input,
 * not server/database problems.
 * 
 * @param {DatabaseError} err - Database error to check
 * @returns {boolean} True if statusCode is 400-499
 * @example
 * if (isClientError(err)) {
 *   // Log with low severity; don't alert ops
 *   log.warn('Query validation failed', { code: err.code });
 * }
 */
export function isClientError(err) {
  return err.statusCode >= 400 && err.statusCode < 500;
}

/**
 * Check if an error is a server error (5xx).
 * 
 * Server errors indicate database/infrastructure problems
 * that require operational response.
 * 
 * @param {DatabaseError} err - Database error to check
 * @returns {boolean} True if statusCode is 500-599
 * @example
 * if (isServerError(err)) {
 *   // Log with high severity; alert ops
 *   log.error('Database unavailable', { code: err.code });
 * }
 */
export function isServerError(err) {
  return err.statusCode >= 500 && err.statusCode < 600;
}
