const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const util = require('util');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const dynamicDataFormat = winston.format((info) => {
  if (info.dynamic) {
    info.message = util.inspect(info.dynamic, {
      depth: null,
      colors: true,
      maxArrayLength: null,
    });
  }
  return info;
});

const customColors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'blue',
  data: 'green',
};

winston.addColors(customColors);

const customFormat = winston.format.combine(
  dynamicDataFormat(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if exists
    if (Object.keys(meta).length > 0 && meta.dynamic !== message) {
      log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\nStack: ${stack}`;
    }

    return log;
  })
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize({ all: true }), customFormat),
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(winston.format.uncolorize(), customFormat),
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: winston.format.combine(winston.format.uncolorize(), customFormat),
    }),
  ],
});

const log = {
  info: (message, meta = {}) => {
    logger.info(message, { ...meta });
  },

  error: (message, error = null, meta = {}) => {
    const errorMeta = {
      ...meta,
      stack: error?.stack,
      details: error?.message,
    };
    logger.error(message, errorMeta);
  },

  debug: (message, data = null) => {
    logger.debug(message, { dynamic: data });
  },

  warn: (message, meta = {}) => {
    logger.warn(message, { ...meta });
  },

  http: (message, meta = {}) => {
    logger.http(message, { ...meta });
  },

  data: (message, data = null) => {
    logger.log('data', message, { dynamic: data });
  },
};

module.exports = log;
