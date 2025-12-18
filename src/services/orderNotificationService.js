import { db } from '../config/firebase.js';

/**
 * Order Notification Service
 * Listens for new orders and sends notifications to devs with inline buttons
 */
class OrderNotificationService {
  constructor(bot) {
    this.bot = bot;
    this.unsubscribe = null;
    this.initialized = false; // Track if initial snapshot has been processed
  }

  /**
   * Start listening for new orders
   */
  start() {
    console.log('📦 Order Notification Service: Starting listener...');

    const ordersRef = db.collection('analytics_orders');

    this.unsubscribe = ordersRef
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
        // Skip initial snapshot (existing documents)
        if (!this.initialized) {
          console.log('📦 Initial snapshot received, skipping', snapshot.size, 'existing orders');
          this.initialized = true;
          return;
        }

        console.log('📦 Orders snapshot received! Changes:', snapshot.docChanges().length);

        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const orderData = change.doc.data();
            const orderId = change.doc.id;

            console.log('📦 New order detected:', {
              orderId: orderId,
              type: orderData.type,
              targetUser: orderData.targetUser,
              createdBy: orderData.createdBy
            });

            // Send notification to all devs
            await this.notifyDevs(orderData, orderId);
          }
        });
      }, (error) => {
        console.error('📦 ERROR in order notification listener:', error);
      });

    console.log('📦 Order Notification Service: Listener active');
  }

  /**
   * Send notification to all admins and devs with inline buttons
   */
  async notifyDevs(orderData, orderId) {
    try {
      console.log('📦 Sending notification to admins and devs for order:', orderId);

      // Get all admin and dev users
      const usersSnapshot = await db.collection('users')
        .where('role', 'in', ['admin', 'dev'])
        .get();

      if (usersSnapshot.empty) {
        console.log('📦 No admin or dev users found');
        return;
      }

      console.log('📦 Found', usersSnapshot.size, 'admin/dev users');

      // Send notification to each admin/dev
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Get telegram link for this user
        const telegramSnapshot = await db.collection('telegram_users')
          .where('firebaseUid', '==', userId)
          .limit(1)
          .get();

        if (telegramSnapshot.empty) {
          console.log('📦 User has no Telegram link:', userData.email);
          continue;
        }

        const telegramData = telegramSnapshot.docs[0].data();
        const chatId = telegramData.chatId;

        if (!chatId) {
          console.log('📦 User has no chatId:', userData.email);
          continue;
        }

        // Send notification with inline buttons
        await this.sendOrderNotification(chatId, orderData, orderId, userData.role);
      }

    } catch (error) {
      console.error('📦 Error sending notifications to admins/devs:', error);
    }
  }

  /**
   * Send order notification with inline buttons
   */
  async sendOrderNotification(chatId, orderData, orderId, userRole) {
    try {
      const emoji = orderData.type === 'credits' ? '💳' : '📅';
      const typeText = orderData.type === 'credits' ? 'Créditos' : 'Plan';

      // Calculate commission based on role
      const commissionPercent = userRole === 'admin' ? 20 : 10;
      const commissionAmount = (orderData.price * commissionPercent / 100).toFixed(2);

      const message = `
🔔 *Nueva Orden Pendiente*

${emoji} *Tipo:* ${typeText}
👤 *Usuario:* ${orderData.targetUser}
📊 *Cantidad:* ${orderData.amount} ${orderData.type === 'credits' ? 'créditos' : 'días'}
💵 *Precio:* $${orderData.price}
👨‍💼 *Creado por:* ${orderData.createdBy}
📝 *Descripción:* ${orderData.description}

💰 *Tu comisión:* $${commissionAmount} (${commissionPercent}%)

🆔 \`${orderId}\`
      `.trim();

      // Inline keyboard with approve/reject buttons
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Aceptar Orden', callback_data: `accept_order_${orderId}` },
            { text: '❌ Rechazar', callback_data: `reject_order_${orderId}` }
          ]
        ]
      };

      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log('📦 ✅ Notification sent to chatId:', chatId, 'Role:', userRole);

    } catch (error) {
      console.error('📦 Error sending notification to chatId:', chatId, error);
    }
  }

  /**
   * Stop listening for orders
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      console.log('📦 Order Notification Service: Listener stopped');
    }
  }
}

export default OrderNotificationService;
