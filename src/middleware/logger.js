import winston from 'winston';

/**
 * Logger configuration using Winston
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'telegram-bot' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
    }),
    // Write errors to file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

/**
 * Logging middleware for Telegraf
 */
export const loggerMiddleware = (ctx, next) => {
  const start = Date.now();
  const userId = ctx.from?.id;
  const username = ctx.from?.username || 'unknown';
  const command = ctx.message?.text || ctx.callbackQuery?.data || 'unknown';
  
  logger.info('Incoming request', {
    userId,
    username,
    command,
    chatId: ctx.chat?.id,
  });
  
  return next().then(() => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      userId,
      command,
      duration: `${duration}ms`,
    });
  }).catch((error) => {
    const duration = Date.now() - start;
    logger.error('Request failed', {
      userId,
      command,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  });
};

export default logger;
