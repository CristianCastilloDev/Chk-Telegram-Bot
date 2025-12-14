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

    // Format as code block for easy copying
    let codeBlock = `bin : ${bin}\n`;
    codeBlock += `iin : ${bin}\n`;
    codeBlock += `issuer : ${binInfo.bank || 'Unknown'}\n`;
    codeBlock += `brand : ${binInfo.brand || 'Unknown'}\n`;
    codeBlock += `type : ${binInfo.type || 'Unknown'}\n`;
    codeBlock += `category : ${binInfo.level || 'STANDARD'}\n`;
    codeBlock += `country : ${binInfo.country || 'Unknown'}\n`;
    codeBlock += `country_code : ${binInfo.countryCode || 'XX'}\n`;

    // Get current date in YYYY-MM-DD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    codeBlock += `update : ${dateStr}`;

    // Header with username and bin
    const header = `${user.name || user.username || 'Usuario'}\n/bin ${bin}`;

    // Send message with code block (monospace)
    const message = `${header}\n\`\`\`\n${codeBlock}\n\`\`\``;


    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error in bin command:', error);
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    await ctx.reply('❌ Error al consultar BIN. Intenta de nuevo más tarde.');
  }
};

export default binCommand;
