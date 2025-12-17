import { db } from '../config/firebase.js';
import { PLANS } from '../config/constants.js';

/**
 * Handle buy plan callbacks - New order system
 */
export const handleBuyPlan = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const user = ctx.user;
        if (!user) {
            return ctx.editMessageText('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
        }

        // Extract plan ID from callback data (e.g., "buy_monthly" -> "monthly")
        const planId = ctx.callbackQuery.data.replace('buy_', '');

        // Find the plan in PLANS constant
        let selectedPlan = null;
        let planCategory = null;

        // Check in DAYS plans
        for (const [key, plan] of Object.entries(PLANS.DAYS)) {
            if (plan.id === planId) {
                selectedPlan = plan;
                planCategory = 'days';
                break;
            }
        }

        // Check in CREDITS plans if not found
        if (!selectedPlan) {
            for (const [key, plan] of Object.entries(PLANS.CREDITS)) {
                if (plan.id === planId) {
                    selectedPlan = plan;
                    planCategory = 'credits';
                    break;
                }
            }
        }

        if (!selectedPlan) {
            return ctx.editMessageText('❌ Plan no encontrado. Usa /buy para ver los planes disponibles.');
        }

        // Create order in Firestore
        const orderData = {
            clientId: ctx.from.id.toString(),
            clientUsername: ctx.from.username || ctx.from.first_name,
            adminId: null, // Will be set when admin accepts
            adminUsername: null,

            plan: {
                type: selectedPlan.type,
                id: selectedPlan.id,
                name: selectedPlan.name,
                price: selectedPlan.price,
                currency: selectedPlan.currency,
                ...(planCategory === 'days' ? {
                    duration: selectedPlan.duration,
                    creditsPerDay: selectedPlan.creditsPerDay
                } : {
                    credits: selectedPlan.credits
                })
            },

            status: 'pending',

            timestamps: {
                created: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            },

            paymentProof: null,
            rejectionReason: null,
            clientConfirmed: null,

            confirmationReminders: {
                sent: 0,
                lastSentAt: null,
                maxReminders: 6
            }
        };

        // Save order to Firestore
        const orderRef = await db.collection('purchase_orders').add(orderData);
        const orderId = orderRef.id;

        // Update order with its ID
        await orderRef.update({ orderId });

        // Notify client
        const clientMessage = `✅ *Orden Creada Exitosamente*

📋 *Detalles de tu orden:*
• ID: \`${orderId}\`
• Plan: ${selectedPlan.name}
• Precio: $${selectedPlan.price} ${selectedPlan.currency}
${planCategory === 'days' ? `• Duración: ${selectedPlan.duration} día(s)` : `• Créditos: ${selectedPlan.credits}`}

⏰ *Importante:*
Un administrador aceptará tu orden pronto.
Recibirás los datos de pago cuando sea aceptada.

⏳ Tienes 24 horas para completar el pago.

Puedes ver el estado de tu orden con /misordenes`;

        await ctx.editMessageText(clientMessage, { parse_mode: 'Markdown' });

        // Notify all admins
        await notifyAdmins(ctx, orderId, orderData);

    } catch (error) {
        console.error('Error creating order:', error);
        await ctx.answerCbQuery('❌ Error al crear la orden. Intenta nuevamente.');
    }
};

/**
 * Notify all admins about new order
 */
async function notifyAdmins(ctx, orderId, orderData) {
    try {
        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();

        const adminMessage = `🔔 *Nueva Orden de Compra*

👤 *Cliente:* @${orderData.clientUsername}
🆔 *ID Cliente:* \`${orderData.clientId}\`
📋 *Plan:* ${orderData.plan.name}
💰 *Precio:* $${orderData.plan.price} ${orderData.plan.currency}
📅 *Fecha:* ${new Date().toLocaleDateString('es-ES')}

──────────────────────`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Aceptar Orden', callback_data: `accept_purchase_${orderId}` }
                ]
            ]
        };

        // Send notification to each admin
        for (const adminDoc of adminsSnapshot.docs) {
            const admin = adminDoc.data();
            if (admin.telegramId) {
                try {
                    await ctx.telegram.sendMessage(
                        admin.telegramId,
                        adminMessage,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: keyboard
                        }
                    );
                } catch (error) {
                    console.error(`Error notifying admin ${admin.telegramId}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error notifying admins:', error);
    }
}

/**
 * Handle accept purchase order callback
 */
export const handleAcceptPurchaseOrder = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const user = ctx.user;
        if (!user || (user.role !== 'admin' && user.role !== 'dev')) {
            return ctx.answerCbQuery('❌ Solo admins y devs pueden aceptar órdenes.', { show_alert: true });
        }

        // Extract order ID from callback data
        const orderId = ctx.callbackQuery.data.replace('accept_purchase_', '');

        // Get order from Firestore
        const orderRef = db.collection('purchase_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return ctx.editMessageText('❌ Orden no encontrada.');
        }

        const orderData = orderDoc.data();

        // Check if order is still pending
        if (orderData.status !== 'pending') {
            return ctx.editMessageText(`❌ Esta orden ya fue ${orderData.status === 'accepted' ? 'aceptada por ' + orderData.adminUsername : 'procesada'}.`);
        }

        // Check if order expired
        const now = new Date();
        if (orderData.timestamps.expiresAt.toDate() < now) {
            await orderRef.update({ status: 'expired' });
            return ctx.editMessageText('❌ Esta orden expiró (más de 24 horas sin pago).');
        }

        // Accept order - First come, first served
        await orderRef.update({
            adminId: ctx.from.id.toString(),
            adminUsername: ctx.from.username || ctx.from.first_name,
            status: 'accepted',
            'timestamps.accepted': new Date()
        });

        // Update admin's message
        const adminMessage = `✅ *Orden Aceptada*

📋 *Detalles:*
• ID: \`${orderId}\`
• Cliente: @${orderData.clientUsername}
• Plan: ${orderData.plan.name}
• Precio: $${orderData.plan.price} ${orderData.plan.currency}

👨‍💼 *Aceptada por:* @${ctx.from.username || ctx.from.first_name}
📅 *Fecha:* ${new Date().toLocaleDateString('es-ES')}

⏳ Esperando comprobante de pago del cliente...`;

        await ctx.editMessageText(adminMessage, { parse_mode: 'Markdown' });

        // Send bank details to client
        await sendBankDetailsToClient(ctx, orderId, orderData);

    } catch (error) {
        console.error('Error accepting purchase order:', error);
        await ctx.answerCbQuery('❌ Error al aceptar la orden. Intenta nuevamente.', { show_alert: true });
    }
};

/**
 * Send bank account details to client
 */
async function sendBankDetailsToClient(ctx, orderId, orderData) {
    try {
        // TODO: Get owner's bank account from Firestore
        // For now, using placeholder data
        const bankDetails = {
            bank: 'BBVA',
            account: '1234 5678 9012 3456',
            clabe: '012345678901234567',
            holder: 'Dueño CHK'
        };

        const clientMessage = `✅ *Orden Aceptada*

Tu orden ha sido aceptada por un administrador.

💳 *Datos de Pago:*
──────────────────────
🏦 Banco: ${bankDetails.bank}
💳 Cuenta: ${bankDetails.account}
🔢 CLABE: ${bankDetails.clabe}
👤 Titular: ${bankDetails.holder}
──────────────────────

💰 *Total a pagar:* $${orderData.plan.price} ${orderData.plan.currency}

📸 *Envía tu comprobante de pago con:*
/capturapago

⏰ *Importante:* Tienes 24 horas para enviar el comprobante.
Si no envías el pago a tiempo, la orden será cancelada.

🆔 ID de orden: \`${orderId}\``;

        await ctx.telegram.sendMessage(
            orderData.clientId,
            clientMessage,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Error sending bank details to client:', error);
    }
}

export default {
    handleBuyPlan,
    handleAcceptPurchaseOrder
};
