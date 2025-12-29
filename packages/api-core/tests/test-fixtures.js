/**
 * Test fixtures and environment-based configuration
 *
 * Provides test credentials and configurations sourced from environment variables
 * to keep sensitive test data out of source code while maintaining test clarity.
 *
 * Environment variables used during testing:
 * - TEST_MSSQL_PASSWORD: MSSQL authentication password for tests (optional, has safe default)
 */

import { env } from "node:process";

// Set default test environment variables if not already set
if (!env.TEST_MSSQL_PASSWORD) {
  env.TEST_MSSQL_PASSWORD = "test-fixture-credential";
}

/**
 * MSSQL test password from TEST_MSSQL_PASSWORD environment variable
 * Defaults to a safe test fixture value for local development
 * In CI/CD pipelines, override with: env.TEST_MSSQL_PASSWORD = 'your-value'
 */
const MSSQL_TEST_PASSWORD = env.TEST_MSSQL_PASSWORD;

export { MSSQL_TEST_PASSWORD };
