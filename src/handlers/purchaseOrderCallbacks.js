import { db } from '../config/firebase.js';
import { PLANS } from '../config/constants.js';
import { escapeUsername } from '../utils/markdown.js';

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
 * Notify all admins and devs about new order
 */
async function notifyAdmins(ctx, orderId, orderData) {
    try {
        console.log('📦 Sending notifications to admins and devs for order:', orderId);

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
            const userRole = userData.role;

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

            // Calculate commission based on role
            const commissionPercent = userRole === 'admin' ? 20 : 10;
            const commissionAmount = (orderData.plan.price * commissionPercent / 100).toFixed(2);

            const adminMessage = `🔔 *Nueva Orden de Compra*

👤 *Cliente:* @${escapeUsername(orderData.clientUsername)}
🆔 *ID Cliente:* \`${orderData.clientId}\`
📋 *Plan:* ${orderData.plan.name}
💰 *Precio:* $${orderData.plan.price} ${orderData.plan.currency}
📅 *Fecha:* ${new Date().toLocaleDateString('es-ES')}

💵 *Tu comisión:* $${commissionAmount} (${commissionPercent}%)

──────────────────────`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✅ Aceptar Orden', callback_data: `accept_purchase_${orderId}` }
                    ]
                ]
            };

            try {
                await ctx.telegram.sendMessage(
                    chatId,
                    adminMessage,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    }
                );
                console.log(`📦 ✅ Notification sent to ${userData.email} (${userRole})`);
            } catch (error) {
                console.error(`📦 Error notifying ${userData.email}:`, error);
            }
        }
    } catch (error) {
        console.error('📦 Error notifying admins and devs:', error);
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
• Cliente: @${escapeUsername(orderData.clientUsername)}
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
        // Import getBankDetails dynamically to avoid circular dependency
        const { getBankDetails } = await import('../commands/admin/banca.js');

        // Get owner's bank account from Firestore
        const bankDetails = await getBankDetails();

        if (!bankDetails) {
            console.error('No bank details configured');
            return;
        }

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

/**
 * Handle approve payment callback
 */
export const handleApprovePayment = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const user = ctx.user;
        if (!user || (user.role !== 'admin' && user.role !== 'dev')) {
            return ctx.answerCbQuery('❌ Solo admins y devs pueden aprobar pagos.', { show_alert: true });
        }

        const orderId = ctx.callbackQuery.data.replace('approve_payment_', '');

        const orderRef = db.collection('purchase_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return ctx.editMessageCaption('❌ Orden no encontrada.', { parse_mode: 'Markdown' });
        }

        const orderData = orderDoc.data();

        if (orderData.status !== 'payment_sent') {
            return ctx.editMessageCaption('❌ Esta orden ya fue procesada.', { parse_mode: 'Markdown' });
        }

        // Apply plan to user
        await applyPlanToUser(orderData);

        // Calculate commissions
        const commissions = calculateCommissions(orderData);

        // Update order status
        await orderRef.update({
            status: 'approved',
            'timestamps.approved': new Date(),
            commissions: commissions,
            approvedBy: ctx.from.id.toString()
        });

        // Update earnings for seller
        await updateEarnings(orderData, commissions);

        // Update admin's message
        const updatedCaption = `✅ *Pago Aprobado*\n\n` +
            `📋 Orden: \`${orderId}\`\n` +
            `👤 Cliente: @${escapeUsername(orderData.clientUsername)}\n` +
            `💰 Plan: ${orderData.plan.name}\n` +
            `💵 Monto: $${orderData.plan.price} ${orderData.plan.currency}\n\n` +
            `✅ Plan aplicado al cliente\n` +
            `📅 Aprobado: ${new Date().toLocaleDateString('es-ES')}`;

        await ctx.editMessageCaption(updatedCaption, { parse_mode: 'Markdown' });

        // Notify client
        await ctx.telegram.sendMessage(
            orderData.clientId,
            `🎉 *¡Pago Aprobado!*\n\n` +
            `Tu pago ha sido verificado y aprobado.\n` +
            `Tu plan ${orderData.plan.name} ha sido activado.\n\n` +
            `📋 Orden: \`${orderId}\`\n\n` +
            `¡Gracias por tu compra! 🚀`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Error approving payment:', error);
        await ctx.answerCbQuery('❌ Error al aprobar el pago.', { show_alert: true });
    }
};

/**
 * Handle reject payment callback
 */
export const handleRejectPayment = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const user = ctx.user;
        if (!user || (user.role !== 'admin' && user.role !== 'dev')) {
            return ctx.answerCbQuery('❌ Solo admins y devs pueden rechazar pagos.', { show_alert: true });
        }

        const orderId = ctx.callbackQuery.data.replace('reject_payment_', '');

        const orderRef = db.collection('purchase_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return ctx.editMessageCaption('❌ Orden no encontrada.', { parse_mode: 'Markdown' });
        }

        const orderData = orderDoc.data();

        if (orderData.status !== 'payment_sent') {
            return ctx.editMessageCaption('❌ Esta orden ya fue procesada.', { parse_mode: 'Markdown' });
        }

        // Update order status
        await orderRef.update({
            status: 'rejected',
            'timestamps.rejected': new Date(),
            rejectedBy: ctx.from.id.toString(),
            rejectionReason: 'Comprobante de pago no válido'
        });

        // Update admin's message
        const updatedCaption = `❌ *Pago Rechazado*\n\n` +
            `📋 Orden: \`${orderId}\`\n` +
            `👤 Cliente: @${escapeUsername(orderData.clientUsername)}\n` +
            `💰 Plan: ${orderData.plan.name}\n` +
            `💵 Monto: $${orderData.plan.price} ${orderData.plan.currency}\n\n` +
            `❌ Comprobante rechazado\n` +
            `📅 Rechazado: ${new Date().toLocaleDateString('es-ES')}`;

        await ctx.editMessageCaption(updatedCaption, { parse_mode: 'Markdown' });

        // Notify client
        await ctx.telegram.sendMessage(
            orderData.clientId,
            `❌ *Pago Rechazado*\n\n` +
            `Tu comprobante de pago no pudo ser verificado.\n\n` +
            `📋 Orden: \`${orderId}\`\n` +
            `📝 Razón: Comprobante no válido\n\n` +
            `Por favor, verifica que el comprobante sea correcto y vuelve a intentarlo.`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error('Error rejecting payment:', error);
        await ctx.answerCbQuery('❌ Error al rechazar el pago.', { show_alert: true });
    }
};

/**
 * Apply plan to user based on plan type
 */
async function applyPlanToUser(orderData) {
    console.log('🔍 Looking for user with clientId:', orderData.clientId, 'Type:', typeof orderData.clientId);

    // First, find the Firebase UID using telegram_users collection
    // Try both chatId and telegramId fields
    const clientIdStr = orderData.clientId.toString();

    let telegramUserSnapshot = await db.collection('telegram_users')
        .where('chatId', '==', clientIdStr)
        .limit(1)
        .get();

    // If not found by chatId, try telegramId field
    if (telegramUserSnapshot.empty) {
        console.log('⚠️ Not found by chatId, trying telegramId field...');
        telegramUserSnapshot = await db.collection('telegram_users')
            .where('telegramId', '==', clientIdStr)
            .limit(1)
            .get();
    }

    if (telegramUserSnapshot.empty) {
        console.log('❌ No telegram_users entry found for:', clientIdStr);
        throw new Error('User not found in telegram_users');
    }

    const telegramUserData = telegramUserSnapshot.docs[0].data();
    const firebaseUid = telegramUserData.firebaseUid;

    console.log('✅ Found Firebase UID:', firebaseUid);

    // Now get the user document
    const userDoc = await db.collection('users').doc(firebaseUid).get();

    if (!userDoc.exists) {
        console.log('❌ No user found with UID:', firebaseUid);
        throw new Error('User not found');
    }

    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('✅ User found:', userId, userData.email);

    if (orderData.plan.type === 'days') {
        // Apply day-based plan
        const now = new Date();
        const currentExpiry = userData.planExpiresAt?.toDate() || now;
        const startDate = currentExpiry > now ? currentExpiry : now;
        const expiryDate = new Date(startDate.getTime() + orderData.plan.duration * 24 * 60 * 60 * 1000);

        await db.collection('users').doc(userId).update({
            plan: orderData.plan.id,
            planExpiresAt: expiryDate,
            updatedAt: new Date()
        });

    } else if (orderData.plan.type === 'credits') {
        // Apply credit-based plan
        const currentCredits = userData.credits || 0;

        await db.collection('users').doc(userId).update({
            credits: currentCredits + orderData.plan.credits,
            updatedAt: new Date()
        });
    }
}

/**
 * Calculate commissions based on fixed percentages
 * - 60% Owner (fixed)
 * - 20% Devs total (10% each for 2 devs, fixed)
 * - 20% Seller (whoever accepted the order)
 */
function calculateCommissions(orderData) {
    const totalAmount = orderData.plan.price;

    return {
        owner: totalAmount * 0.60,      // 60% fixed for owner
        devs: totalAmount * 0.20,       // 20% fixed for devs (to be split)
        seller: totalAmount * 0.20,     // 20% for seller
        sellerId: orderData.adminId
    };
}

/**
 * Update earnings for all parties (owner, devs, seller)
 */
async function updateEarnings(orderData, commissions) {
    try {
        const sellerId = orderData.adminId;
        const totalAmount = orderData.plan.price;

        // Get current month key (YYYY-MM)
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Import commission config
        const { COMMISSION_CONFIG, getDevCommission } = await import('../config/commissions.js');

        // 1. Update seller earnings (20%)
        await updateUserEarnings(sellerId, commissions.seller, totalAmount, monthKey, true);
        console.log(`✅ Seller ${sellerId}: +$${commissions.seller.toFixed(2)}`);

        // 2. Update owner earnings (60%) - if owner is set
        if (COMMISSION_CONFIG.OWNER_CHAT_ID) {
            await updateUserEarnings(COMMISSION_CONFIG.OWNER_CHAT_ID, commissions.owner, totalAmount, monthKey, false);
            console.log(`✅ Owner ${COMMISSION_CONFIG.OWNER_CHAT_ID}: +$${commissions.owner.toFixed(2)}`);
        }

        // 3. Update each dev earnings (10% each)
        const devCommission = getDevCommission(totalAmount);
        for (const devChatId of COMMISSION_CONFIG.DEV_CHAT_IDS) {
            await updateUserEarnings(devChatId, devCommission, totalAmount, monthKey, false);
            console.log(`✅ Dev ${devChatId}: +$${devCommission.toFixed(2)}`);
        }

    } catch (error) {
        console.error('Error updating earnings:', error);
    }
}

/**
 * Helper function to update earnings for a specific user
 */
async function updateUserEarnings(userId, commission, totalAmount, monthKey, countAsSale) {
    const earningsRef = db.collection('earnings').doc(userId);
    const earningsDoc = await earningsRef.get();

    if (earningsDoc.exists) {
        // Update existing earnings
        const earnings = earningsDoc.data();
        const currentMonthly = earnings.monthly || {};
        const currentMonth = currentMonthly[monthKey] || { sales: 0, amount: 0, commission: 0 };

        const updateData = {
            'totals.totalCommissions': (earnings.totals?.totalCommissions || 0) + commission,
            'totals.pendingCommissions': (earnings.totals?.pendingCommissions || 0) + commission,
            [`monthly.${monthKey}.commission`]: currentMonth.commission + commission,
            lastUpdated: new Date()
        };

        // Only count as sale for the seller
        if (countAsSale) {
            updateData['totals.totalSales'] = (earnings.totals?.totalSales || 0) + 1;
            updateData['totals.totalAmount'] = (earnings.totals?.totalAmount || 0) + totalAmount;
            updateData[`monthly.${monthKey}.sales`] = currentMonth.sales + 1;
            updateData[`monthly.${monthKey}.amount`] = currentMonth.amount + totalAmount;
        }

        await earningsRef.update(updateData);
    } else {
        // Create new earnings document
        const newEarnings = {
            userId: userId,
            totals: {
                totalSales: countAsSale ? 1 : 0,
                totalAmount: countAsSale ? totalAmount : 0,
                totalCommissions: commission,
                paidCommissions: 0,
                pendingCommissions: commission
            },
            monthly: {
                [monthKey]: {
                    sales: countAsSale ? 1 : 0,
                    amount: countAsSale ? totalAmount : 0,
                    commission: commission
                }
            },
            lastUpdated: new Date()
        };

        await earningsRef.set(newEarnings);
    }
}

export default {
    handleBuyPlan,
    handleAcceptPurchaseOrder,
    handleApprovePayment,
    handleRejectPayment
};
