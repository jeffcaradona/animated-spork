/**
 * @file index.js
 * Public API for @animated-spork/shared-core
 *
 * This module exports two core utilities for the animated-spork monorepo:
 * 1. createDebugger: Factory for namespaced debug functions (debug npm package)
 * 2. createLogger: Factory for Winston-based file/console loggers
 * 3. logger: Pre-configured default logger instance
 *
 * Example usage:
 *   import { createDebugger, logger } from '@animated-spork/shared-core';
 *   const debug = createDebugger({ namespaceSuffix: 'api' });
 *   logger.info('Server started');
 */

import createDebugger from './src/debug.js';
import logger, { createLogger } from './src/logger.js';

// Named exports for explicit imports
export { createDebugger, createLogger, logger };

// Default export provides convenience object for destructuring or default import
export default { createDebugger, createLogger, logger };
