import { db } from '../../config/firebase.js';

/**
 * /misordenes command - View user's order history
 */
export const misordenesCommand = async (ctx) => {
    const user = ctx.user;

    if (!user) {
        return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
    }

    try {
        // Get all orders for this user (without orderBy to avoid index requirement)
        const ordersSnapshot = await db.collection('purchase_orders')
            .where('clientId', '==', ctx.from.id.toString())
            .get();

        if (ordersSnapshot.empty) {
            return ctx.reply(
                '📋 *Mis Órdenes*\n\n' +
                'No tienes órdenes registradas.\n\n' +
                'Usa /buy para crear una nueva orden.',
                { parse_mode: 'Markdown' }
            );
        }

        // Sort orders manually by creation date (newest first)
        const orders = [];
        ordersSnapshot.forEach((doc) => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });

        orders.sort((a, b) => {
            const dateA = a.timestamps?.created?.toDate() || new Date(0);
            const dateB = b.timestamps?.created?.toDate() || new Date(0);
            return dateB - dateA; // Newest first
        });

        // Limit to 10 most recent
        const recentOrders = orders.slice(0, 10);

        // Build message with all orders
        let message = '📋 *Mis Órdenes*\n\n';
        message += `Total: ${recentOrders.length} orden(es)\n`;
        message += '──────────────────────\n\n';

        recentOrders.forEach((order, index) => {
            const orderId = order.id;

            // Status emoji and text
            let statusEmoji = '';
            let statusText = '';

            switch (order.status) {
                case 'pending':
                    statusEmoji = '⏳';
                    statusText = 'Pendiente';
                    break;
                case 'accepted':
                    statusEmoji = '✅';
                    statusText = 'Aceptada';
                    break;
                case 'payment_sent':
                    statusEmoji = '📸';
                    statusText = 'Pago Enviado';
                    break;
                case 'approved':
                    statusEmoji = '🎉';
                    statusText = 'Aprobada';
                    break;
                case 'rejected':
                    statusEmoji = '❌';
                    statusText = 'Rechazada';
                    break;
                case 'expired':
                    statusEmoji = '⏰';
                    statusText = 'Expirada';
                    break;
                default:
                    statusEmoji = '❓';
                    statusText = order.status;
            }

            message += `${index + 1}. ${statusEmoji} *${statusText}*\n`;
            message += `   📋 ID: \`${orderId.substring(0, 8)}...\`\n`;
            message += `   💰 Plan: ${order.plan.name}\n`;
            message += `   💵 Precio: $${order.plan.price} ${order.plan.currency}\n`;
            message += `   📅 Creada: ${order.timestamps.created.toDate().toLocaleDateString('es-ES')}\n`;

            // Additional info based on status
            if (order.status === 'pending') {
                message += `   ⏰ Esperando aceptación de admin\n`;
            } else if (order.status === 'accepted') {
                message += `   💳 Envía tu pago con /capturapago\n`;
                const hoursLeft = Math.max(0, Math.floor((order.timestamps.expiresAt.toDate() - new Date()) / (1000 * 60 * 60)));
                message += `   ⏳ Tiempo restante: ${hoursLeft}h\n`;
            } else if (order.status === 'payment_sent') {
                message += `   ⏳ Esperando verificación del pago\n`;
            } else if (order.status === 'approved') {
                message += `   ✅ Plan activado exitosamente\n`;
            } else if (order.status === 'rejected') {
                message += `   📝 Razón: ${order.rejectionReason || 'No especificada'}\n`;
            }

            message += '\n';
        });

        message += '──────────────────────\n';
        message += 'Usa /buy para crear una nueva orden';

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error fetching orders:', error);
        await ctx.reply('❌ Error al obtener tus órdenes. Intenta de nuevo más tarde.');
    }
};

export default misordenesCommand;
