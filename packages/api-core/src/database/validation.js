/**
 * Configuration validation for api-core database layer.
 * 
 * Validates database configuration at application startup before any
 * database operations occur. Throws ConfigurationError for invalid config.
 * 
 * @module database/validation
 */

import { ConfigurationError } from './errors.js';

/**
 * Supported database backends.
 * @type {readonly string[]}
 */
export const SUPPORTED_BACKENDS = Object.freeze(['sqlite', 'mssql']);

/**
 * Validates the complete database configuration object.
 * 
 * Checks for required properties, validates backend type, and delegates
 * to backend-specific validators for each named database.
 * 
 * @param {object} config - Database configuration object
 * @param {string} config.backend - Backend type: 'mssql' or 'sqlite'
 * @param {object} config.databases - Map of named database configurations
 * @param {object} [config.healthCheck] - Optional health check configuration
 * @throws {ConfigurationError} If configuration is invalid
 * 
 * @example
 * validateDatabaseConfig({
 *   backend: 'sqlite',
 *   databases: {
 *     default: { filename: ':memory:' }
 *   }
 * });
 */
export function validateDatabaseConfig(config) {
  // Check config exists and is an object
  if (!config || typeof config !== 'object') {
    throw new ConfigurationError(
      'Database configuration must be an object',
      { received: typeof config }
    );
  }

  // Validate backend
  if (!config.backend) {
    throw new ConfigurationError(
      'Database configuration requires a backend property',
      { config: sanitizeConfig(config) }
    );
  }

  if (typeof config.backend !== 'string') {
    throw new ConfigurationError(
      'Database backend must be a string',
      { received: typeof config.backend }
    );
  }

  if (!SUPPORTED_BACKENDS.includes(config.backend)) {
    throw new ConfigurationError(
      `Unsupported database backend: '${config.backend}'`,
      { 
        backend: config.backend,
        supportedBackends: SUPPORTED_BACKENDS 
      }
    );
  }

  // Validate databases object
  if (!config.databases || typeof config.databases !== 'object') {
    throw new ConfigurationError(
      'Database configuration requires a databases object',
      { config: sanitizeConfig(config) }
    );
  }

  const databaseNames = Object.keys(config.databases);
  if (databaseNames.length === 0) {
    throw new ConfigurationError(
      'At least one database must be configured',
      { config: sanitizeConfig(config) }
    );
  }

  // Validate each named database configuration
  for (const name of databaseNames) {
    validateDatabaseConfigForBackend(name, config.databases[name], config.backend);
  }

  // Validate optional health check configuration
  if (config.healthCheck !== undefined) {
    validateHealthCheckConfig(config.healthCheck);
  }
}

/**
 * Validates a specific named database configuration for a given backend.
 * 
 * @param {string} name - Database name (e.g., 'default', 'secondary')
 * @param {object} dbConfig - Database-specific configuration
 * @param {string} backend - Backend type ('sqlite' or 'mssql')
 * @throws {ConfigurationError} If database configuration is invalid
 */
export function validateDatabaseConfigForBackend(name, dbConfig, backend) {
  if (!dbConfig || typeof dbConfig !== 'object') {
    throw new ConfigurationError(
      `Database '${name}' configuration must be an object`,
      { databaseName: name, received: typeof dbConfig }
    );
  }

  if (backend === 'sqlite') {
    validateSqliteConfig(name, dbConfig);
  } else if (backend === 'mssql') {
    validateMssqlConfig(name, dbConfig);
  }
}

/**
 * Validates SQLite-specific database configuration.
 * 
 * @param {string} name - Database name
 * @param {object} dbConfig - SQLite configuration
 * @throws {ConfigurationError} If SQLite configuration is invalid
 */
function validateSqliteConfig(name, dbConfig) {
  // filename is optional (defaults to ':memory:')
  if (dbConfig.filename !== undefined && typeof dbConfig.filename !== 'string') {
    throw new ConfigurationError(
      `Database '${name}' filename must be a string`,
      { databaseName: name, received: typeof dbConfig.filename }
    );
  }

  // readonly is optional (defaults to false)
  if (dbConfig.readonly !== undefined && typeof dbConfig.readonly !== 'boolean') {
    throw new ConfigurationError(
      `Database '${name}' readonly must be a boolean`,
      { databaseName: name, received: typeof dbConfig.readonly }
    );
  }

  // timeout is optional (defaults to 10000ms)
  if (dbConfig.timeout !== undefined) {
    if (typeof dbConfig.timeout !== 'number' || dbConfig.timeout <= 0) {
      throw new ConfigurationError(
        `Database '${name}' timeout must be a positive number`,
        { databaseName: name, received: dbConfig.timeout }
      );
    }
  }
}

/**
 * Validates MSSQL-specific database configuration.
 * 
 * @param {string} name - Database name
 * @param {object} dbConfig - MSSQL configuration
 * @throws {ConfigurationError} If MSSQL configuration is invalid
 */
function validateMssqlConfig(name, dbConfig) {
  // Required: server
  if (!dbConfig.server || typeof dbConfig.server !== 'string') {
    throw new ConfigurationError(
      `Database '${name}' requires a server property`,
      { databaseName: name }
    );
  }

  // Required: database
  if (!dbConfig.database || typeof dbConfig.database !== 'string') {
    throw new ConfigurationError(
      `Database '${name}' requires a database property`,
      { databaseName: name }
    );
  }

  // Required: authentication
  if (!dbConfig.authentication || typeof dbConfig.authentication !== 'object') {
    throw new ConfigurationError(
      `Database '${name}' requires an authentication object`,
      { databaseName: name }
    );
  }

  // Validate authentication structure
  const auth = dbConfig.authentication;
  if (!auth.type || typeof auth.type !== 'string') {
    throw new ConfigurationError(
      `Database '${name}' authentication requires a type property`,
      { databaseName: name }
    );
  }

  if (auth.type === 'default') {
    // SQL Server authentication requires options with userName and password
    if (!auth.options || typeof auth.options !== 'object') {
      throw new ConfigurationError(
        `Database '${name}' authentication requires options for type 'default'`,
        { databaseName: name }
      );
    }
    if (!auth.options.userName || typeof auth.options.userName !== 'string') {
      throw new ConfigurationError(
        `Database '${name}' authentication options requires userName`,
        { databaseName: name }
      );
    }
    if (!auth.options.password || typeof auth.options.password !== 'string') {
      throw new ConfigurationError(
        `Database '${name}' authentication options requires password`,
        { databaseName: name }
      );
    }
  }
  // Other authentication types (e.g., 'azure-active-directory-*') may have different requirements
  // These can be extended as needed

  // Optional: pool configuration
  if (dbConfig.pool !== undefined) {
    validatePoolConfig(name, dbConfig.pool);
  }

  // Optional: options
  if (dbConfig.options !== undefined && typeof dbConfig.options !== 'object') {
    throw new ConfigurationError(
      `Database '${name}' options must be an object`,
      { databaseName: name, received: typeof dbConfig.options }
    );
  }
}

/**
 * Validates a numeric pool configuration property.
 * 
 * @param {string} name - Database name
 * @param {object} poolConfig - Pool configuration object
 * @param {string} propName - Property name to validate
 * @param {boolean} allowZero - Whether zero is a valid value
 * @throws {ConfigurationError} If property is invalid
 */
function validatePoolNumber(name, poolConfig, propName, allowZero) {
  const value = poolConfig[propName];
  if (value === undefined) {
    return;
  }
  
  const minValue = allowZero ? 0 : 1;
  const descriptor = allowZero ? 'a non-negative' : 'a positive';
  
  if (typeof value !== 'number' || value < minValue) {
    throw new ConfigurationError(
      `Database '${name}' pool.${propName} must be ${descriptor} number`,
      { databaseName: name, received: value }
    );
  }
}

/**
 * Validates MSSQL connection pool configuration.
 * 
 * @param {string} name - Database name
 * @param {object} poolConfig - Pool configuration
 * @throws {ConfigurationError} If pool configuration is invalid
 */
function validatePoolConfig(name, poolConfig) {
  if (typeof poolConfig !== 'object') {
    throw new ConfigurationError(
      `Database '${name}' pool must be an object`,
      { databaseName: name, received: typeof poolConfig }
    );
  }

  // Validate individual properties
  validatePoolNumber(name, poolConfig, 'min', true);
  validatePoolNumber(name, poolConfig, 'max', false);
  validatePoolNumber(name, poolConfig, 'idleTimeoutMillis', true);
  validatePoolNumber(name, poolConfig, 'acquireTimeoutMillis', true);

  // min must be <= max when both are specified
  if (poolConfig.min !== undefined && poolConfig.max !== undefined) {
    if (poolConfig.min > poolConfig.max) {
      throw new ConfigurationError(
        `Database '${name}' pool.min cannot be greater than pool.max`,
        { databaseName: name, min: poolConfig.min, max: poolConfig.max }
      );
    }
  }
}

/**
 * Validates health check configuration.
 * 
 * @param {object} healthCheck - Health check configuration
 * @throws {ConfigurationError} If health check configuration is invalid
 */
export function validateHealthCheckConfig(healthCheck) {
  if (typeof healthCheck !== 'object') {
    throw new ConfigurationError(
      'healthCheck must be an object',
      { received: typeof healthCheck }
    );
  }

  // enabled is optional (defaults to false per design decision #13)
  if (healthCheck.enabled !== undefined && typeof healthCheck.enabled !== 'boolean') {
    throw new ConfigurationError(
      'healthCheck.enabled must be a boolean',
      { received: typeof healthCheck.enabled }
    );
  }

  // intervalMs
  if (healthCheck.intervalMs !== undefined) {
    if (typeof healthCheck.intervalMs !== 'number' || healthCheck.intervalMs <= 0) {
      throw new ConfigurationError(
        'healthCheck.intervalMs must be a positive number',
        { received: healthCheck.intervalMs }
      );
    }
  }

  // queryMs (timeout for health check query)
  if (healthCheck.queryMs !== undefined) {
    if (typeof healthCheck.queryMs !== 'number' || healthCheck.queryMs <= 0) {
      throw new ConfigurationError(
        'healthCheck.queryMs must be a positive number',
        { received: healthCheck.queryMs }
      );
    }
  }
}

/**
 * Sanitizes configuration object for safe logging.
 * Removes sensitive fields like passwords.
 * 
 * @param {object} config - Configuration object
 * @returns {object} Sanitized configuration
 */
function sanitizeConfig(config) {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const sanitized = { ...config };
  
  // Remove databases section entirely if it exists (may contain credentials)
  if (sanitized.databases) {
    const dbNames = Object.keys(sanitized.databases);
    sanitized.databases = `[${dbNames.length} database(s): ${dbNames.join(', ')}]`;
  }

  return sanitized;
}
