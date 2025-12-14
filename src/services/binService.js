import { db } from '../config/firebase.js';

/**
 * Lookup BIN information
 * Uses RapidAPI bin-ip-checker (same as Chk-Website-Bot)
 */
export const lookupBin = async (bin, userId = null) => {
  try {
    // 1. Try to get from cache first
    const cached = await getCachedBin(bin);
    if (cached) {
      console.log(`✅ BIN ${bin} found in cache`);
      // Save search history
      if (userId) {
        await saveBinSearch(userId, bin, cached);
      }
      return cached;
    }

    // 2. If not in cache, fetch from RapidAPI
    console.log(`🌐 BIN ${bin} not in cache, querying API...`);
    const response = await fetch(`https://bin-ip-checker.p.rapidapi.com/?bin=${bin}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
        'X-RapidAPI-Key': 'f4f24adea3mshaa035122af7c477p173fcbjsnad38016e6ced',
        'X-RapidAPI-Host': 'bin-ip-checker.p.rapidapi.com',
        'User-Agent': 'Mozilla/5.0'
      },
      body: new URLSearchParams({ 'bin': bin })
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.BIN) {
      throw new Error('Invalid BIN or API response');
    }

    const binData = data.BIN;
    const binInfo = {
      bin,
      bank: binData.issuer?.name || 'Unknown',
      country: binData.country?.name || 'Unknown',
      countryCode: binData.country?.alpha2 || binData.country?.numeric || '',
      type: binData.type || 'Unknown',
      brand: binData.brand || binData.scheme || 'Unknown',
      level: binData.level || 'Standard',
      prepaid: binData.is_prepaid === 'true' || binData.is_prepaid === true,
    };

    // 3. Cache the result for future queries
    await cacheBin(bin, binInfo);
    console.log(`💾 BIN ${bin} saved to cache`);

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
      countryCode: '',
      level: 'Standard',
      prepaid: false,
    };
  }
};

/**
 * Get cached BIN info from Firebase
 */
const getCachedBin = async (bin) => {
  try {
    const doc = await db.collection('bin_cache').doc(bin).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();

    // Support both old (nested) and new (flat) cache structures
    if (data.info) {
      // Old structure: { info: {...}, cachedAt: ... }
      return data.info;
    } else if (data.bin) {
      // New structure: { bin, bank, country, ..., cachedAt, lastUpdated }
      return {
        bin: data.bin,
        bank: data.bank,
        country: data.country,
        countryCode: data.countryCode,
        type: data.type,
        brand: data.brand,
        level: data.level,
        prepaid: data.prepaid,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting cached BIN:', error);
    return null;
  }
};

/**
 * Cache BIN info in Firebase (flattened structure)
 */
const cacheBin = async (bin, info) => {
  try {
    await db.collection('bin_cache').doc(bin).set({
      ...info,
      bin: bin,
      cachedAt: new Date(),
      lastUpdated: new Date().toISOString(),
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
      bank: info.bank,
      country: info.country,
      countryCode: info.countryCode,
      type: info.type,
      brand: info.brand,
      level: info.level,
      prepaid: info.prepaid,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error saving BIN search:', error);
  }
};

/**
 * Get brand from BIN (basic detection fallback)
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
