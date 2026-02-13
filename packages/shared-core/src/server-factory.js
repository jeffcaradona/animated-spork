/**
 * @module server
 * @description HTTP server factory with graceful shutdown support for
 * Kubernetes pod lifecycle (SIGTERM / SIGINT).
 */

import console from 'node:console';
import process from 'node:process';
import http from 'node:http';

/**
 * Start an HTTP server for the given Express app.
 *
 * @param {import('express').Express} app    - Configured Express app from createApp().
 * @param {object}                    config - Config object (reads `port`).
 * @returns {{ server: http.Server, close: () => Promise<void> }}
 */
export function createServer(app, config, logger = console) {
  const port = config.port;
  // ignore http warnings about insecure connections in development 
  if (process.env.NODE_ENV === 'development') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  const server = http.createServer(app);

  server.listen(port, () => {
    logger.log(`${config.appName ?? 'app'} listening on http://localhost:${port}`);
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
    logger.log('Shutdown signal received — closing server…');
    try {
      await close();
      logger.log('Server closed.');
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