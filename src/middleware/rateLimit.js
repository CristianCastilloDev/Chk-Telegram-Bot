import { BOT_CONFIG, MESSAGES } from '../config/constants.js';

/**
 * Rate limiter storage
 * Structure: Map<userId, Map<command, { count, resetTime }>>
 */
const rateLimitStore = new Map();

/**
 * Command cooldown storage
 * Structure: Map<userId, Map<command, lastUsedTime>>
 */
const cooldownStore = new Map();

/**
 * Rate limiting middleware
 * Prevents spam by limiting requests per time window
 */
export const rateLimitMiddleware = (ctx, next) => {
  const userId = ctx.from.id.toString();
  const now = Date.now();
  
  // Initialize user's rate limit data
  if (!rateLimitStore.has(userId)) {
    rateLimitStore.set(userId, {
      count: 0,
      resetTime: now + BOT_CONFIG.RATE_LIMIT.WINDOW_MS,
    });
  }
  
  const userLimit = rateLimitStore.get(userId);
  
  // Reset if window expired
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + BOT_CONFIG.RATE_LIMIT.WINDOW_MS;
  }
  
  // Check if limit exceeded
  if (userLimit.count >= BOT_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
    const waitTime = Math.ceil((userLimit.resetTime - now) / 1000);
    return ctx.reply(
      MESSAGES.COOLDOWN.replace('{seconds}', waitTime),
      { parse_mode: 'Markdown' }
    );
  }
  
  // Increment counter
  userLimit.count++;
  
  return next();
};

/**
 * Command cooldown middleware
 * Prevents rapid repeated use of specific commands
 */
export const cooldownMiddleware = (cooldownMs) => {
  return (ctx, next) => {
    const userId = ctx.from.id.toString();
    const command = ctx.message?.text?.split(' ')[0].replace('/', '');
    const now = Date.now();
    
    // Initialize user's cooldown data
    if (!cooldownStore.has(userId)) {
      cooldownStore.set(userId, new Map());
    }
    
    const userCooldowns = cooldownStore.get(userId);
    
    // Check if command is on cooldown
    if (userCooldowns.has(command)) {
      const lastUsed = userCooldowns.get(command);
      const timePassed = now - lastUsed;
      
      if (timePassed < cooldownMs) {
        const waitTime = Math.ceil((cooldownMs - timePassed) / 1000);
        return ctx.reply(
          MESSAGES.COOLDOWN.replace('{seconds}', waitTime),
          { parse_mode: 'Markdown' }
        );
      }
    }
    
    // Set cooldown
    userCooldowns.set(command, now);
    
    return next();
  };
};

/**
 * Clear rate limit for a user
 */
export const clearRateLimit = (userId) => {
  if (userId) {
    rateLimitStore.delete(userId);
    cooldownStore.delete(userId);
  } else {
    rateLimitStore.clear();
    cooldownStore.clear();
  }
};

export default {
  rateLimitMiddleware,
  cooldownMiddleware,
  clearRateLimit,
};
