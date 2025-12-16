import { getAllGates } from '../services/db.js';

/**
 * Menu callback handlers for inline keyboard buttons
 */

/**
 * Gates menu - Show active gates from Firebase
 */
export const handleGatesMenu = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        // Get all active gates from Firebase
        const gates = await getAllGates();
        const activeGates = gates.filter(gate => gate.status === 'active');

        if (activeGates.length === 0) {
            return ctx.reply('❌ No hay gates activos disponibles en este momento.');
        }

        // Group gates by category
        const chargeGates = activeGates.filter(g => g.category === 'CHARGE');
        const authGates = activeGates.filter(g => g.category === 'AUTH');

        let message = `─────────────────────────
🛡️ *Gates Activos*
─────────────────────────\n\n`;

        // CHARGE Gates
        if (chargeGates.length > 0) {
            message += `💳 *CHARGE Gates (${chargeGates.length}):*\n`;
            chargeGates.forEach((gate, index) => {
                message += `${index + 1}. \`${gate.name}\` - ${gate.type}\n`;
                if (gate.description) {
                    message += `   ℹ️ ${gate.description}\n`;
                }
            });
            message += '\n';
        }

        // AUTH Gates
        if (authGates.length > 0) {
            message += `🔐 *AUTH Gates (${authGates.length}):*\n`;
            authGates.forEach((gate, index) => {
                message += `${index + 1}. \`${gate.name}\` - ${gate.type}\n`;
                if (gate.description) {
                    message += `   ℹ️ ${gate.description}\n`;
                }
            });
            message += '\n';
        }

        message += `─────────────────────────\n\n`;
        message += `💡 *Tip:* Usa estos gates en la web para validar tarjetas.`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error in gates menu:', error);
        await ctx.reply('❌ Error al cargar los gates. Intenta nuevamente.');
    }
};

/**
 * Tools menu - Show available bot commands and tools
 */
export const handleToolsMenu = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const message = `─────────────────────────
🔧 *Herramientas del Bot*
─────────────────────────

📋 *Comandos Disponibles:*

🏠 *Básicos:*
• \`/start\` - Menú principal
• \`/help\` - Lista de comandos
• \`/profile\` - Ver tu perfil

💳 *Créditos y Planes:*
• \`/credits\` - Ver créditos disponibles
• \`/plan\` - Ver tu plan actual
• \`/buy\` - Comprar créditos

🛡️ *Gates:*
• \`/gates\` - Ver gates activos
• \`/check [tarjeta]\` - Validar tarjeta
• \`/lives\` - Ver tus lives guardadas

🔧 *Herramientas:*
• \`/bin [número]\` - Info de BIN
• \`/gen [bin]\` - Generar tarjetas
• \`/email\` - Email temporal
• \`/sms\` - SMS temporal

─────────────────────────

💡 *Tip:* Usa /help para ver descripciones detalladas.`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Error in tools menu:', error);
        await ctx.reply('❌ Error al cargar las herramientas. Intenta nuevamente.');
    }
};

/**
 * Dev menu - Show developer contact information
 */
export const handleDevMenu = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const message = `─────────────────────────
👨‍💻 *Contacto del Desarrollador*
─────────────────────────

👤 *Usuario:* @CougarMx
🆔 *ID:* \`1951898071\`

📮 *Soporte:*
Si tienes algún problema o sugerencia, puedes contactar directamente al desarrollador.

─────────────────────────

💡 *Tip:* Responde con respeto y proporciona detalles sobre tu consulta.`;

        // Create button to contact dev
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Contactar Dev', url: 'https://t.me/CougarMx' }
                ],
                [
                    { text: '🔙 Volver al Menú', callback_data: 'back_to_start' }
                ]
            ]
        };

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in dev menu:', error);
        await ctx.reply('❌ Error al cargar la información. Intenta nuevamente.');
    }
};

/**
 * Back to start - Return to main menu
 */
export const handleBackToStart = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        // Delete the current message
        await ctx.deleteMessage();

        // Re-trigger the start command
        const { startCommand } = await import('../commands/user/start.js');
        await startCommand(ctx);

    } catch (error) {
        console.error('Error going back to start:', error);
        await ctx.reply('❌ Error. Usa /start para volver al menú principal.');
    }
};

export default {
    handleGatesMenu,
    handleToolsMenu,
    handleDevMenu,
    handleBackToStart
};
