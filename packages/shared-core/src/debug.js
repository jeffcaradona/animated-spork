import debug from 'debug';
import fs from 'node:fs';
import path from 'node:path';
import logger from './logger.js';

function getAppNameFromPkg() {
    if (typeof globalThis.process !== 'undefined' && globalThis.process.cwd) {
        let pkgPath;
        try {
            pkgPath = path.join(globalThis.process.cwd(), 'package.json');
            const raw = fs.readFileSync(pkgPath, 'utf8');
            const pkg = JSON.parse(raw);
            return typeof pkg.name === 'string' ? pkg.name : undefined;
        } catch (err) {
            // Log the package.json read error using the shared logger; fall back to console
            try {
                logger.error(`Failed to read package.json at ${pkgPath}: ${String(err)}`);
            } catch (logErr) {
                // If logger isn't available yet for any reason, fallback to globalThis.console
                globalThis.console.error(`Failed to read package.json at ${pkgPath}:`, err, ' (logger error:', logErr, ')');
            }
        }
    }
    // Browser hook (set at build or runtime by the app)
    if (typeof globalThis !== 'undefined' && globalThis.__APP_NAME__) return globalThis.__APP_NAME__;
    return undefined;
}

/**
 * createDebugger({ name, namespaceSuffix })
 * - name: explicit app name (overrides package.json)
 * - namespaceSuffix: e.g. 'api' or 'frontend' to create 'appname:api'
 */
export function createDebugger({ name, namespaceSuffix } = {}) {
    const appName = name || getAppNameFromPkg();
    const ns = appName ? `${appName}${namespaceSuffix ? `:${namespaceSuffix}` : ''}` : (namespaceSuffix || 'animated-spork:shared-core');
    return debug(ns);
}

export default createDebugger;