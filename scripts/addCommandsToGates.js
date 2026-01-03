import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to add 'command' field to existing gates in Firebase
 * 
 * This script will:
 * 1. Fetch all gates from Firestore
 * 2. Generate a command based on gate name/type
 * 3. Update each gate with the new command field
 */

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
    });
}

const db = admin.firestore();

/**
 * Generate a command from gate name
 * Examples:
 * - "Stripe Charge 1" -> "stripe1"
 * - "K-LOVE 100MXN" -> "klove100"
 * - "PayPal Auth" -> "paypalauth"
 */
function generateCommand(gate) {
    let command = '';

    // Try to extract from name
    const name = gate.name.toLowerCase();

    // Remove common words
    const cleanName = name
        .replace(/charge/g, '')
        .replace(/auth/g, '')
        .replace(/gate/g, '')
        .replace(/\s+/g, '');

    // Extract numbers
    const numbers = name.match(/\d+/g);
    const number = numbers ? numbers[0] : '';

    // Use type as base
    const type = gate.type.toLowerCase();

    // Combine type + number or type + cleanName
    if (number) {
        command = `${type}${number}`;
    } else {
        // Take first few chars of clean name
        const suffix = cleanName.replace(/[^a-z0-9]/g, '').slice(0, 5);
        command = `${type}${suffix}`;
    }

    // Ensure it's alphanumeric only
    command = command.replace(/[^a-z0-9]/g, '');

    return command;
}

async function addCommandsToGates() {
    try {
        console.log('🔄 Fetching gates from Firestore...\n');

        const gatesRef = db.collection('gates');
        const snapshot = await gatesRef.get();

        if (snapshot.empty) {
            console.log('❌ No gates found in Firestore');
            process.exit(0);
        }

        console.log(`📊 Found ${snapshot.size} gates\n`);

        const updates = [];
        const commands = new Set();

        // First pass: generate commands and check for duplicates
        snapshot.forEach(doc => {
            const gate = doc.data();

            // Skip if already has a command
            if (gate.command) {
                console.log(`⏭️  ${gate.name} - Already has command: /${gate.command}`);
                return;
            }

            let command = generateCommand(gate);

            // Handle duplicates by adding suffix
            let suffix = 1;
            const originalCommand = command;
            while (commands.has(command)) {
                command = `${originalCommand}${suffix}`;
                suffix++;
            }

            commands.add(command);

            updates.push({
                id: doc.id,
                name: gate.name,
                type: gate.type,
                command: command
            });
        });

        if (updates.length === 0) {
            console.log('\n✅ All gates already have commands!');
            process.exit(0);
        }

        console.log('\n📋 Proposed updates:\n');
        updates.forEach(update => {
            console.log(`   ${update.name}`);
            console.log(`   Type: ${update.type}`);
            console.log(`   Command: /${update.command}`);
            console.log('   ---');
        });

        console.log(`\n⚠️  About to update ${updates.length} gates`);
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🚀 Starting updates...\n');

        // Second pass: update gates
        for (const update of updates) {
            try {
                await gatesRef.doc(update.id).update({
                    command: update.command
                });
                console.log(`✅ Updated: ${update.name} -> /${update.command}`);
            } catch (error) {
                console.error(`❌ Error updating ${update.name}:`, error.message);
            }
        }

        console.log(`\n✅ Successfully updated ${updates.length} gates!`);
        console.log('\n📝 Summary of commands:\n');

        updates.forEach(update => {
            console.log(`   /${update.command} - ${update.name}`);
        });

        console.log('\n🔄 Restart your Telegram bot to load the new commands.');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

// Run the script
addCommandsToGates();
