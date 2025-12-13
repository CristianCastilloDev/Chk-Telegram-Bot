import logger from './logger.js';
import { MESSAGES } from '../config/constants.js';

/**
 * Global error handler middleware
 */
export const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    logger.error('Unhandled error in bot', {
      error: error.message,
      stack: error.stack,
      userId: ctx.from?.id,
      command: ctx.message?.text || ctx.callbackQuery?.data,
    });
    
    // Send user-friendly error message
    try {
      await ctx.reply(MESSAGES.ERROR, { parse_mode: 'Markdown' });
    } catch (replyError) {
      logger.error('Failed to send error message to user', {
        error: replyError.message,
      });
    }
  }
};

export default errorHandler;
