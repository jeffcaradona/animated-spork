/**
 * @file tests/helpers/index.js
 * Reusable test utilities for shared-core tests.
 *
 * These helpers provide:
 * - Environment variable isolation (withEnv)
 * - Console method spying (captureConsole)
 * - Temporary directory creation and cleanup (tempDir)
 * - Time mocking with fake timers (stubClock)
 * - ESM module cache-busting for fresh imports (importFresh)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sinon from 'sinon';

/**
 * withEnv(envObj, fn)
 * Temporarily set process.env keys for the duration of fn(), then restore original values.
 *
 * This ensures tests don't leak environment variable changes to other tests or the process.
 *
 * @param {object} envObj - Key-value pairs of environment variables to set
 * @param {function} fn - Function to execute with the temporary env vars
 * @returns {*} Return value of fn()
 *
 * @example
 * withEnv({ DEBUG: 'myapp:*' }, () => {
 *   // process.env.DEBUG is now 'myapp:*'
 *   // Automatically restored after fn returns or throws
 * });
 */
export function withEnv(envObj, fn) {
    // Save the original values of all keys we're about to set
    const old = {};
    for (const key in envObj) {
        old[key] = globalThis.process.env[key];
        globalThis.process.env[key] = envObj[key];
    }

    try {
        // Execute the test function with the temp env vars set
        return fn();
    } finally {
        // Always restore original values (even if fn throws)
        for (const key in envObj) {
            if (old[key] === undefined) {
                // Key didn't exist before; delete it
                delete globalThis.process.env[key];
            } else {
                // Key existed; restore original value
                globalThis.process.env[key] = old[key];
            }
        }
    }
}

/**
 * captureConsole()
 * Spy on globalThis.console methods (log, info, warn, error, debug).
 *
 * Returns an object with { spies, restore } for use in tests.
 * Includes a check to prevent double-wrapping if console is already spied.
 *
 * @returns {object} { spies: {log, info, warn, error, debug}, restore: function }
 *
 * @example
 * const { spies, restore } = captureConsole();
 * console.log('test');
 * expect(spies.log.called).to.be.true;
 * restore();
 */
export function captureConsole() {
    const spies = {};
    const methods = ['log', 'info', 'warn', 'error', 'debug'];

    for (const method of methods) {
        const original = globalThis.console[method];
        // Check if method is already a Sinon proxy (avoid double-wrapping)
        if (original && !original.isSinonProxy) {
            spies[method] = sinon.spy(globalThis.console, method);
        }
    }

    return {
        spies,
        restore: () => {
            // Restore all spied methods; some may be undefined if already wrapped
            Object.values(spies).forEach(s => s.restore && s.restore());
        }
    };
}

/**
 * tempDir()
 * Create a unique temporary directory and return { path, cleanup }.
 *
 * The directory is created in the OS temp folder with a unique prefix.
 * Use cleanup() to recursively remove the directory and all contents after the test.
 *
 * @returns {object} { path: string, cleanup: async function }
 *
 * @example
 * const { path: tempPath, cleanup } = tempDir();
 * // Use tempPath for test file operations
 * await cleanup(); // Delete when done
 */
export function tempDir() {
    // Create a unique temp directory in the OS temp folder
    const tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sharedcore-test-'));

    return {
        path: tempPath,
        cleanup: async () => {
            // Recursively remove the directory and all contents
            await fs.promises.rm(tempPath, { recursive: true, force: true });
        }
    };
}

/**
 * stubClock(now)
 * Stub time with sinon.useFakeTimers() to control when setTimeout/setInterval execute.
 *
 * Useful for testing code with time-dependent behavior without waiting for real delays.
 *
 * @param {Date|number} [now=Jan 1, 2020] - Initial fake time
 * @returns {object} { clock: object, restore: function }
 *
 * @example
 * const { clock, restore } = stubClock(new Date('2025-01-01'));
 * setTimeout(() => console.log('tick'), 1000);
 * clock.tick(1000); // Advance fake time by 1 second
 * // "tick" has now been printed
 * restore();
 */
export function stubClock(now = new Date(2020, 0, 1)) {
    // Create fake timers starting at the specified time
    const clock = sinon.useFakeTimers(now.getTime());

    return {
        clock,
        restore: () => clock.restore()
    };
}

/**
 * importFresh(filePath)
 * Force-reload an ESM module by appending a cache-busting query parameter.
 *
 * ESM modules are cached by Node.js after the first import.
 * This helper forces a fresh import by changing the module specifier,
 * useful for testing modules that read environment variables at load time.
 *
 * @param {string} filePath - Absolute path to the ESM module file
 * @returns {Promise<object>} The freshly loaded module object
 *
 * @example
 * const mod1 = await importFresh('./src/debug.js');
 * process.env.DEBUG = 'newvalue';
 * const mod2 = await importFresh('./src/debug.js');
 * // mod1 and mod2 are now separate module instances
 */
export async function importFresh(filePath) {
    // Convert file path to file:// URL
    const fileUrl = pathToFileURL(filePath).href;
    // Append a timestamp-based query string to force a cache miss
    const cacheBust = `?t=${Date.now()}`;
    // Import with the cache-busting query
    return import(fileUrl + cacheBust);
}
