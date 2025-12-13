import { db } from '../config/firebase.js';

/**
 * Password Reset Service
 * Listens for password reset requests and sends confirmation buttons to Telegram
 */
class PasswordResetService {
  constructor(bot) {
    this.bot = bot;
    this.unsubscribe = null;
  }

  /**
   * Start listening for password reset requests
   */
  start() {
    console.log('🔑 Password Reset Service: Starting listener...');

    const resetsRef = db.collection('pending_password_resets');

    this.unsubscribe = resetsRef
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
        console.log('🔑 Password resets snapshot received! Changes:', snapshot.docChanges().length);
        
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const resetData = change.doc.data();
            const resetId = change.doc.id;

            console.log('🔑 New password reset request:', {
              resetId: resetId,
              username: resetData.username,
              telegramId: resetData.telegramId
            });

            // Send confirmation buttons to user
            await this.sendConfirmation(resetData, resetId);
          }
        });
      }, (error) => {
        console.error('🔑 ERROR in password reset listener:', error);
      });

    console.log('🔑 Password Reset Service: Listener active');
  }

  /**
   * Send confirmation message with inline buttons
   */
  async sendConfirmation(resetData, resetId) {
    try {
      console.log('🔑 Sending confirmation to Telegram ID:', resetData.telegramId);

      const message = `
🔑 *Solicitud de Cambio de Contraseña*

👤 *Usuario:* ${resetData.username}

¿Deseas cambiar tu contraseña?

⏰ Esta solicitud expira en 10 minutos.

⚠️ Si no solicitaste este cambio, haz clic en "Cancelar".
      `.trim();

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Confirmar', callback_data: `confirm_reset_${resetId}` },
            { text: '❌ Cancelar', callback_data: `cancel_reset_${resetId}` }
          ]
        ]
      };

      await this.bot.telegram.sendMessage(resetData.telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log('🔑 ✅ Confirmation sent to Telegram ID:', resetData.telegramId);

    } catch (error) {
      console.error('🔑 Error sending confirmation:', error);
      
      // Mark reset as failed
      await db.collection('pending_password_resets').doc(resetId).update({
        status: 'failed',
        error: 'Could not send Telegram message',
        failedAt: new Date()
      });
    }
  }

  /**
   * Stop listening for password resets
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      console.log('🔑 Password Reset Service: Listener stopped');
    }
  }
}

export default PasswordResetService;
