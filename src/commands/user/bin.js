import { lookupBin } from '../../services/binService.js';

/**
 * /bin command - BIN lookup
 * Format: /bin 123456
 */
export const binCommand = async (ctx) => {
  const user = ctx.user;

  if (!user) {
    return ctx.reply('⚠️ Tu cuenta no está vinculada. Usa /start para vincularla.');
  }

  const args = ctx.message.text.split(' ').slice(1);

  if (args.length === 0) {
    return ctx.reply(
      `🔍 *Consultar BIN*\n\n` +
      `*Formato:* \`/bin 123456\`\n` +
      `*Ejemplo:* \`/bin 411111\`\n\n` +
      `💡 Ingresa los primeros 6-8 dígitos de la tarjeta.`,
      { parse_mode: 'Markdown' }
    );
  }

  const bin = args[0].trim();

  // Validate BIN format
  if (!/^\d{6,8}$/.test(bin)) {
    return ctx.reply('❌ BIN inválido. Debe tener 6-8 dígitos.');
  }

  const processingMsg = await ctx.reply('🔍 Consultando BIN...');

  try {
    const binInfo = await lookupBin(bin, user.uid);

    if (!binInfo) {
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
      return ctx.reply('❌ No se encontró información para este BIN.');
    }

    // Get current date in YYYY-MM-DD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Format with icons and monospace for values only (using HTML for better compatibility)
    let message = '💳 BIN : <code>' + bin + '</code>\n';
    message += '🏦 BANCO : <code>' + (binInfo.bank || 'Unknown') + '</code>\n';
    message += '🔖 CARD_TYPE : <code>' + (binInfo.brand || 'Unknown') + '</code>\n';
    message += '📇 TYPE : <code>' + (binInfo.type || 'Unknown') + '</code>\n';
    message += '⭐ CATEGORY : <code>' + (binInfo.level || 'STANDARD') + '</code>\n';
    message += '🌍 COUNTRY : <code>' + (binInfo.country || 'Unknown') + '</code>\n';
    message += '🗺️ COUNTRY_CODE : <code>' + (binInfo.countryCode || 'XX') + '</code>\n';
    message += '📅 UPDATE : <code>' + dateStr + '</code>';


    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(message, { parse_mode: 'HTML' });

  } catch (error) {
    console.error('Error in bin command:', error);
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply('❌ Error al consultar BIN. Intenta de nuevo más tarde.');
  }
};

export default binCommand;
