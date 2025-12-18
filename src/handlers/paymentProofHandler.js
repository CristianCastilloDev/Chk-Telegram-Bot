import admin from 'firebase-admin';
import { db } from '../config/firebase.js';
import fetch from 'node-fetch';
import { escapeUsername } from '../utils/markdown.js';

/**
 * Handle photo uploads for payment proof
 */
export const handlePaymentProofPhoto = async (ctx) => {
    try {
        console.log('📸 Photo received from user:', ctx.from.id);

        const user = ctx.user;

        if (!user) {
            console.log('⚠️ User not authenticated');
            return;
        }

        console.log('✅ User authenticated:', user.email);

        // Check if user has a pending order awaiting payment proof
        const ordersSnapshot = await db.collection('purchase_orders')
            .where('clientId', '==', ctx.from.id.toString())
            .where('status', '==', 'accepted')
            .where('awaitingPaymentProof', '==', true)
            .limit(1)
            .get();

        console.log('📦 Orders found:', ordersSnapshot.size);

        if (ordersSnapshot.empty) {
            console.log('❌ No order awaiting payment proof for user:', ctx.from.id);
            return; // Not waiting for payment proof, ignore photo
        }

        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data();
        const orderId = orderDoc.id;

        await ctx.reply('⏳ Procesando tu comprobante de pago...');

        // Get the largest photo
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

        // Download photo
        const response = await fetch(photoUrl);
        const buffer = await response.arrayBuffer();

        // Upload to Firebase Storage
        const bucketName = `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`;
        const bucket = admin.storage().bucket(bucketName);
        const fileName = `payment_proofs/${orderId}_${Date.now()}.jpg`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(Buffer.from(buffer), {
            metadata: {
                contentType: 'image/jpeg',
                metadata: {
                    orderId: orderId,
                    clientId: ctx.from.id.toString(),
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        // Make file publicly accessible
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Update order with payment proof
        await db.collection('purchase_orders').doc(orderId).update({
            paymentProof: {
                url: publicUrl,
                fileName: fileName,
                uploadedAt: new Date()
            },
            status: 'payment_sent',
            awaitingPaymentProof: false,
            'timestamps.paymentSent': new Date()
        });

        // Notify client
        await ctx.reply(
            `✅ *Comprobante Recibido*\n\n` +
            `Tu comprobante de pago ha sido enviado al administrador.\n\n` +
            `📋 Orden: \`${orderId}\`\n` +
            `⏳ Espera la verificación del pago.\n\n` +
            `Te notificaremos cuando sea aprobado.`,
            { parse_mode: 'Markdown' }
        );

        // Notify admin who accepted the order
        await notifyAdminPaymentProof(ctx, orderId, orderData, publicUrl);

    } catch (error) {
        console.error('Error handling payment proof photo:', error);
        await ctx.reply('❌ Error al procesar el comprobante. Por favor, intenta de nuevo.');
    }
};

/**
 * Notify admin about payment proof
 */
async function notifyAdminPaymentProof(ctx, orderId, orderData, photoUrl) {
    try {
        const adminMessage = `💸 *Comprobante de Pago Recibido*

📋 *Orden:* \`${orderId}\`
👤 *Cliente:* @${escapeUsername(orderData.clientUsername)}
💰 *Plan:* ${orderData.plan.name}
💵 *Monto:* $${orderData.plan.price} ${orderData.plan.currency}

El cliente ha enviado su comprobante de pago.
Por favor, verifica la imagen y aprueba o rechaza el pago.`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Aprobar Pago', callback_data: `approve_payment_${orderId}` },
                    { text: '❌ Rechazar Pago', callback_data: `reject_payment_${orderId}` }
                ]
            ]
        };

        // Send message with photo to admin
        await ctx.telegram.sendPhoto(
            orderData.adminId,
            photoUrl,
            {
                caption: adminMessage,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );

    } catch (error) {
        console.error('Error notifying admin:', error);
    }
}

export default {
    handlePaymentProofPhoto
};
