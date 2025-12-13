import { db } from '../config/firebase.js';

/**
 * Order Service
 * Handles order creation, approval, and rejection
 */

/**
 * Create a new order
 */
export const createOrder = async (orderData) => {
  try {
    const ordersRef = db.collection('analytics_orders');
    
    const order = {
      createdBy: orderData.createdBy,
      createdAt: new Date(),
      targetUser: orderData.targetUser,
      targetUserEmail: orderData.targetUserEmail,
      type: orderData.type, // 'credits' or 'plan'
      description: orderData.description,
      amount: orderData.amount,
      price: orderData.price,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null
    };
    
    const docRef = await ordersRef.add(order);
    
    console.log(`✅ Order created: ${docRef.id}`);
    return { id: docRef.id, ...order };
    
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

/**
 * Get orders with optional filter
 */
export const getOrders = async (status = 'all', limit = 20) => {
  try {
    const ordersRef = db.collection('analytics_orders');
    let query = ordersRef.orderBy('createdAt', 'desc');
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.limit(limit).get();
    
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
    
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId) => {
  try {
    const orderDoc = await db.collection('analytics_orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return null;
    }
    
    return {
      id: orderDoc.id,
      ...orderDoc.data()
    };
    
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
};

/**
 * Approve an order and apply changes
 */
export const approveOrder = async (orderId, approvedBy) => {
  try {
    // Get order
    const order = await getOrderById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.status !== 'pending') {
      throw new Error(`Order is already ${order.status}`);
    }
    
    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', order.targetUserEmail)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      throw new Error(`User ${order.targetUser} not found`);
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    // Apply changes based on order type
    if (order.type === 'credits') {
      // Add credits
      const currentCredits = userData.credits || 0;
      const newCredits = currentCredits + order.amount;
      
      await db.collection('users').doc(userId).update({
        credits: newCredits,
        updatedAt: new Date()
      });
      
      console.log(`✅ ${order.amount} credits added to ${order.targetUser}`);
      
    } else if (order.type === 'plan') {
      // Add days to plan
      const now = new Date();
      let newExpirationDate;
      
      if (userData.planExpiresAt && userData.planExpiresAt.toDate() > now) {
        // If has active plan, add days to current expiration
        newExpirationDate = new Date(userData.planExpiresAt.toDate());
        newExpirationDate.setDate(newExpirationDate.getDate() + order.amount);
      } else {
        // If no plan or expired, start from today
        newExpirationDate = new Date();
        newExpirationDate.setDate(newExpirationDate.getDate() + order.amount);
      }
      
      await db.collection('users').doc(userId).update({
        planExpiresAt: newExpirationDate,
        updatedAt: new Date()
      });
      
      console.log(`✅ ${order.amount} days added to ${order.targetUser}`);
    }
    
    // Update order status
    await db.collection('analytics_orders').doc(orderId).update({
      status: 'approved',
      approvedBy: approvedBy,
      approvedAt: new Date()
    });
    
    return {
      success: true,
      order: order,
      message: `Order approved and ${order.type} applied to ${order.targetUser}`
    };
    
  } catch (error) {
    console.error('Error approving order:', error);
    throw error;
  }
};

/**
 * Reject an order
 */
export const rejectOrder = async (orderId, rejectedBy, reason = 'No reason provided') => {
  try {
    // Get order
    const order = await getOrderById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.status !== 'pending') {
      throw new Error(`Order is already ${order.status}`);
    }
    
    // Update order status
    await db.collection('analytics_orders').doc(orderId).update({
      status: 'rejected',
      rejectedBy: rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason
    });
    
    return {
      success: true,
      order: order,
      message: `Order rejected`
    };
    
  } catch (error) {
    console.error('Error rejecting order:', error);
    throw error;
  }
};

export default {
  createOrder,
  getOrders,
  getOrderById,
  approveOrder,
  rejectOrder
};
