import admin from 'firebase-admin';
import { db } from '../config/firebase.js';

/**
 * Handle registration confirmation callbacks
 */

/**
 * Generate unique user ID
 */
function generateUID() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle confirm registration button
 */
export const handleConfirmRegistration = async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const regId = callbackData.replace('confirm_reg_', '');

    console.log('✅ Confirm registration clicked for:', regId);

    await ctx.answerCbQuery('⏳ Creando cuenta...');

    // Get registration data
    const regDoc = await db.collection('pending_registrations').doc(regId).get();

    if (!regDoc.exists) {
      await ctx.answerCbQuery('❌ Registro no encontrado', { show_alert: true });
      return;
    }

    const regData = regDoc.data();

    if (regData.status !== 'pending') {
      await ctx.answerCbQuery('❌ Este registro ya fue procesado', { show_alert: true });
      return;
    }

    // Check if username already exists
    const usernameCheck = await db.collection('users')
      .where('username', '==', regData.username)
      .limit(1)
      .get();

    if (!usernameCheck.empty) {
      await db.collection('pending_registrations').doc(regId).update({
        status: 'rejected',
        rejectedAt: new Date(),
        error: 'Username already exists'
      });

      // 🔒 SECURITY: Delete after rejection
      setTimeout(async () => {
        try {
          await db.collection('pending_registrations').doc(regId).delete();
          console.log('🗑️ Deleted pending registration (username exists):', regId);
        } catch (deleteError) {
          console.error('⚠️ Failed to delete pending registration:', deleteError);
        }
      }, 2000);

      await ctx.editMessageText('❌ *Error*\n\nEste nombre de usuario ya está en uso.', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Check if Telegram ID already linked
    const telegramCheck = await db.collection('telegram_users')
      .where('telegramId', '==', regData.telegramId)
      .limit(1)
      .get();

    if (!telegramCheck.empty) {
      await db.collection('pending_registrations').doc(regId).update({
        status: 'rejected',
        rejectedAt: new Date(),
        error: 'Telegram ID already linked'
      });

      // 🔒 SECURITY: Delete after rejection
      setTimeout(async () => {
        try {
          await db.collection('pending_registrations').doc(regId).delete();
          console.log('🗑️ Deleted pending registration (telegram ID exists):', regId);
        } catch (deleteError) {
          console.error('⚠️ Failed to delete pending registration:', deleteError);
        }
      }, 2000);

      await ctx.editMessageText('❌ *Error*\n\nEste Telegram ID ya está vinculado a otra cuenta.', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Create user in Firebase Auth (let Firebase generate the UID)
    const email = `${regData.username.toLowerCase()}@telegram.user`;
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: false,
      displayName: regData.username,
      password: regData.password
    });

    console.log('✅ Firebase Auth user created:', userRecord.uid);

    // Create user document
    await db.collection('users').doc(userRecord.uid).set({
      name: regData.username,
      username: regData.username,
      email: `${regData.username}@telegram.user`,
      role: 'client',
      credits: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      registeredVia: 'telegram'
    });

    console.log('✅ User document created');

    // Try to get user's Telegram profile photo
    let photoURL = null;
    try {
      const photos = await ctx.telegram.getUserProfilePhotos(ctx.from.id, 0, 1);
      if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await ctx.telegram.getFile(fileId);
        const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

        // Download and convert to base64
        const response = await fetch(photoUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        photoURL = `data:image/jpeg;base64,${base64}`;

        // Update user document with photo
        await db.collection('users').doc(userRecord.uid).update({
          photoURL: photoURL,
          photoSource: 'telegram',
          photoUpdatedAt: new Date()
        });

        console.log('✅ Telegram profile photo imported');
      }
    } catch (photoError) {
      console.log('⚠️ Could not import Telegram photo:', photoError.message);
    }

    // Link Telegram account
    await db.collection('telegram_users').add({
      telegramId: regData.telegramId,
      firebaseUid: userRecord.uid,
      chatId: ctx.chat.id,
      username: ctx.from.username || null,
      linkedAt: new Date(),
      lastActive: new Date()
    });

    console.log('✅ Telegram account linked');

    // Update registration status
    await db.collection('pending_registrations').doc(regId).update({
      status: 'approved',
      approvedAt: new Date(),
      createdUserId: userRecord.uid
    });

    // 🔒 SECURITY: Delete the pending registration to remove sensitive data (password, telegram ID)
    // Wait a moment to ensure the frontend receives the status update first
    setTimeout(async () => {
      try {
        await db.collection('pending_registrations').doc(regId).delete();
        console.log('🗑️ Deleted pending registration (security cleanup):', regId);
      } catch (deleteError) {
        console.error('⚠️ Failed to delete pending registration:', deleteError);
      }
    }, 2000); // 2 second delay

    // Send success message
    await ctx.editMessageText(
      `✅ *¡Cuenta Creada Exitosamente!*\n\n` +
      `👤 Username: ${regData.username}\n` +
      `🆔 ID: \`${userRecord.uid}\`\n\n` +
      `Ya puedes iniciar sesión en la aplicación web.\n\n` +
      `Usa /help para ver los comandos disponibles.`,
      { parse_mode: 'Markdown' }
    );

    console.log('✅ Registration completed successfully for:', regData.username);

  } catch (error) {
    console.error('Error confirming registration:', error);
    await ctx.answerCbQuery('❌ Error al crear la cuenta: ' + error.message, { show_alert: true });
  }
};

/**
 * Handle cancel registration button
 */
export const handleCancelRegistration = async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const regId = callbackData.replace('cancel_reg_', '');

    console.log('❌ Cancel registration clicked for:', regId);

    await ctx.answerCbQuery('Registro cancelado');

    // Update registration status
    await db.collection('pending_registrations').doc(regId).update({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: 'user'
    });

    // 🔒 SECURITY: Delete the pending registration to remove sensitive data
    setTimeout(async () => {
      try {
        await db.collection('pending_registrations').doc(regId).delete();
        console.log('🗑️ Deleted pending registration (security cleanup):', regId);
      } catch (deleteError) {
        console.error('⚠️ Failed to delete pending registration:', deleteError);
      }
    }, 2000); // 2 second delay

    await ctx.editMessageText('❌ *Registro Cancelado*\n\nLa solicitud de registro ha sido cancelada.', {
      parse_mode: 'Markdown'
    });

    console.log('❌ Registration cancelled:', regId);

  } catch (error) {
    console.error('Error cancelling registration:', error);
    await ctx.answerCbQuery('❌ Error al cancelar', { show_alert: true });
  }
};

export default {
  handleConfirmRegistration,
  handleCancelRegistration
};
