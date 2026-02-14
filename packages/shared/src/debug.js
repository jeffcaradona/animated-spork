/**
 * @file debug.js
 * Provides a factory for creating namespaced debug functions using the 'debug' npm package.
 *
 * The debug package enables lightweight, environment-driven logging. When DEBUG=namespace:* is set,
 * debug functions with that namespace will output to stderr. This is useful for development tracing
 * without the overhead of file logging.
 *
 * Example: DEBUG=myapp:* node app.js
 */
import debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger.js';

/**
 * reportPackageJsonError(pkgPath, err, loggerInstance)
 * Helper to report package.json read errors with fallback to console
 *
 * Attempts to use the logger if available, falls back to console.error if logger fails
 * This prevents infinite loops or cascading errors during initialization
 *
 * @param {string} pkgPath - Path to the package.json that failed to read
 * @param {Error} err - The error that occurred during read
 * @param {object} [loggerInstance] - Optional logger for testing; defaults to a lazily-created logger
 */
function reportPackageJsonError(pkgPath, err, loggerInstance) {
    let logger = loggerInstance;
    try {
        // Create logger on demand if not provided (for testing/injection)
        if (!logger) {
            logger = createLogger();
        }
        logger.error(`Failed to read package.json at ${pkgPath}: ${String(err)}`);
    } catch (error_) {
        // If logger isn't available for any reason, fallback to globalThis.console.error
        // This prevents infinite loops or missing context in error reporting
        globalThis.console.error(
          `Failed to read package.json at ${pkgPath}:`,
          err,
          " (logger error:",
          error_,
          ")"
        );
    }
}

/**
 * getAppNameFromPkg()
 * Attempts to resolve the application name from the closest package.json file.
 *
 * Resolution order:
 * 1. Reads process.cwd()/package.json and extracts the "name" field
 * 2. Falls back to globalThis.__APP_NAME__ (browser or custom runtime override)
 * 3. Returns undefined if neither is available
 *
 * Errors during file reading are logged to the shared logger with graceful fallback to console.
 * This is intentional because the logger may be used by the debug utility itself (error reporting).
 *
 * @returns {string|undefined} The application name, or undefined if not found
 */
function getAppNameFromPkg() {
    // Check for Node.js environment with access to process.cwd()
    if ( globalThis.process !== undefined && globalThis.process.cwd) {
        let pkgPath;
        try {
            pkgPath = path.join(globalThis.process.cwd(), 'package.json');
            const raw = fs.readFileSync(pkgPath, 'utf8');
            const pkg = JSON.parse(raw);
            // Return the name field if it's a non-empty string
            return typeof pkg.name === 'string' ? pkg.name : undefined;
        } catch (err) {
            // Attempt to log the error via the shared logger
            reportPackageJsonError(pkgPath, err);
        }
    }

    // Browser/runtime hook: allow app to set a global app name if package.json is unavailable
    if (globalThis?.__APP_NAME__) {
      return globalThis.__APP_NAME__;
    }

    return undefined;
}

/**
 * createDebugger(options)
 * Factory function for creating a namespaced debug function.
 *
 * The returned function is a "debug" instance that logs to stderr when DEBUG env var
 * matches its namespace. For example:
 *   createDebugger({ name: 'myapp', namespaceSuffix: 'api' }) creates namespace 'myapp:api'
 *   To enable: DEBUG=myapp:* node app.js (or DEBUG=myapp:api)
 *
 * @param {object} options - Configuration options
 * @param {string} [options.name] - Explicit app name. If omitted, reads from package.json or globalThis.__APP_NAME__
 * @param {string} [options.namespaceSuffix] - Optional suffix appended after ':' (e.g., 'api', 'frontend')
 *
 * @returns {function} A debug function compatible with the 'debug' npm package
 *
 * @example
 * // Explicit namespace
 * const dbg = createDebugger({ name: 'myapp', namespaceSuffix: 'api' });
 * dbg('Server started on port %d', 3000); // logs if DEBUG=myapp:api or DEBUG=myapp:*
 *
 * @example
 * // Auto-detected from package.json
 * const dbg = createDebugger({ namespaceSuffix: 'module' });
 * dbg('data: %o', { key: 'value' }); // uses package.json name
 */
export function createDebugger({ name, namespaceSuffix } = {}) {
    // Resolve the app name: explicit param, package.json, runtime hook, or fallback
    const appName = name || getAppNameFromPkg();

    // Extract the namespace suffix into a separate statement to avoid nested ternary
    const suffix = namespaceSuffix ? `:${namespaceSuffix}` : '';

    // Construct the debug namespace: 'name' or 'name:suffix' or fallback to 'animated-spork:shared-core'
    const ns = appName
      ? `${appName}${suffix}`
      : namespaceSuffix || "animated-spork:shared-core";

    // Return a debug instance for this namespace
    return debug(ns);
}

// Export for testing purposes - allows tests to inject a mock logger
export { reportPackageJsonError };

export default createDebugger;