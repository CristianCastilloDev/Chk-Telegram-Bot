/**
 * Script to manually create the Owner user
 * 
 * User Data:
 * - Username: BobbySoprano
 * - Password: Hiro240588
 * - Telegram ID: 1892449971
 * - Role: owner
 */

import { db, auth } from '../src/config/firebase.js';

async function createOwnerUser() {
    try {
        console.log('🔧 Creating owner user...');

        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email: 'BobbySoprano@telegram.user',
            password: 'Hiro240588',
            displayName: 'BobbySoprano'
        });

        console.log('✅ User created in Auth:', userRecord.uid);

        // 2. Create user document in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            username: 'BobbySoprano',
            email: 'BobbySoprano@telegram.user',
            role: 'owner',
            telegramId: '1892449971',
            credits: 999999999, // Unlimited credits
            plan: 'unlimited',
            planExpiresAt: new Date('2099-12-31'), // Never expires
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: new Date()
        });

        console.log('✅ User document created in Firestore');

        // 3. Create telegram_users link
        await db.collection('telegram_users').doc('1892449971').set({
            firebaseUid: userRecord.uid,
            chatId: '1892449971',
            telegramId: '1892449971',
            username: 'BobbySoprano',
            linkedAt: new Date(),
            lastActive: new Date()
        });

        console.log('✅ Telegram link created');

        // 4. Delete the failed pending registration
        const pendingRegs = await db.collection('pending_registrations')
            .where('telegramId', '==', '1892449971')
            .get();

        for (const doc of pendingRegs.docs) {
            await doc.ref.delete();
            console.log('✅ Deleted pending registration:', doc.id);
        }

        console.log('\n🎉 Owner user created successfully!');
        console.log('📧 Email: BobbySoprano@telegram.user');
        console.log('🔑 Password: Hiro240588');
        console.log('👤 UID:', userRecord.uid);
        console.log('🎭 Role: owner');
        console.log('\n✅ El owner ya puede iniciar sesión en la web!');

    } catch (error) {
        console.error('❌ Error creating owner user:', error);
    } finally {
        process.exit(0);
    }
}

// Run the script
createOwnerUser();
