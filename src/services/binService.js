import { db } from '../config/firebase.js';
import axios from 'axios';

/**
 * Lookup BIN information
 * Uses binlist.net API (free tier)
 */
export const lookupBin = async (bin, userId = null) => {
  try {
    // Try to get from cache first
    const cached = await getCachedBin(bin);
    if (cached) {
      // Save search history
      if (userId) {
        await saveBinSearch(userId, bin, cached);
      }
      return cached;
    }
    
    // Fetch from API
    const response = await axios.get(`https://lookup.binlist.net/${bin}`, {
      timeout: 5000,
    });
    
    const binInfo = {
      bin,
      bank: response.data.bank?.name || 'Unknown',
      type: response.data.type || 'Unknown',
      brand: response.data.scheme || 'Unknown',
      country: response.data.country?.name || 'Unknown',
      countryCode: response.data.country?.alpha2 || '',
      level: response.data.brand || 'Unknown',
      prepaid: response.data.prepaid || false,
    };
    
    // Cache the result
    await cacheBin(bin, binInfo);
    
    // Save search history
    if (userId) {
      await saveBinSearch(userId, bin, binInfo);
    }
    
    return binInfo;
  } catch (error) {
    console.error('Error looking up BIN:', error);
    
    // Return basic info if API fails
    return {
      bin,
      bank: 'Unknown',
      type: 'Unknown',
      brand: getBrandFromBin(bin),
      country: 'Unknown',
    };
  }
};

/**
 * Get cached BIN info
 */
const getCachedBin = async (bin) => {
  try {
    const doc = await db.collection('bin_cache').doc(bin).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    const cacheAge = Date.now() - data.cachedAt.toMillis();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (cacheAge > maxAge) {
      return null;
    }
    
    return data.info;
  } catch (error) {
    console.error('Error getting cached BIN:', error);
    return null;
  }
};

/**
 * Cache BIN info
 */
const cacheBin = async (bin, info) => {
  try {
    await db.collection('bin_cache').doc(bin).set({
      info,
      cachedAt: new Date(),
    });
  } catch (error) {
    console.error('Error caching BIN:', error);
  }
};

/**
 * Save BIN search to user history
 */
const saveBinSearch = async (userId, bin, info) => {
  try {
    await db.collection('bin_searches').add({
      userId,
      bin,
      info,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error saving BIN search:', error);
  }
};

/**
 * Get brand from BIN (basic detection)
 */
const getBrandFromBin = (bin) => {
  const firstDigit = bin[0];
  const firstTwo = bin.substring(0, 2);
  
  if (firstDigit === '4') return 'VISA';
  if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'MASTERCARD';
  if (['34', '37'].includes(firstTwo)) return 'AMEX';
  if (firstTwo === '60') return 'DISCOVER';
  
  return 'Unknown';
};

export default {
  lookupBin,
};
