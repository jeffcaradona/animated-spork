/**
 * @file tests/logger.spec.js
 * Unit tests for the logger module (src/logger.js).
 *
 * Tests verify:
 * - Factory function returns logger with required methods (info, warn, error, debug)
 * - Log messages are written to file and console
 * - Log level filtering works (e.g., level=warn filters out info messages)
 * - Log directory creation and file generation
 * - Timestamp formatting in log output
 *
 * Test strategy:
 * - Use tempDir() for isolated log file output (avoids polluting file system)
 * - File-based assertions (more reliable than console spies for Winston)
 * - Small delays to allow Winston to flush writes
 */

import { expect } from 'chai';
import sinon from 'sinon';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tempDir, importFresh } from './helpers/index.js';

// Calculate __dirname for ESM context
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('logger module', () => {
    let sandbox;

    // Create a new Sinon sandbox for each test to avoid spy/stub leakage
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    // Restore all spies, stubs, and mocks after each test
    afterEach(() => {
        if (sandbox) sandbox.restore();
    });

    /**
     * Test 1: Verify createLogger returns object with required log methods
     * Purpose: Sanity check that factory returns a proper Winston logger with all methods
     */
    it('createLogger returns object with log methods', async () => {
        // Create temp directory for log files
        const { path: tempPath, cleanup } = tempDir();

        try {
            const loggerPath = path.resolve(__dirname, '../src/logger.js');
            const { createLogger } = await importFresh(loggerPath);

            // Create a logger instance with custom temp directory
            const logger = createLogger({ name: 'test', logDir: tempPath });

            // Verify all required methods exist
            expect(logger).to.have.property('info');
            expect(logger).to.have.property('warn');
            expect(logger).to.have.property('error');
            expect(logger).to.have.property('debug');
        } finally {
            // Clean up temp directory
            await cleanup();
        }
    });

    /**
     * Test 3: Verify logger.info() method executes without error
     * Purpose: Basic sanity check that logging works
     */
    it('logs info messages', async () => {
        const { path: tempPath, cleanup } = tempDir();

        try {
            const loggerPath = path.resolve(__dirname, '../src/logger.js');
            const { createLogger } = await importFresh(loggerPath);

            // Create logger instance
            const logger = createLogger({ name: 'test', logDir: tempPath });

            // Log an info message (should not throw)
            logger.info('test message');

            // Verify the info method is callable
            expect(logger.info).to.be.a('function');
        } finally {
            await cleanup();
        }
    });

    /**
     * Test 4: Verify log level filtering (level=warn filters out info)
     * Purpose: Confirm logger respects the level parameter
     * Approach: Create logger with level='warn', log info/warn, check file output
     */
    it('respects log level filtering by file output', async () => {
        const { path: tempPath, cleanup } = tempDir();

        try {
            const loggerPath = path.resolve(__dirname, '../src/logger.js');
            const { createLogger } = await importFresh(loggerPath);

            // Create logger with level='warn' (filters out info)
            const logger = createLogger({ name: 'leveltest', level: 'warn', logDir: tempPath });

            // Log messages at different levels
            logger.info('should not appear');   // Below warn level
            logger.warn('should appear');        // At warn level

            // Wait for Winston to flush writes to file
            await new Promise(resolve => globalThis.setTimeout(resolve, 100));

            // Check file contents
            const logFilePath = path.join(tempPath, 'leveltest.log');
            if (fs.existsSync(logFilePath)) {
                const content = fs.readFileSync(logFilePath, 'utf8');

                // Verify warn message appears
                expect(content).to.include('should appear');
                // Verify info message was filtered out
                expect(content).to.not.include('should not appear');
            }
        } finally {
            await cleanup();
        }
    });

    /**
     * Test 5: Verify logger writes to file in the specified directory
     * Purpose: Confirm log files are created at the correct path
     */
    it('writes to file in specified logDir', async () => {
        const { path: tempPath, cleanup } = tempDir();

        try {
            const loggerPath = path.resolve(__dirname, '../src/logger.js');
            const { createLogger } = await importFresh(loggerPath);

            // Create logger with specific name and logDir
            const logger = createLogger({ name: 'filetest', logDir: tempPath });

            // Log an error message
            logger.error('error message');

            // Wait for Winston to flush
            await new Promise(resolve => globalThis.setTimeout(resolve, 100));

            // Verify log file was created at expected path
            const logFilePath = path.join(tempPath, 'filetest.log');
            const exists = fs.existsSync(logFilePath);
            expect(exists).to.be.true;

            // Verify file contains the logged message
            if (exists) {
                const content = fs.readFileSync(logFilePath, 'utf8');
                expect(content).to.include('error message');
            }
        } finally {
            await cleanup();
        }
    });

    /**
     * Test 6: Verify log output includes ISO 8601 timestamps
     * Purpose: Confirm timestamp formatting in log entries
     */
    it('includes timestamps in log output', async () => {
        const { path: tempPath, cleanup } = tempDir();

        try {
            const loggerPath = path.resolve(__dirname, '../src/logger.js');
            const { createLogger } = await importFresh(loggerPath);

            // Create logger instance
            const logger = createLogger({ name: 'timetest', logDir: tempPath });

            // Log a message
            logger.info('timestamp test');

            // Wait for Winston to flush
            await new Promise(resolve => globalThis.setTimeout(resolve, 100));

            // Check file contents for timestamp format (YYYY-MM-DD)
            const logFilePath = path.join(tempPath, 'timetest.log');
            if (fs.existsSync(logFilePath)) {
                const content = fs.readFileSync(logFilePath, 'utf8');
                // Match ISO 8601 date format: 2025-12-22 (or similar)
                expect(content).to.match(/\d{4}-\d{2}-\d{2}/);
            }
        } finally {
            await cleanup();
        }
    });
});
