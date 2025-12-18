import { db } from '../config/firebase.js';

/**
 * Order Confirmation Service
 * Sends confirmation requests to clients 48h after payment approval
 * and reminders every 4h if they don't respond
 */
class OrderConfirmationService {
    constructor(bot) {
        this.bot = bot;
        this.checkInterval = null;
    }

    /**
     * Start the confirmation checker (runs every hour)
     */
    start() {
        console.log('✅ Starting Order Confirmation Service...');

        // Check immediately on start
        this.checkPendingConfirmations();

        // Then check every hour
        this.checkInterval = setInterval(() => {
            this.checkPendingConfirmations();
        }, 60 * 60 * 1000); // 1 hour

        console.log('✅ Order Confirmation Service started');
    }

    /**
     * Check for orders that need confirmation or reminders
     */
    async checkPendingConfirmations() {
        try {
            const now = new Date();

            // Get all approved orders
            const ordersSnapshot = await db.collection('purchase_orders')
                .where('status', '==', 'approved')
                .get();

            for (const orderDoc of ordersSnapshot.docs) {
                const order = orderDoc.data();
                const orderId = orderDoc.id;

                // Skip if already confirmed
                if (order.clientConfirmed !== null && order.clientConfirmed !== undefined) {
                    continue;
                }

                const approvedAt = order.timestamps?.approved?.toDate();
                if (!approvedAt) continue;

                const hoursSinceApproval = (now - approvedAt) / (1000 * 60 * 60);

                // Check if it's time to send initial confirmation (48h)
                if (hoursSinceApproval >= 48 && !order.confirmationReminders?.sent) {
                    await this.sendConfirmationRequest(orderId, order);
                }
                // Check if it's time to send reminder (every 4h after initial)
                else if (order.confirmationReminders?.sent > 0) {
                    const lastReminderAt = order.confirmationReminders?.lastSentAt?.toDate();
                    if (!lastReminderAt) continue;

                    const hoursSinceLastReminder = (now - lastReminderAt) / (1000 * 60 * 60);

                    // Send reminder every 4h, max 6 reminders
                    if (hoursSinceLastReminder >= 4 && order.confirmationReminders.sent < 6) {
                        await this.sendReminderRequest(orderId, order);
                    }
                    // Auto-complete after 72h (48h + 6 reminders * 4h = 72h)
                    else if (hoursSinceApproval >= 72 && order.confirmationReminders.sent >= 6) {
                        await this.autoCompleteOrder(orderId, order);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error checking pending confirmations:', error);
        }
    }

    /**
     * Send initial confirmation request to client
     */
    async sendConfirmationRequest(orderId, order) {
        try {
            const message = `🔔 *Confirmación de Orden*\n\n` +
                `Hace 48 horas recibiste tu plan *${order.plan.name}*\n\n` +
                `¿Recibiste correctamente tu plan?\n\n` +
                `📋 Orden: \`${orderId}\``;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Sí, todo bien', callback_data: `confirm_received_${orderId}` },
                        { text: '❌ No lo recibí', callback_data: `confirm_not_received_${orderId}` }
                    ]
                ]
            };

            await this.bot.telegram.sendMessage(
                order.clientId,
                message,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );

            // Update order
            await db.collection('purchase_orders').doc(orderId).update({
                'confirmationReminders.sent': 1,
                'confirmationReminders.lastSentAt': new Date()
            });

            console.log(`✅ Sent confirmation request for order ${orderId}`);
        } catch (error) {
            console.error(`❌ Error sending confirmation for order ${orderId}:`, error);
        }
    }

    /**
     * Send reminder to client
     */
    async sendReminderRequest(orderId, order) {
        try {
            const reminderNumber = order.confirmationReminders.sent + 1;

            const message = `🔔 *Recordatorio ${reminderNumber}/6*\n\n` +
                `Por favor confirma si recibiste tu plan *${order.plan.name}*\n\n` +
                `¿Recibiste correctamente tu plan?\n\n` +
                `📋 Orden: \`${orderId}\``;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Sí, todo bien', callback_data: `confirm_received_${orderId}` },
                        { text: '❌ No lo recibí', callback_data: `confirm_not_received_${orderId}` }
                    ]
                ]
            };

            await this.bot.telegram.sendMessage(
                order.clientId,
                message,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );

            // Update order
            await db.collection('purchase_orders').doc(orderId).update({
                'confirmationReminders.sent': reminderNumber,
                'confirmationReminders.lastSentAt': new Date()
            });

            console.log(`✅ Sent reminder ${reminderNumber} for order ${orderId}`);
        } catch (error) {
            console.error(`❌ Error sending reminder for order ${orderId}:`, error);
        }
    }

    /**
     * Auto-complete order after 72h without response
     */
    async autoCompleteOrder(orderId, order) {
        try {
            await db.collection('purchase_orders').doc(orderId).update({
                status: 'completed',
                clientConfirmed: true,
                autoCompleted: true,
                'timestamps.completed': new Date()
            });

            // Notify client
            await this.bot.telegram.sendMessage(
                order.clientId,
                `✅ *Orden Completada Automáticamente*\n\n` +
                `Tu orden ha sido marcada como completada.\n\n` +
                `📋 Orden: \`${orderId}\`\n` +
                `💰 Plan: ${order.plan.name}\n\n` +
                `Si tienes algún problema, contacta al administrador.`,
                { parse_mode: 'Markdown' }
            );

            console.log(`✅ Auto-completed order ${orderId}`);
        } catch (error) {
            console.error(`❌ Error auto-completing order ${orderId}:`, error);
        }
    }

    /**
     * Stop the service
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            console.log('✅ Order Confirmation Service stopped');
        }
    }
}

export default OrderConfirmationService;
