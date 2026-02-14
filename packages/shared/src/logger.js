/**
 * @file logger.js
 * Provides a Winston-based logging factory and default logger instance.
 *
 * The logger is designed for structured, persistent logging to files and console.
 * Log messages include timestamps, levels (error, warn, info, debug), and optional metadata.
 *
 * Logs are written to process.cwd()/logs/<name>.log by default, with configurable log directory.
 * Both File and Console transports are enabled for immediate feedback and archival.
 *
 * Example:
 *   logger.info('Server started', { port: 3000 });
 *   // Writes: "2025-12-22T02:24:08.033Z [info] Server started {"port":3000}"
 */

import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';

/**
 * createLogger(options)
 * Factory function for creating a Winston logger instance.
 *
 * The logger includes:
 * - File transport: logs to <logDir>/<name>.log with full timestamp and metadata
 * - Console transport: logs to stdout/stderr with simple formatting
 *
 * @param {object} options - Configuration options
 * @param {string} [options.name='app'] - Log file basename (without .log). Defaults to the current directory name.
 * @param {string} [options.level='info'] - Minimum log level: 'error', 'warn', 'info', or 'debug'
 * @param {string} [options.logDir] - Directory to store log files. Defaults to process.cwd()/logs
 *
 * @returns {object} A Winston logger instance with methods: .info(), .warn(), .error(), .debug()
 *
 * @example
 * // Default logger (logs to ./logs/myapp.log)
 * const log1 = createLogger();
 * log1.info('initialized');
 *
 * @example
 * // Custom logger with options
 * const log2 = createLogger({ name: 'service', level: 'debug', logDir: '/var/log' });
 * log2.debug('detailed trace info');
 */
export function createLogger({ name = path.basename(globalThis.process.cwd()) || 'app', level = 'info', logDir } = {}) {
    // Determine the log directory: explicit param or default to process.cwd()/logs
    const baseLogDir = logDir || path.resolve(globalThis.process.cwd(), 'logs');

    // Ensure the log directory exists; create recursively if needed
    try {
        fs.mkdirSync(baseLogDir, { recursive: true });
    } catch (error) {
        // Log directory creation failed; emit error to console as logger is being initialized
        // (Using globalThis.console here to avoid logger not yet ready)
        globalThis.console.error(`Failed to create log directory at ${baseLogDir}:`, error);
    }

    // Construct the full path to the log file
    // Sanitize filename: replace colons (reserved on Windows) with hyphens
    const sanitizedName = name.replace(/:/g, '-');
    const filename = path.join(baseLogDir, `${sanitizedName}.log`);

    // Create and configure the Winston logger with File and Console transports
    const logger = winston.createLogger({
        level,
        format: winston.format.combine(
            // Add ISO 8601 timestamp to all log entries
            winston.format.timestamp(),
            // Custom format: "2025-12-22T02:24:08.033Z [info] message {metadata}"
            winston.format.printf(({ timestamp, level: lvl, message, ...meta }) => {
                // Include metadata only if present (non-empty object)
                const metaKeys = Object.keys(meta || {});
                const metaStr = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${lvl}] ${message}${metaStr}`;
            })
        ),
        transports: [
            // File transport: logs all entries to the file with full formatting
            new winston.transports.File({ filename }),
            // Console transport: logs to stdout/stderr with simple formatting for immediate feedback
            new winston.transports.Console({ format: winston.format.simple() })
        ]
    });

    return logger;
}

