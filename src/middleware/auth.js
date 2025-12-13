import { db } from '../config/firebase.js';
import { MESSAGES } from '../config/constants.js';

/**
 * User cache to reduce Firestore reads
 */
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Authentication middleware
 * Verifies user exists in Firebase and attaches user data to context
 */
export const authMiddleware = async (ctx, next) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    // Check cache first
    const cached = userCache.get(telegramId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      ctx.user = cached.user;
      return next();
    }
    
    // Query Firestore for linked account
    const telegramUsersRef = db.collection('telegram_users');
    const snapshot = await telegramUsersRef
      .where('telegramId', '==', telegramId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      // User not linked
      ctx.user = null;
      return next();
    }
    
    const telegramUserDoc = snapshot.docs[0];
    const telegramUserData = telegramUserDoc.data();
    
    // Get Firebase user data
    const userDoc = await db.collection('users').doc(telegramUserData.firebaseUid).get();
    
    if (!userDoc.exists) {
      ctx.user = null;
      return next();
    }
    
    const userData = userDoc.data();
    
    // Attach user data to context
    ctx.user = {
      ...userData,
      uid: telegramUserData.firebaseUid,
      telegramId,
      telegramUsername: ctx.from.username,
      chatId: ctx.chat.id,
    };
    
    // Update cache
    userCache.set(telegramId, {
      user: ctx.user,
      timestamp: Date.now(),
    });
    
    // Update last active timestamp and chatId (important for password change notifications)
    await telegramUsersRef.doc(telegramUserDoc.id).update({
      lastActive: new Date(),
      chatId: ctx.chat.id, // Save chatId for sending messages
    });
    
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    ctx.user = null;
    return next();
  }
};

/**
 * Require authentication middleware
 * Returns error if user is not linked
 */
export const requireAuth = async (ctx, next) => {
  if (!ctx.user) {
    return ctx.reply(MESSAGES.NOT_LINKED, { parse_mode: 'Markdown' });
  }
  return next();
};

/**
 * Require admin role middleware
 */
export const requireAdmin = async (ctx, next) => {
  if (!ctx.user) {
    return ctx.reply(MESSAGES.NOT_LINKED, { parse_mode: 'Markdown' });
  }
  
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'dev') {
    return ctx.reply(MESSAGES.UNAUTHORIZED, { parse_mode: 'Markdown' });
  }
  
  return next();
};

/**
 * Clear user cache (useful after updates)
 */
export const clearUserCache = (telegramId) => {
  if (telegramId) {
    userCache.delete(telegramId);
  } else {
    userCache.clear();
  }
};

export default {
  authMiddleware,
  requireAuth,
  requireAdmin,
  clearUserCache,
};
