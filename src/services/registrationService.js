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
              telegramId: regData.telegramId,
              messageSent: regData.messageSent || false
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

      // Check if message was already sent (prevent duplicates from multiple bot instances)
      if (regData.messageSent) {
        console.log('📝 ⚠️ Message already sent for this registration, skipping');
        return;
      }

      // Mark as message sent IMMEDIATELY to prevent race conditions
      await db.collection('pending_registrations').doc(regId).update({
        messageSent: true,
        messageSentAt: new Date()
      });

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

      // Mark as message sent
      await db.collection('pending_registrations').doc(regId).update({
        messageSent: true,
        messageSentAt: new Date()
      });

      console.log('📝 ✅ Confirmation sent to Telegram ID:', regData.telegramId);

    } catch (error) {
      console.error('📝 Error sending confirmation:', error);

      // Determine specific error type
      let errorMessage = 'Could not send Telegram message';
      let errorDetails = error.message || '';

      // Check if user hasn't started conversation with bot
      if (error.response?.error_code === 403 ||
        errorDetails.includes('bot was blocked') ||
        errorDetails.includes('user is deactivated') ||
        errorDetails.includes('bot can\'t initiate conversation')) {
        errorMessage = 'User has not started conversation with bot. Please send /start to the bot first.';
      } else if (error.response?.error_code === 400) {
        errorMessage = 'Invalid Telegram ID. Please verify your Telegram ID is correct.';
      }

      // Mark registration as failed with detailed error
      await db.collection('pending_registrations').doc(regId).update({
        status: 'failed',
        error: errorMessage,
        errorDetails: errorDetails,
        failedAt: new Date()
      });

      console.error(`📝 ❌ Registration failed for ${regData.telegramId}: ${errorMessage}`);
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
