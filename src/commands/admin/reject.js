import { rejectOrder } from '../../services/orderService.js';

/**
 * /reject command - Reject order (dev only)
 * Format: /reject <order_id> [reason]
 */
export const rejectCommand = async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    return ctx.reply(
      `❌ *Rechazar Orden*\n\n` +
      `*Formato:* \`/reject <order_id> [razón]\`\n` +
      `*Ejemplo:* \`/reject abc123def456 Precio incorrecto\`\n\n` +
      `Usa \`/orders pending\` para ver órdenes pendientes.`,
      { parse_mode: 'Markdown' }
    );
  }
  
  const orderId = args[0];
  const reason = args.slice(1).join(' ') || 'Sin razón especificada';
  
  try {
    const processingMsg = await ctx.reply('⏳ Procesando rechazo...');
    
    const result = await rejectOrder(orderId, ctx.user.name || ctx.user.email, reason);
    
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    
    const emoji = result.order.type === 'credits' ? '💳' : '📅';
    
    await ctx.reply(
      `❌ *Orden Rechazada*\n\n` +
      `📦 ID: \`${orderId}\`\n` +
      `${emoji} Tipo: ${result.order.type === 'credits' ? 'Créditos' : 'Plan'}\n` +
      `👤 Usuario: ${result.order.targetUser}\n` +
      `📊 Cantidad: ${result.order.amount} ${result.order.type === 'credits' ? 'créditos' : 'días'}\n` +
      `💵 Precio: $${result.order.price}\n` +
      `📝 Razón: ${reason}\n\n` +
      `⚠️ No se aplicaron cambios al usuario.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Error in reject command:', error);
    await ctx.reply(`❌ Error al rechazar orden: ${error.message}`);
  }
};

export default rejectCommand;
