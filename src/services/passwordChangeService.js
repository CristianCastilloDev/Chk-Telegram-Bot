import { db } from '../config/firebase.js';

/**
 * Password Change Notification Service
 * Listens for new password change requests and sends codes to users via Telegram
 */
class PasswordChangeService {
  constructor(bot) {
    this.bot = bot;
    this.unsubscribe = null;
    this.initialized = false;
  }

  /**
   * Start listening for password change requests
   */
  start() {
    console.log('🔐 Password Change Service: Starting listener...');

    const changesRef = db.collection('pending_password_changes');

    // Test: First check if we can read the collection
    changesRef.limit(1).get()
      .then(snapshot => {
        console.log('🔐 Test read successful. Collection accessible.');
        console.log('🔐 Documents found:', snapshot.size);
      })
      .catch(error => {
        console.error('🔐 ERROR: Cannot read collection:', error.message);
      });

    this.unsubscribe = changesRef
      .where('used', '==', false)
      .onSnapshot(async (snapshot) => {
        // Skip initial snapshot
        if (!this.initialized) {
          console.log('🔐 Initial snapshot received, skipping', snapshot.size, 'existing changes');
          this.initialized = true;
          return;
        }

        console.log('🔐 Snapshot received! Changes:', snapshot.docChanges().length);
        
        snapshot.docChanges().forEach(async (change) => {
          console.log('🔐 Change type:', change.type);
          
          if (change.type === 'added') {
            const changeData = change.doc.data();
            const changeId = change.doc.id;

            console.log('🔐 New password change request detected:', {
              changeId: changeId,
              userId: changeData.userId,
              telegramId: changeData.telegramId,
              code: changeData.code,
              used: changeData.used
            });

            // Send code to user via Telegram
            await this.sendPasswordCode(changeData, changeId);
          }
        });
      }, (error) => {
        console.error('🔐 ERROR in password change listener:', error);
        console.error('🔐 Error details:', error.message);
        console.error('🔐 Error code:', error.code);
      });

    console.log('🔐 Password Change Service: Listener active');
  }

  /**
   * Send password change code to user via Telegram
   */
  async sendPasswordCode(changeData, changeId) {
    try {
      const { telegramId, code, userId } = changeData;

      console.log('🔐 Attempting to send code to Telegram ID:', telegramId);

      // Get user's chat ID from telegram_users collection
      const telegramUsersRef = db.collection('telegram_users');
      const snapshot = await telegramUsersRef
        .where('telegramId', '==', telegramId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.error('🔐 No Telegram user found for telegramId:', telegramId);
        return;
      }

      const telegramUser = snapshot.docs[0].data();
      const chatId = telegramUser.chatId;

      console.log('🔐 Found telegram user. ChatId:', chatId);

      if (!chatId) {
        console.error('🔐 No chatId found for user. User needs to start the bot first.');
        return;
      }

      // Send message with code
      const message = `
🔐 *Cambio de Contraseña*

Has solicitado cambiar tu contraseña.

*Código de confirmación:* \`${code}\`

Este código expira en 10 minutos.

⚠️ Si no solicitaste este cambio, ignora este mensaje.
      `.trim();

      console.log('🔐 Sending message to chatId:', chatId);

      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
      });

      console.log('🔐 ✅ Password code sent successfully to chatId:', chatId);

    } catch (error) {
      console.error('🔐 ❌ Error sending password code:', error);
      console.error('🔐 Error details:', error.message);
    }
  }

  /**
   * Stop listening for password change requests
   */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      console.log('🔐 Password Change Service: Listener stopped');
    }
  }
}

export default PasswordChangeService;
