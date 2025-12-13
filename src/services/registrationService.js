import { db } from '../config/firebase.js';

/**
 * Registration Service
 * Listens for new registration requests and sends confirmation to Telegram
 */
class RegistrationService {
  constructor(bot) {
    this.bot = bot;
    this.unsubscribe = null;
    this.initialized = false;
  }

  /**
   * Start listening for new registrations
   */
  start() {
    console.log('📝 Registration Service: Starting listener...');

    const registrationsRef = db.collection('pending_registrations');

    this.unsubscribe = registrationsRef
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
        // Skip initial snapshot
        if (!this.initialized) {
          console.log('📝 Initial snapshot received, skipping', snapshot.size, 'existing registrations');
          this.initialized = true;
          return;
        }

        console.log('📝 Registrations snapshot received! Changes:', snapshot.docChanges().length);
        
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const regData = change.doc.data();
            const regId = change.doc.id;

            console.log('📝 New registration request:', {
              regId: regId,
              username: regData.username,
              telegramId: regData.telegramId
            });

            // Send confirmation to user
            await this.sendConfirmation(regData, regId);
          }
        });
      }, (error) => {
        console.error('📝 ERROR in registration listener:', error);
      });

    console.log('📝 Registration Service: Listener active');
  }

  /**
   * Send confirmation message with inline buttons
   */
  async sendConfirmation(regData, regId) {
    try {
      console.log('📝 Sending confirmation to Telegram ID:', regData.telegramId);

      const message = `
🆕 *Nueva Solicitud de Registro*

👤 *Username:* ${regData.username}
🆔 *Telegram ID:* ${regData.telegramId}

¿Deseas crear esta cuenta?

⏰ Esta solicitud expira en 10 minutos.
      `.trim();

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Confirmar', callback_data: `confirm_reg_${regId}` },
            { text: '❌ Cancelar', callback_data: `cancel_reg_${regId}` }
          ]
        ]
      };

      await this.bot.telegram.sendMessage(regData.telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      console.log('📝 ✅ Confirmation sent to Telegram ID:', regData.telegramId);

    } catch (error) {
      console.error('📝 Error sending confirmation:', error);
      
      // Mark registration as failed if can't send message
      await db.collection('pending_registrations').doc(regId).update({
        status: 'failed',
        error: 'Could not send Telegram message',
        failedAt: new Date()
      });
    }
  }

  /**
   * Stop listening for registrations
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      console.log('📝 Registration Service: Listener stopped');
    }
  }
}

export default RegistrationService;
