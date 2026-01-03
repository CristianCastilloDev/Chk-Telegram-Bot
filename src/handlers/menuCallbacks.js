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
            const message = `╔═══════════════════════╗
║   🛡️ *GATES ACTIVOS*   ║
╚═══════════════════════╝

❌ *No hay gates disponibles*

Actualmente no hay gates activos.
Vuelve más tarde.

━━━━━━━━━━━━━━━━━━━━━━━`;

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

        // Group gates by type (gateway)
        const gatesByType = {};
        activeGates.forEach(gate => {
            if (!gatesByType[gate.type]) {
                gatesByType[gate.type] = [];
            }
            gatesByType[gate.type].push(gate);
        });

        // Count active and inactive gates
        const activeCount = activeGates.length;
        const inactiveCount = gates.filter(g => g.status !== 'active').length;
        const totalCount = gates.length;

        let message = `📝 *Gates disponibles*

✅ Encendidos: *${activeCount}*
❌ Apagados: *${inactiveCount}*
📊 Total configurados: *${totalCount}*

_Selecciona una pasarela para más detalles._`;

        // Create buttons for each gateway type
        const buttons = [];
        const types = Object.keys(gatesByType).sort();

        for (let i = 0; i < types.length; i += 3) {
            const row = [];
            for (let j = 0; j < 3 && i + j < types.length; j++) {
                const type = types[i + j];
                row.push({
                    text: `✅ ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                    callback_data: `gateway_${type}`
                });
            }
            buttons.push(row);
        }

        buttons.push([{ text: '🔙 Volver', callback_data: 'back_to_start' }]);

        const keyboard = { inline_keyboard: buttons };

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
 * Show gates for a specific gateway type
 */
export const handleGatewayMenu = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const gatewayType = ctx.callbackQuery.data.replace('gateway_', '');

        // Get all gates for this gateway
        const gates = await getAllGates();
        const gatewayGates = gates.filter(g => g.type === gatewayType && g.status === 'active');

        if (gatewayGates.length === 0) {
            return ctx.answerCbQuery('❌ No hay gates activos para esta pasarela');
        }

        const activeCount = gatewayGates.length;
        const inactiveCount = gates.filter(g => g.type === gatewayType && g.status !== 'active').length;

        const gatewayName = gatewayType.charAt(0).toUpperCase() + gatewayType.slice(1);

        let message = `🌐 *${gatewayName}*

✅ Encendidos: *${activeCount}*
❌ Apagados: *${inactiveCount}*

_Selecciona un gate para mas información:_`;

        // Create buttons for each gate
        const buttons = [];

        for (let i = 0; i < gatewayGates.length; i += 2) {
            const row = [];
            for (let j = 0; j < 2 && i + j < gatewayGates.length; j++) {
                const gate = gatewayGates[i + j];
                row.push({
                    text: `✅ ${gate.name}`,
                    callback_data: `gate_${gate.id}`
                });
            }
            buttons.push(row);
        }

        buttons.push([{ text: '🔙 Volver', callback_data: 'menu_gates' }]);

        const keyboard = { inline_keyboard: buttons };

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in gateway menu:', error);
        await ctx.answerCbQuery('❌ Error al cargar los gates');
    }
};

/**
 * Show detailed information for a specific gate
 */
export const handleGateDetails = async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const gateId = ctx.callbackQuery.data.replace('gate_', '');

        // Get gate details
        const gates = await getAllGates();
        const gate = gates.find(g => g.id === gateId);

        if (!gate) {
            return ctx.answerCbQuery('❌ Gate no encontrado');
        }

        const gatewayName = gate.type.charAt(0).toUpperCase() + gate.type.slice(1);
        const statusEmoji = gate.status === 'active' ? '✅' : '❌';
        const statusText = gate.status === 'active' ? 'Encendido' : 'Apagado';

        let message = `🎯 *${gate.name}* (${gatewayName})

Estado: ${statusEmoji} *${statusText}*
Descripción:
💰 ${gate.description || 'Sin descripción'}

📋 *Ejemplo de uso:*
\`/vai 4111111111111111|12|2026|000\`

_${gatewayName} charged ${gate.description || 'amount'}_`;

        const buttons = [
            [
                { text: '🔙 Atrás', callback_data: `gateway_${gate.type}` },
                { text: '🛡️ GATES', callback_data: 'menu_gates' }
            ]
        ];

        const keyboard = { inline_keyboard: buttons };

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Error in gate details:', error);
        await ctx.answerCbQuery('❌ Error al cargar detalles del gate');
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
Si tienes algún problema o sugerencia, contactame.

──────────────────────

💡 *Tip:* Proporciona detalles sobre tu consulta.`;

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
    handleGatewayMenu,
    handleGateDetails,
    handleToolsMenu,
    handleDevMenu,
    handleBackToStart
};
