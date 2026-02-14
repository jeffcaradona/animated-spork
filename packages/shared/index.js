/**
 * @module @animated-spork/shared
 * @description Shared core utilities, logging, authentication, and error handling for the animated-spork workspace.
 */

// ─────────────────────────────────────────────────────────────────
// Logging & Debugging
// ─────────────────────────────────────────────────────────────────
export { createDebugger } from './src/debug.js';
export { createLogger } from './src/logger.js';
export { createMemoryLogger } from './src/memory.js';

// ─────────────────────────────────────────────────────────────────
// Authentication (JWT)
// ─────────────────────────────────────────────────────────────────
export { generateToken, verifyToken } from './src/auth/jwt.js';

// ─────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────
export { jwtAuthMiddleware } from './src/middlewares/jwtAuth.js';



// ─────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────
export {
  createAppError,
  createNotFoundError,
  createValidationError,
} from './src/errors/appError.js';
