import { db } from '../../config/firebase.js';
import { MESSAGES } from '../../config/constants.js';

/**
 * /start command - Modern welcome with user info and inline buttons
 */
export const startCommand = async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || 'unknown';

  try {
    // Check if already linked
    if (ctx.user) {
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

      return ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }

    // Send welcome message with linking instructions for new users
    const welcomeMessage = MESSAGES.WELCOME.replace('{telegramId}', telegramId);

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply(MESSAGES.ERROR);
  }
};

export default startCommand;
