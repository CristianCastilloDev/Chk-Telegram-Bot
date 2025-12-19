/**
 * Commission distribution configuration
 * 
 * Distribution:
 * - 60% Owner (fixed)
 * - 20% Devs total (10% each for 2 devs, fixed)
 * - 20% Seller (whoever accepted the order)
 */

export const COMMISSION_CONFIG = {
    // Owner chatId (receives 60% of all sales)
    OWNER_CHAT_ID: '1892449971',  // Owner (not yet registered)

    // Dev chatIds (each receives 10% of all sales)
    DEV_CHAT_IDS: [
        '2121112895',  // Dev 1
        '1951898071'   // Dev 2
    ],

    // Commission percentages
    PERCENTAGES: {
        OWNER: 0.60,        // 60%
        DEVS_TOTAL: 0.20,   // 20% total (split between devs)
        SELLER: 0.20        // 20%
    }
};

/**
 * Get dev commission (split equally between all devs)
 */
export function getDevCommission(totalAmount) {
    const devsTotal = totalAmount * COMMISSION_CONFIG.PERCENTAGES.DEVS_TOTAL;
    return devsTotal / COMMISSION_CONFIG.DEV_CHAT_IDS.length;
}
