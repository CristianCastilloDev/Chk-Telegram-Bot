import admin from 'firebase-admin';
import { db } from '../config/firebase.js';

/**
 * Handle password reset confirmation callbacks
 */

/**
 * Handle confirm password reset button
 */
export const handleConfirmReset = async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const resetId = callbackData.replace('confirm_reset_', '');
    
    console.log('✅ Confirm password reset clicked for:', resetId);
    
    await ctx.answerCbQuery('⏳ Actualizando contraseña...');
    
    // Get reset data
    const resetDoc = await db.collection('pending_password_resets').doc(resetId).get();
    
    if (!resetDoc.exists) {
      await ctx.answerCbQuery('❌ Solicitud no encontrada', { show_alert: true });
      return;
    }
    
    const resetData = resetDoc.data();
    
    if (resetData.status !== 'pending') {
      await ctx.answerCbQuery('❌ Esta solicitud ya fue procesada', { show_alert: true });
      return;
    }

    // Check if expired
    const now = Date.now();
    const expiresAt = resetData.expiresAt.toMillis();
    if (now > expiresAt) {
      await db.collection('pending_password_resets').doc(resetId).update({
        status: 'expired',
        expiredAt: new Date()
      });
      
      await ctx.editMessageText('❌ *Solicitud Expirada*\n\nEsta solicitud ha expirado. Solicita un nuevo cambio de contraseña.', {
        parse_mode: 'Markdown'
      });
      return;
    }
    
    // Update password in Firebase Auth
    try {
      await admin.auth().updateUser(resetData.userId, {
        password: resetData.newPassword
      });
      
      console.log('✅ Password updated for user:', resetData.userId);
      
      // Mark reset as completed
      await db.collection('pending_password_resets').doc(resetId).update({
        status: 'completed',
        completedAt: new Date()
      });
      
      // Send success message
      await ctx.editMessageText(
        `✅ *¡Contraseña Actualizada!*\n\n` +
        `Tu contraseña ha sido cambiada exitosamente.\n\n` +
        `Ya puedes iniciar sesión en la aplicación web con tu nueva contraseña.`,
        { parse_mode: 'Markdown' }
      );
      
      console.log('✅ Password reset completed successfully for:', resetData.username);
      
    } catch (authError) {
      console.error('Error updating password in Firebase Auth:', authError);
      
      await db.collection('pending_password_resets').doc(resetId).update({
        status: 'failed',
        error: authError.message,
        failedAt: new Date()
      });
      
      await ctx.editMessageText('❌ *Error*\n\nNo se pudo actualizar la contraseña. Intenta de nuevo.', {
        parse_mode: 'Markdown'
      });
    }
    
  } catch (error) {
    console.error('Error confirming password reset:', error);
    await ctx.answerCbQuery('❌ Error al procesar: ' + error.message, { show_alert: true });
  }
};

/**
 * Handle cancel password reset button
 */
export const handleCancelReset = async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const resetId = callbackData.replace('cancel_reset_', '');
    
    console.log('❌ Cancel password reset clicked for:', resetId);
    
    await ctx.answerCbQuery('Solicitud cancelada');
    
    // Update reset status
    await db.collection('pending_password_resets').doc(resetId).update({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: 'user'
    });
    
    await ctx.editMessageText('❌ *Solicitud Cancelada*\n\nEl cambio de contraseña ha sido cancelado.', {
      parse_mode: 'Markdown'
    });
    
    console.log('❌ Password reset cancelled:', resetId);
    
  } catch (error) {
    console.error('Error cancelling password reset:', error);
    await ctx.answerCbQuery('❌ Error al cancelar', { show_alert: true });
  }
};

export default {
  handleConfirmReset,
  handleCancelReset
};
