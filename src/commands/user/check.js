import { db } from '../../config/firebase.js';
import { verifyCard } from '../../services/gateService.js';
import { deductCredits } from '../../services/userService.js';
import { BOT_CONFIG, MESSAGES } from '../../config/constants.js';

/**
 * /check command - Verify credit card
 * Format: /check cc|mm|yy|cvv
 * Example: /check 4111111111111111|12|25|123
 */
export const checkCommand = async (ctx) => {
  const user = ctx.user;
  
  if (!user) {
    return ctx.reply(MESSAGES.NOT_LINKED);
  }
  
  // Get card data from message
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!args) {
    return ctx.reply(
      `💳 *Verificar Tarjeta*\n\n` +
      `*Formato:* \`/check cc|mm|yy|cvv\`\n` +
      `*Ejemplo:* \`/check 4111111111111111|12|25|123\`\n\n` +
      `💰 Costo: ${BOT_CONFIG.COSTS.CHECK} crédito`,
      { parse_mode: 'Markdown' }
    );
  }
  
  // Parse card data
  const cardParts = args.split('|');
  if (cardParts.length !== 4) {
    return ctx.reply(
      `❌ *Formato inválido*\n\n` +
      `Usa: \`/check cc|mm|yy|cvv\`\n` +
      `Ejemplo: \`/check 4111111111111111|12|25|123\``,
      { parse_mode: 'Markdown' }
    );
  }
  
  const [cc, mm, yy, cvv] = cardParts.map(p => p.trim());
  
  // Validate card format
  if (!/^\d{13,19}$/.test(cc)) {
    return ctx.reply('❌ Número de tarjeta inválido (debe tener 13-19 dígitos)');
  }
  if (!/^\d{2}$/.test(mm) || parseInt(mm) < 1 || parseInt(mm) > 12) {
    return ctx.reply('❌ Mes inválido (debe ser 01-12)');
  }
  if (!/^\d{2,4}$/.test(yy)) {
    return ctx.reply('❌ Año inválido');
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    return ctx.reply('❌ CVV inválido (debe tener 3-4 dígitos)');
  }
  
  // Check credits
  if (user.credits < BOT_CONFIG.COSTS.CHECK) {
    return ctx.reply(MESSAGES.INSUFFICIENT_CREDITS);
  }
  
  // Send processing message
  const processingMsg = await ctx.reply('⏳ Verificando tarjeta...');
  
  try {
    // Verify card through gate
    const result = await verifyCard({
      cc,
      mm,
      yy,
      cvv,
      userId: user.uid,
      userName: user.name || user.email,
    });
    
    // Deduct credits
    await deductCredits(user.uid, BOT_CONFIG.COSTS.CHECK, 'Card verification via Telegram');
    
    // Format response
    let response = '';
    
    if (result.status === 'approved' || result.status === 'live') {
      response += `✅ *APPROVED - LIVE*\n\n`;
      response += `💳 Card: \`${cc.slice(0, 6)}******${cc.slice(-4)}\`\n`;
      response += `📅 Exp: ${mm}/${yy}\n`;
      response += `🏦 Bank: ${result.bank || 'Unknown'}\n`;
      response += `🌍 Country: ${result.country || 'Unknown'}\n`;
      response += `💎 Type: ${result.type || 'Unknown'}\n`;
      response += `🚪 Gate: ${result.gateName}\n`;
      response += `📝 Response: ${result.message}\n`;
    } else if (result.status === 'declined') {
      response += `❌ *DECLINED*\n\n`;
      response += `💳 Card: \`${cc.slice(0, 6)}******${cc.slice(-4)}\`\n`;
      response += `🚪 Gate: ${result.gateName}\n`;
      response += `📝 Response: ${result.message}\n`;
    } else {
      response += `⚠️ *ERROR*\n\n`;
      response += `💳 Card: \`${cc.slice(0, 6)}******${cc.slice(-4)}\`\n`;
      response += `🚪 Gate: ${result.gateName}\n`;
      response += `📝 Response: ${result.message}\n`;
    }
    
    response += `\n💰 Créditos restantes: ${user.credits - BOT_CONFIG.COSTS.CHECK}`;
    
    // Delete processing message and send result
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error in check command:', error);
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(
      `❌ Error al verificar tarjeta: ${error.message}\n\n` +
      `No se han deducido créditos.`
    );
  }
};

export default checkCommand;
