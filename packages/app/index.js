/**
 * Package entry point — re-exports the public API surface.
 *
 * @module @animated-spork/app
 */

export { createApp } from './src/app-factory.js';
export { createServer } from './src/server-factory.js';
export { createConfig, filterSensitiveKeys } from './src/config/env.js';
export {
  createAppError,
  createNotFoundError,
  createValidationError,
} from './src/errors/appError.js';
