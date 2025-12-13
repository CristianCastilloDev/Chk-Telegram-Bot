import { db } from '../config/firebase.js';
import axios from 'axios';

/**
 * Get active gates from Firestore
 */
const getActiveGates = async () => {
  try {
    const snapshot = await db.collection('gates')
      .where('status', '==', 'active')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting active gates:', error);
    return [];
  }
};

/**
 * Verify card through gate
 */
export const verifyCard = async ({ cc, mm, yy, cvv, userId, userName }) => {
  try {
    // Get active gates
    const gates = await getActiveGates();
    
    if (gates.length === 0) {
      throw new Error('No active gates available');
    }
    
    // Select random gate
    const gate = gates[Math.floor(Math.random() * gates.length)];
    
    // For now, this is a placeholder
    // You would integrate with actual gate APIs here
    const result = await executeGateCheck(gate, { cc, mm, yy, cvv });
    
    // Save live to Firestore if approved
    if (result.status === 'approved' || result.status === 'live') {
      await saveLive({
        userId,
        userName,
        card: {
          number: cc,
          month: mm,
          year: yy,
          cvv,
        },
        gateId: gate.id,
        gateName: gate.name,
        gateType: gate.type,
        status: result.status,
        message: result.message,
        bank: result.bank,
        country: result.country,
        type: result.type,
        timestamp: new Date(),
      });
      
      // Increment gate stats
      await incrementGateStats(gate.id);
    }
    
    return {
      ...result,
      gateName: gate.name,
      gateType: gate.type,
    };
  } catch (error) {
    console.error('Error verifying card:', error);
    throw error;
  }
};

/**
 * Execute gate check (placeholder - integrate with actual gates)
 */
const executeGateCheck = async (gate, cardData) => {
  // This is a placeholder implementation
  // In production, you would integrate with actual payment gate APIs
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock response (replace with actual gate integration)
  const isApproved = Math.random() > 0.5;
  
  return {
    status: isApproved ? 'approved' : 'declined',
    message: isApproved ? 'Transaction approved' : 'Card declined',
    bank: 'Test Bank',
    country: 'US',
    type: 'VISA',
  };
};

/**
 * Save live card to Firestore
 */
const saveLive = async (liveData) => {
  try {
    await db.collection('lives').add(liveData);
  } catch (error) {
    console.error('Error saving live:', error);
  }
};

/**
 * Increment gate statistics
 */
const incrementGateStats = async (gateId) => {
  try {
    const gateRef = db.collection('gates').doc(gateId);
    await gateRef.update({
      totalChecks: db.FieldValue.increment(1),
      lastUsed: new Date(),
    });
  } catch (error) {
    console.error('Error incrementing gate stats:', error);
  }
};

/**
 * Get all gates (for admin)
 */
export const getAllGates = async () => {
  try {
    const snapshot = await db.collection('gates').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting all gates:', error);
    return [];
  }
};

export default {
  verifyCard,
  getActiveGates,
  getAllGates,
};
