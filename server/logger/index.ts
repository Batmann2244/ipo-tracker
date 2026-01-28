import fs from "fs";
import path from "path";
import { createLogger, format, transports, type Logger } from "winston";

const logDir = path.join(process.cwd(), "logs");
const sourceDir = path.join(logDir, "sources");

for (const dir of [logDir, sourceDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}: ${stack || message}${metaString}`;
  }),
);

const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
);

const level = process.env.LOG_LEVEL || "info";

export const logger: Logger = createLogger({
  level,
  defaultMeta: { service: "ipo-analyzer" },
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({ filename: path.join(logDir, "app.log"), format: fileFormat, maxsize: 5 * 1024 * 1024, maxFiles: 3 }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logDir, "exceptions.log"), format: fileFormat }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(logDir, "rejections.log"), format: fileFormat }),
  ],
});

const sourceLoggers = new Map<string, Logger>();

export function getSourceLogger(source: string): Logger {
  const key = source.toLowerCase();
  if (sourceLoggers.has(key)) {
    return sourceLoggers.get(key)!;
  }

  const filePath = path.join(sourceDir, `${key}.log`);
  const sourceLogger = createLogger({
    level,
    defaultMeta: { service: "ipo-analyzer", source: key },
    transports: [
      new transports.Console({ format: consoleFormat }),
      new transports.File({ filename: filePath, format: fileFormat, maxsize: 5 * 1024 * 1024, maxFiles: 2 }),
    ],
  });

  sourceLoggers.set(key, sourceLogger);
  return sourceLogger;
}

export function requestLogger(message: string, meta?: Record<string, unknown>): void {
  logger.info(message, meta);
}
