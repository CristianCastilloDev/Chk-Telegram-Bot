import { db } from '../config/firebase.js';

/**
 * Get user by Firebase UID
 */
export const getUserByUid = async (uid) => {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      uid,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Get user by Telegram ID
 */
export const getUserByTelegramId = async (telegramId) => {
  try {
    const snapshot = await db.collection('telegram_users')
      .where('telegramId', '==', telegramId.toString())
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const telegramUserData = snapshot.docs[0].data();
    return getUserByUid(telegramUserData.firebaseUid);
  } catch (error) {
    console.error('Error getting user by Telegram ID:', error);
    throw error;
  }
};

/**
 * Link Telegram account to Firebase user
 */
export const linkTelegramAccount = async (telegramId, firebaseUid, username, chatId) => {
  try {
    // Check if already linked
    const existing = await db.collection('telegram_users')
      .where('telegramId', '==', telegramId.toString())
      .limit(1)
      .get();
    
    if (!existing.empty) {
      throw new Error('Telegram account already linked');
    }
    
    // Create link
    await db.collection('telegram_users').add({
      telegramId: telegramId.toString(),
      firebaseUid,
      username,
      chatId,
      notifications: true,
      linkedAt: new Date(),
      lastActive: new Date(),
    });
    
    return true;
  } catch (error) {
    console.error('Error linking Telegram account:', error);
    throw error;
  }
};

/**
 * Deduct credits from user
 */
export const deductCredits = async (uid, amount, description = 'Credit usage') => {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const currentCredits = userDoc.data().credits || 0;
    
    if (currentCredits < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Update credits
    await userRef.update({
      credits: currentCredits - amount,
      updatedAt: new Date(),
    });
    
    // Create transaction record
    await db.collection('transactions').add({
      userId: uid,
      type: 'usage',
      credits: -amount,
      description,
      createdAt: new Date(),
    });
    
    return currentCredits - amount;
  } catch (error) {
    console.error('Error deducting credits:', error);
    throw error;
  }
};

/**
 * Add credits to user
 */
export const addCredits = async (uid, amount, description = 'Credits added', adminId = null) => {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const currentCredits = userDoc.data().credits || 0;
    
    // Update credits
    await userRef.update({
      credits: currentCredits + amount,
      updatedAt: new Date(),
    });
    
    // Create transaction record
    await db.collection('transactions').add({
      userId: uid,
      type: 'purchase',
      credits: amount,
      description,
      adminId,
      createdAt: new Date(),
    });
    
    return currentCredits + amount;
  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (limit = 50) => {
  try {
    const snapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Search users by username or email
 */
export const searchUsers = async (query) => {
  try {
    const snapshot = await db.collection('users')
      .where('email', '>=', query)
      .where('email', '<=', query + '\uf8ff')
      .limit(10)
      .get();
    
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

export default {
  getUserByUid,
  getUserByTelegramId,
  linkTelegramAccount,
  deductCredits,
  addCredits,
  getAllUsers,
  searchUsers,
};
