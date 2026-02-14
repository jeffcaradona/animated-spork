/**
 * Create JWT authentication middleware
 *
 * @param {string} secret - JWT secret key from environment
 * @returns {Function} Express middleware function
 *
 * @example
 * import { jwtAuthMiddleware } from 'excel-export-streaming-shared/middlewares/jwtAuth';
 *
 * router.use(jwtAuthMiddleware(process.env.JWT_SECRET));
 */
export function jwtAuthMiddleware(secret: string): Function;
