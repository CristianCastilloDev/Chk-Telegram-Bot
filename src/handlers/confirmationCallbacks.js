import { db } from '../config/firebase.js';

/**
 * Handle client confirmation callbacks
 */

/**
 * Handle "Yes, I received it" callback
 */
export const handleConfirmReceived = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const orderId = ctx.callbackQuery.data.replace('confirm_received_', '');

        const orderRef = db.collection('purchase_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return ctx.editMessageText('❌ Orden no encontrada.', { parse_mode: 'Markdown' });
        }

        const order = orderDoc.data();

        // Update order as confirmed and completed
        await orderRef.update({
            clientConfirmed: true,
            status: 'completed',
            'timestamps.completed': new Date()
        });

        // Update message
        await ctx.editMessageText(
            `✅ *¡Gracias por Confirmar!*\n\n` +
            `Tu orden ha sido completada exitosamente.\n\n` +
            `📋 Orden: \`${orderId}\`\n` +
            `💰 Plan: ${order.plan.name}\n\n` +
            `¡Gracias por tu compra! 🎉`,
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Client confirmed receipt for order ${orderId}`);

    } catch (error) {
        console.error('Error handling confirm received:', error);
        await ctx.answerCbQuery('❌ Error al procesar confirmación.', { show_alert: true });
    }
};

/**
 * Handle "No, I didn't receive it" callback - FRAUD DETECTION
 */
export const handleConfirmNotReceived = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const orderId = ctx.callbackQuery.data.replace('confirm_not_received_', '');

        const orderRef = db.collection('purchase_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return ctx.editMessageText('❌ Orden no encontrada.', { parse_mode: 'Markdown' });
        }

        const order = orderDoc.data();

        // FRAUD DETECTION: Check if plan is actually active
        const userSnapshot = await db.collection('users')
            .where('telegramId', '==', order.clientId)
            .limit(1)
            .get();

        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const userId = userSnapshot.docs[0].id;

            let planIsActive = false;

            if (order.plan.type === 'days') {
                // Check if plan is active and not expired
                const planExpiry = userData.planExpiresAt?.toDate();
                planIsActive = planExpiry && planExpiry > new Date() && userData.plan === order.plan.id;
            } else if (order.plan.type === 'credits') {
                // Check if credits were added
                planIsActive = userData.credits >= order.plan.credits;
            }

            if (planIsActive) {
                // FRAUD DETECTED: Client says they didn't receive but plan is active
                await orderRef.update({
                    clientConfirmed: false,
                    fraudDetected: true,
                    fraudReason: 'Client claims non-receipt but plan is active',
                    status: 'disputed',
                    'timestamps.disputed': new Date()
                });

                // Remove the plan/credits
                if (order.plan.type === 'days') {
                    await db.collection('users').doc(userId).update({
                        plan: 'free',
                        planExpiresAt: new Date()
                    });
                } else if (order.plan.type === 'credits') {
                    const newCredits = Math.max(0, userData.credits - order.plan.credits);
                    await db.collection('users').doc(userId).update({
                        credits: newCredits
                    });
                }

                // Notify client about fraud detection
                await ctx.editMessageText(
                    `⚠️ *Advertencia de Fraude Detectado*\n\n` +
                    `Nuestro sistema detectó que tu plan está activo.\n\n` +
                    `📋 Orden: \`${orderId}\`\n` +
                    `💰 Plan: ${order.plan.name}\n\n` +
                    `❌ Tu plan ha sido removido y la orden marcada como disputada.\n\n` +
                    `Un administrador revisará tu caso.`,
                    { parse_mode: 'Markdown' }
                );

                // Notify admin about fraud
                if (order.adminId) {
                    await ctx.telegram.sendMessage(
                        order.adminId,
                        `🚨 *FRAUDE DETECTADO*\n\n` +
                        `👤 Cliente: @${order.clientUsername}\n` +
                        `📋 Orden: \`${orderId}\`\n` +
                        `💰 Plan: ${order.plan.name}\n\n` +
                        `El cliente dijo que no recibió el plan, pero el plan estaba activo.\n\n` +
                        `✅ Plan removido automáticamente\n` +
                        `📝 Orden marcada como disputada`,
                        { parse_mode: 'Markdown' }
                    );
                }

                console.log(`🚨 FRAUD DETECTED for order ${orderId}`);

            } else {
                // Plan is NOT active - legitimate complaint
                await orderRef.update({
                    clientConfirmed: false,
                    status: 'disputed',
                    'timestamps.disputed': new Date()
                });

                await ctx.editMessageText(
                    `❌ *Problema Reportado*\n\n` +
                    `Lamentamos que no hayas recibido tu plan.\n\n` +
                    `📋 Orden: \`${orderId}\`\n` +
                    `💰 Plan: ${order.plan.name}\n\n` +
                    `Un administrador revisará tu caso y te contactará pronto.`,
                    { parse_mode: 'Markdown' }
                );

                // Notify admin
                if (order.adminId) {
                    await ctx.telegram.sendMessage(
                        order.adminId,
                        `⚠️ *Cliente Reporta Problema*\n\n` +
                        `👤 Cliente: @${order.clientUsername}\n` +
                        `📋 Orden: \`${orderId}\`\n` +
                        `💰 Plan: ${order.plan.name}\n\n` +
                        `El cliente dice que no recibió el plan.\n` +
                        `✅ Verificado: El plan NO está activo\n\n` +
                        `Por favor, revisa y resuelve este caso.`,
                        { parse_mode: 'Markdown' }
                    );
                }

                console.log(`⚠️ Legitimate complaint for order ${orderId}`);
            }
        }

    } catch (error) {
        console.error('Error handling confirm not received:', error);
        await ctx.answerCbQuery('❌ Error al procesar reporte.', { show_alert: true });
    }
};

export default {
    handleConfirmReceived,
    handleConfirmNotReceived
};
