import admin from 'firebase-admin';
import { db } from '../config/firebase.js';

/**
 * Password Update Service
 * Listens for password update requests from web and updates Firebase Auth
 */
class PasswordUpdateService {
  constructor() {
    this.unsubscribe = null;
  }

  start() {
    console.log('🔐 Password Update Service: Starting listener...');

    const updatesRef = db.collection('pending_password_updates');

    this.unsubscribe = updatesRef.onSnapshot(async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const updateData = change.doc.data();
          const updateId = change.doc.id;

          console.log('🔐 New password update request for user:', updateData.userId);

          await this.updatePassword(updateData, updateId);
        }
      });
    });

    console.log('🔐 Password Update Service: Listener active');
  }

  async updatePassword(updateData, updateId) {
    try {
      // Update password in Firebase Auth
      await admin.auth().updateUser(updateData.userId, {
        password: updateData.newPassword
      });

      console.log('✅ Password updated for user:', updateData.userId);

      // Delete the update request
      await db.collection('pending_password_updates').doc(updateId).delete();

      // Mark reset as completed
      if (updateData.resetId) {
        await db.collection('pending_password_resets').doc(updateData.resetId).update({
          status: 'completed',
          completedAt: new Date()
        });
      }

    } catch (error) {
      console.error('❌ Error updating password:', error);
      
      // Mark as failed
      await db.collection('pending_password_updates').doc(updateId).update({
        status: 'failed',
        error: error.message,
        failedAt: new Date()
      });
    }
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      console.log('🔐 Password Update Service: Listener stopped');
    }
  }
}

export default PasswordUpdateService;
