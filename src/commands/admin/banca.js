import { db } from '../../config/firebase.js';
import crypto from 'crypto';

// Encryption key (should be in environment variable in production)
const ENCRYPTION_KEY = process.env.BANK_ENCRYPTION_KEY || 'default-key-change-in-production-32';
const ALGORITHM = 'aes-256-cbc';

/**
 * /banca command - Configure bank account (owner only)
 */
export const bancaCommand = async (ctx) => {
    const user = ctx.user;

    if (!user) {
        return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
    }

    // TODO: Check if user is owner (need owner's Telegram ID)
    // For now, only allow devs and admins
    if (user.role !== 'admin' && user.role !== 'dev') {
        return ctx.reply('❌ Este comando solo está disponible para el dueño del sistema.');
    }

    try {
        // Get current bank details
        const configDoc = await db.collection('config').doc('bank_account').get();

        if (configDoc.exists) {
            const bankData = configDoc.data();
            const decrypted = decrypt(bankData.encrypted);

            const message = `🏦 *Configuración de Cuenta Bancaria*\n\n` +
                `📋 *Datos Actuales:*\n` +
                `• Banco: ${decrypted.bank}\n` +
                `• Cuenta: ${decrypted.account}\n` +
                `• CLABE: ${decrypted.clabe}\n` +
                `• Titular: ${decrypted.holder}\n\n` +
                `Para actualizar los datos, usa:\n` +
                `/setbanca [banco] [cuenta] [clabe] [titular]\n\n` +
                `Ejemplo:\n` +
                `/setbanca BBVA 1234567890123456 012345678901234567 Juan Pérez`;

            await ctx.reply(message, { parse_mode: 'Markdown' });
        } else {
            const message = `🏦 *Configuración de Cuenta Bancaria*\n\n` +
                `No hay cuenta bancaria configurada.\n\n` +
                `Para configurar, usa:\n` +
                `/setbanca [banco] [cuenta] [clabe] [titular]\n\n` +
                `Ejemplo:\n` +
                `/setbanca BBVA 1234567890123456 012345678901234567 Juan Pérez`;

            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('Error fetching bank config:', error);
        await ctx.reply('❌ Error al obtener la configuración bancaria.');
    }
};

/**
 * /setbanca command - Set bank account details
 */
export const setBancaCommand = async (ctx) => {
    const user = ctx.user;

    if (!user) {
        return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
    }

    // TODO: Check if user is owner
    if (user.role !== 'admin' && user.role !== 'dev') {
        return ctx.reply('❌ Este comando solo está disponible para el dueño del sistema.');
    }

    try {
        // Parse command arguments
        const args = ctx.message.text.split(' ').slice(1);

        if (args.length < 4) {
            return ctx.reply(
                '❌ Formato incorrecto.\n\n' +
                'Uso: `/setbanca [banco] [cuenta] [clabe] [titular]`\n\n' +
                'Ejemplo:\n' +
                '`/setbanca BBVA 1234567890123456 012345678901234567 Juan Pérez`',
                { parse_mode: 'Markdown' }
            );
        }

        const bank = args[0];
        const account = args[1];
        const clabe = args[2];
        const holder = args.slice(3).join(' ');

        // Validate
        if (account.length < 10 || account.length > 20) {
            return ctx.reply('❌ El número de cuenta debe tener entre 10 y 20 dígitos.');
        }

        if (clabe.length !== 18) {
            return ctx.reply('❌ La CLABE debe tener exactamente 18 dígitos.');
        }

        // Encrypt bank details
        const bankData = { bank, account, clabe, holder };
        const encrypted = encrypt(bankData);

        // Save to Firestore
        await db.collection('config').doc('bank_account').set({
            encrypted: encrypted,
            updatedBy: ctx.from.id.toString(),
            updatedAt: new Date()
        });

        await ctx.reply(
            '✅ *Cuenta Bancaria Configurada*\n\n' +
            `🏦 Banco: ${bank}\n` +
            `💳 Cuenta: ${account}\n` +
            `🔢 CLABE: ${clabe}\n` +
            `👤 Titular: ${holder}\n\n` +
            'Esta información se mostrará a los clientes para realizar pagos.',
            { parse_mode: 'Markdown' }
        );

        console.log(`✅ Bank account configured by ${ctx.from.username || ctx.from.id}`);

    } catch (error) {
        console.error('Error setting bank config:', error);
        await ctx.reply('❌ Error al configurar la cuenta bancaria.');
    }
};

/**
 * Get bank details (for use in other modules)
 */
export async function getBankDetails() {
    try {
        const configDoc = await db.collection('config').doc('bank_account').get();

        if (configDoc.exists) {
            const bankData = configDoc.data();
            return decrypt(bankData.encrypted);
        }

        // Return default if not configured
        return {
            bank: 'BBVA',
            account: '1234 5678 9012 3456',
            clabe: '012345678901234567',
            holder: 'Dueño CHK'
        };
    } catch (error) {
        console.error('Error getting bank details:', error);
        return null;
    }
}

/**
 * Encrypt bank details
 */
function encrypt(data) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt bank details
 */
function decrypt(encrypted) {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
}

export default {
    bancaCommand,
    setBancaCommand,
    getBankDetails
};
