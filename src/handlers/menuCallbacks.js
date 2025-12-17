import { getAllGates } from '../services/gateService.js';

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
            const message = `─────────────────────────
🛡️ *Gates Activos*
─────────────────────────

❌ No hay gates activos disponibles en este momento.

─────────────────────────`;

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '🔙 Regresar', callback_data: 'back_to_start' }
                    ]
                ]
            };

            return ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
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

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🔙 Regresar', callback_data: 'back_to_start' }
                ]
            ]
        };

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in gates menu:', error);
        await ctx.answerCbQuery('❌ Error al cargar los gates. Intenta nuevamente.');
    }
};

/**
 * Tools menu - Show available bot commands and tools
 */
export const handleToolsMenu = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const message = `──────────────────────
🔧 *Herramientas del Bot*
──────────────────────

📋 *Comandos Disponibles:*

🏠 *Básicos:*
• /start - Menú principal
• /help - Lista de comandos
• /profile - Ver tu perfil

💳 *Créditos y Planes:*
• /creditos - Ver créditos disponibles
• /plan - Ver tu plan actual
• /buy - Comprar créditos

🛡️ *Gates:*
• /gates - Ver gates activos
• /check [tarjeta] - Validar tarjeta
• /lives - Ver tus lives guardadas

🔧 *Herramientas:*
• /bin [número] - Info de BIN
• /gen [bin] - Generar tarjetas
• /email - Email temporal
• /sms - SMS temporal

──────────────────────

💡 *Tip:* Usa /help para ver descripciones detalladas.`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🔙 Regresar', callback_data: 'back_to_start' }
                ]
            ]
        };

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in tools menu:', error);
        await ctx.answerCbQuery('❌ Error al cargar las herramientas. Intenta nuevamente.');
    }
};

/**
 * Dev menu - Show developer contact information
 */
export const handleDevMenu = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const message = `──────────────────────
👨‍💻 *Contacto del Desarrollador*
──────────────────────

👤 *Usuario:* @CougarMx
🆔 *ID:* \`1951898071\`

📮 *Soporte:*
Si tienes algún problema o sugerencia, puedes contactar directamente al desarrollador.

──────────────────────

💡 *Tip:* Responde con respeto y proporciona detalles sobre tu consulta.`;

        // Create button to contact dev
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Contactar Dev', url: 'https://t.me/CougarMx' }
                ],
                [
                    { text: '🔙 Regresar', callback_data: 'back_to_start' }
                ]
            ]
        };

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in dev menu:', error);
        await ctx.answerCbQuery('❌ Error al cargar la información. Intenta nuevamente.');
    }
};

/**
 * Back to start - Return to main menu
 */
export const handleBackToStart = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        // Recreate the start menu message
        if (!ctx.user) {
            return ctx.answerCbQuery('❌ Error: Usuario no encontrado. Usa /start');
        }

        // Check if user is admin or dev
        const isAdminOrDev = ctx.user.role === 'admin' || ctx.user.role === 'dev';

        // Calculate valid until date (plan expiration)
        let validUntil = 'N/A';
        if (ctx.user.plan?.expiresAt) {
            const expiryDate = new Date(ctx.user.plan.expiresAt);
            validUntil = expiryDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        // Format credits display
        const creditsDisplay = isAdminOrDev ? 'Ilimitados' : (ctx.user.credits || 0);

        // Format plan/role name
        let planDisplay;
        if (isAdminOrDev) {
            planDisplay = ctx.user.role === 'dev' ? 'Dev' : 'Admin';
        } else {
            planDisplay = ctx.user.plan?.type
                ? ctx.user.plan.type.charAt(0).toUpperCase() + ctx.user.plan.type.slice(1) + ' Plan'
                : 'Free Plan';
        }

        // Create modern message with sections
        const message = `──────────────────────
🔧 *Bienvenido al CHK*
──────────────────────

📊 *Tu información:*
👤 Usuario: \`${ctx.user.name || ctx.user.email}\`
💳 Créditos: \`${creditsDisplay}\`
📅 Válido hasta: \`${validUntil}\`
⚡ Plan: \`${planDisplay}\`

──────────────────────

🔑 *Opciones disponibles:*
➡️ Gates – Pasarelas activas
➡️ Tools – Herramientas del bot
➡️ Dev – Contacto directo

──────────────────────

📮 *Soporte:* @CougarMx`;

        // Create inline keyboard
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🛡️ Gates', callback_data: 'menu_gates' },
                    { text: '🔧 Tools', callback_data: 'menu_tools' }
                ],
                [
                    { text: '👨‍💻 Dev', callback_data: 'menu_dev' }
                ]
            ]
        };

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error going back to start:', error);
        await ctx.answerCbQuery('❌ Error. Usa /start para volver al menú principal.');
    }
};

export default {
    handleGatesMenu,
    handleToolsMenu,
    handleDevMenu,
    handleBackToStart
};
