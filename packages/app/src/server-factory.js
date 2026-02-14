/**
 * @module server
 * @description HTTP server factory with graceful shutdown support for
 * Kubernetes pod lifecycle (SIGTERM / SIGINT).
 */
import process from 'node:process';
import http from 'node:http';
import { createLogger } from '@animated-spork/shared';

/**
 * Start an HTTP server for the given Express app.
 *
 * @param {import('express').Express} app    - Configured Express app from createApp().
 * @param {object}                    config - Config object (reads `port`).
 * @returns {{ server: http.Server, close: () => Promise<void> }}
 */
export function createServer(app, config) {
  const port = config.port || 3000;
  const logger = createLogger({ name: 'app:server' });
  const server = http.createServer(app);

  server.listen(port, () => {
    logger.info(`${config.appName ?? 'app'} listening on http://localhost:${port}`);
  });

  /**
   * Gracefully close the server — stop accepting new connections,
   * wait for in-flight requests to finish, then resolve.
   *
   * @returns {Promise<void>}
   */
  const close = () =>
    new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

  // ── Kubernetes / container lifecycle signals ─────────────────
  const shutdown = async () => {
    logger.info('Shutdown signal received — closing server…');
    try {
      await close();
      logger.info('Server closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { server, close };
}