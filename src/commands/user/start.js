import { db } from '../../config/firebase.js';
import { MESSAGES } from '../../config/constants.js';

/**
 * /start command - Registration and welcome
 */
export const startCommand = async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username || 'unknown';
  
  try {
    // Check if already linked
    if (ctx.user) {
      // Get role emoji
      const roleEmojis = {
        'dev': '⚙️ Developer',
        'admin': '👑 Admin',
        'client': '👤 Cliente'
      };
      const roleDisplay = roleEmojis[ctx.user.role] || '👤 Cliente';
      
      return ctx.reply(
        `✅ *¡Ya estás conectado!*\n\n` +
        `👤 Usuario: ${ctx.user.name || ctx.user.email}\n` +
        `${roleDisplay.split(' ')[0]} Rol: ${roleDisplay.split(' ')[1]}\n` +
        `💰 Créditos: ${ctx.user.credits || 0}\n` +
        `📋 Plan: ${ctx.user.plan?.type || 'free'}\n\n` +
        `Usa /help para ver todos los comandos disponibles.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Send welcome message with linking instructions
    const welcomeMessage = MESSAGES.WELCOME.replace('{telegramId}', telegramId);
    
    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in start command:', error);
    await ctx.reply(MESSAGES.ERROR);
  }
};

export default startCommand;
