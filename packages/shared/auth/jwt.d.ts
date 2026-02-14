/**
 * Generate JWT token for inter-service authentication
 *
 * @param {string} secret - JWT secret key from environment
 * @param {string} [expiresIn='15m'] - Token expiration time (default: 15 minutes)
 * @returns {string} Signed JWT token
 *
 * @example
 * const token = generateToken(process.env.JWT_SECRET);
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function generateToken(secret: string, expiresIn?: string): string;
/**
 * Verify and decode JWT token
 *
 * @param {string} token - JWT token to verify
 * @param {string} secret - JWT secret key from environment
 * @returns {object} Decoded token payload
 * @throws {JsonWebTokenError} If token signature is invalid
 * @throws {TokenExpiredError} If token has expired
 *
 * @example
 * try {
 *   const decoded = verifyToken(token, process.env.JWT_SECRET);
 *   console.log(decoded.iss); // 'excel-export-app'
 * } catch (err) {
 *   if (err.name === 'TokenExpiredError') {
 *     console.error('Token expired');
 *   }
 * }
 */
export function verifyToken(token: string, secret: string): object;
