import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';

export function createLogger({ name = path.basename(globalThis.process.cwd()) || 'app', level = 'info', logDir } = {}) {
    const baseLogDir = logDir || path.resolve(globalThis.process.cwd(), 'logs');
    try { fs.mkdirSync(baseLogDir, { recursive: true }); } catch(error) {

        //TODO: set up a debugger if possible?
        globalThis.console.error(`Failed to create log directory at ${baseLogDir}:`, error);
    }

    const filename = path.join(baseLogDir, `${name}.log`);

    const logger = winston.createLogger({
        level,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level: lvl, message, ...meta }) => {
                const metaKeys = Object.keys(meta || {});
                const metaStr = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${lvl}] ${message}${metaStr}`;
            })
        ),
        transports: [
            new winston.transports.File({ filename }),
            new winston.transports.Console({ format: winston.format.simple() })
        ]
    });

    return logger;
}

const defaultLogger = createLogger();

export { defaultLogger as logger };
export default defaultLogger;
