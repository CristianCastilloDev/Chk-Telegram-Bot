import { db } from '../../config/firebase.js';

/**
 * /capturapago command - Upload payment proof for pending order
 */
export const capturaPagoCommand = async (ctx) => {
    const user = ctx.user;

    if (!user) {
        return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
    }

    // Check if user has any pending orders that were accepted
    const ordersSnapshot = await db.collection('purchase_orders')
        .where('clientId', '==', ctx.from.id.toString())
        .where('status', '==', 'accepted')
        .orderBy('timestamps.accepted', 'desc')
        .limit(1)
        .get();

    if (ordersSnapshot.empty) {
        return ctx.reply(
            '❌ No tienes órdenes pendientes de pago.\n\n' +
            'Primero debes crear una orden con /buy y esperar a que un admin la acepte.'
        );
    }

    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();
    const orderId = orderDoc.id;

    // Check if order expired
    const now = new Date();
    if (orderData.timestamps.expiresAt.toDate() < now) {
        await db.collection('purchase_orders').doc(orderId).update({
            status: 'expired'
        });
        return ctx.reply('❌ Esta orden expiró. Por favor, crea una nueva orden con /buy');
    }

    // Prompt user to send photo
    const message = `📸 *Enviar Comprobante de Pago*

📋 *Orden:* \`${orderId}\`
💰 *Plan:* ${orderData.plan.name}
💵 *Monto:* $${orderData.plan.price} ${orderData.plan.currency}

Por favor, envía la captura de pantalla de tu comprobante de pago.

⚠️ *Importante:*
• La imagen debe ser clara y legible
• Debe mostrar el monto completo
• Debe mostrar la fecha de la transacción

Envía la foto ahora:`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

    // Set a flag to expect photo from this user
    await db.collection('purchase_orders').doc(orderId).update({
        awaitingPaymentProof: true,
        'timestamps.paymentProofRequested': new Date()
    });

    console.log('✅ awaitingPaymentProof flag set for order:', orderId);
};

export default capturaPagoCommand;
