import { PLANS } from '../../config/constants.js';

/**
 * /buy command - Show available plans for purchase
 */
export const buyCommand = async (ctx) => {
    const user = ctx.user;

    if (!user) {
        return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
    }

    // Create message with all available plans
    const message = `──────────────────────
💰 *Planes Disponibles*
──────────────────────

📅 *Planes por Días:*
• 1 Día - $30 MXN
• Semanal - $150 MXN
• Quincenal - $250 MXN
• Mensual - $400 MXN

💳 *Planes por Créditos:*
• 100 Créditos - $50 MXN
• 200 Créditos - $90 MXN
• 500 Créditos - $200 MXN
• 1000 Créditos - $350 MXN

──────────────────────

Selecciona el plan que deseas comprar:`;

    // Create inline keyboard with all plans
    const keyboard = {
        inline_keyboard: [
            // Day plans row 1
            [
                { text: '1 Día ($30)', callback_data: 'buy_one_day' },
                { text: 'Semanal ($150)', callback_data: 'buy_weekly' }
            ],
            // Day plans row 2
            [
                { text: 'Quincenal ($250)', callback_data: 'buy_biweekly' },
                { text: 'Mensual ($400)', callback_data: 'buy_monthly' }
            ],
            // Credit plans row 1
            [
                { text: '100 Cr ($50)', callback_data: 'buy_pack_100' },
                { text: '200 Cr ($90)', callback_data: 'buy_pack_200' }
            ],
            // Credit plans row 2
            [
                { text: '500 Cr ($200)', callback_data: 'buy_pack_500' },
                { text: '1000 Cr ($350)', callback_data: 'buy_pack_1000' }
            ]
        ]
    };

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
};

export default buyCommand;
